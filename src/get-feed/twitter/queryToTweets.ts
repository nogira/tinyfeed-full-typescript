import { Tweet, TweetMedia, TweetURLs } from "./types";
import { queryToUnparsedTweets } from "./queryToUnparsedTweets";

export interface QueryTweet extends Tweet {
  date: string;
  quotedTweetID?: string;
  retweetTweetId?: string;
  retweetedBy?: string[];
}

export async function queryToTweets(query: string): Promise<QueryTweet[]> {

  const [tweets, users]  = await queryToUnparsedTweets(query);
  let parsedTweets: QueryTweet[] = [];

  // data is separated into users and tweets, so to attach username to tweet, 
  // need to get user info first

  // -- users --
  const userIdToName: any = {};
  for (const key in users) {
    const item = users[key];
    //               id               name
    userIdToName[item.id_str] = item.screen_name;
  }

  // -- tweets --
  for (const key in tweets) {
    const item = tweets[key];
    const tweet: QueryTweet = {
      // using id_str because that's the one that matches the url id
      id: item.id_str, // tweet id
      user: userIdToName[item.user_id_str], // username
      text: item.full_text,
      date: item.created_at,
    }

    // const media = item?.entities?.media;
    const media = item?.extended_entities?.media;

    if (media) {
      tweet.media = [];
      for (const elem of media) {
        const item: TweetMedia = {
          shortenedImgURL: elem.url,
          fullImgURL: elem.media_url_https,
          type: elem.type, // photo or video
        }
        if (item.type === "video") {
          // sort array by bitrate so that the highest bitrate variant is first in 
          // the array. the .m3u8` variant doesn't have a bitrate property, so must 
          // use `?? -1` to push it to the end of the array
          const highestBitrateMP4URL = elem.video_info?.variants?.sort((a: any,b: any) => {
            return (b.bitrate ?? -1) - (a.bitrate ?? -1);
          })?.[0]?.url;
          item.videoURL = highestBitrateMP4URL;
        }
        tweet.media.push(item);
      }
    }
    const urls = item?.entities?.urls;
    if (urls?.length > 0) {
      tweet.urls = [];
      for (const url of urls) {
        const item: TweetURLs = {
          shortenedURL: url.url,
          fullURL: url.expanded_url,
        }
        tweet.urls.push(item);
      }
    }
    const hasQuote = item?.quoted_status_id_str;
    if (hasQuote) {
      tweet.quotedTweetID = hasQuote;
    }

    const hasThread = item.self_thread;
    if (hasThread) {
      tweet.isThread = true;
      tweet.threadID = hasThread.id_str;
    } else {
      tweet.isThread = false;
    }

    const retweetTweetId = item.retweeted_status_id_str
    if (retweetTweetId) {
      tweet.retweetTweetId = retweetTweetId;
    }
    
    parsedTweets.push(tweet);
  }

  /*
  retweets have an item for the tweet and an item for the retweet, though it 
  seems the main difference is that the retweet tweet.text starts with
  "RT @user: ", where user is the user of the tweet, not the retweeter. thus, 
  the retweet is essentially a duplicate, sowe can delete the retweet items

  though, it might be nice to know it is a retweet, so add a retweetedBy 
  property to the tweet
  the retweet has the property retweeted_status_id_str, which is the id of the
  retweeted tweet, and user_id_str, which is the id of the user that retweeted
  */
  const tweetsMinusRetweetDupes: QueryTweet[] = [];
  const trackRetweets: any = [];
  for (const tweet of parsedTweets) {
    const isRetweetItem = tweet.retweetTweetId;
    if (isRetweetItem) {
      // track the id and user of the retweet, so we can assign this info 
      // to the original tweet
      const id: string = isRetweetItem;
      const user: string = tweet.user;
      trackRetweets.push([id, user]);
      // don't add to new list of tweets
    } else {
      // if not a retweet, add to new list of tweets
      tweetsMinusRetweetDupes.push(tweet);
    }
    
  }
  parsedTweets = tweetsMinusRetweetDupes;
  // add user retweet info to original tweet
  for (const tweet of parsedTweets) {
    const matches = trackRetweets.filter((x: string[]) => x[0] === tweet.id);
    if (matches) {
      tweet.retweetedBy = matches.map((x: string[]) => x[1]);
    }
  }

  /*
  quote tweet items do not contain their quoted tweet, instead the quoted 
  tweet is its own item. thus, we must manually assign quoted tweets to their 
  quote tweet. 

  quoted tweets can be deleted, UNLESS that quoted tweet is from the same user
  as the feed, as in the quoted tweet item is both a quoted tweet and an 
  original tweet


  loop through until find tweet with quote. add the quote tweet to it, then
  add to parsedTweets.
  bad idea to remove from array mid-loop, so tracking quoted tweets for second
  for-loop that removes quoted tweets (again, only if quoted tweet not from 
  same user as the feed)
  */

  // attach quoted tweet to quote tweet, and track which tweets are quoted by 
  // tweet id
  const quotedIds: string[] = [];
  let tempTweets: QueryTweet[] = [];
  for (const tweet of parsedTweets) {
    const quotedTweetID = tweet.quotedTweetID;
    if (quotedTweetID) {
      const quotedTweet = parsedTweets.find(t => t.id === quotedTweetID);
      if (quotedTweet) {
        // add quote tweet to tweet that quotes it
        tweet.quote = quotedTweet;

        // track added tweets, UNLESS TWEET THAT IS QUOTED IS BY SAME 
        // USER OF FEED (e.g. from:elonmusk)
        // (see comment above initiation of trackTweetIDsOfAdded)

        // get array of users of the feed
        // allowed chars in twitter name are same as \w https://web.archive.org/web/20210506165356/https://www.techwalla.com/articles/what-characters-are-allowed-in-a-twitter-name
        // FIXME: lookback not supported in safari yet
        // const queryUsers = query.match(/(?<=from:)([\w]+)/g);
        const queryUsers = query.match(/from:([\w]+)/g)?.map(x => x.substring(5))
        // add quoted tweet id to array of quoted tweet ids if different 
        // user to feed user
        const isDiffUser = ! queryUsers?.includes(quotedTweet.user)
        if (isDiffUser) {
          quotedIds.push(quotedTweet.id);
        }
      }
    }
    tempTweets.push(tweet);
  }
  parsedTweets = tempTweets;

  // remove tweets that are quoted by other tweets
  tempTweets = [];
  for (const tweet of parsedTweets) {
    // if tweet id is in quotedIds, it is a quoted tweet to be removed
    if (quotedIds.includes(tweet.id)) {
      // don't add nothing
    } else {
      tempTweets.push(tweet);
    }
  }
  parsedTweets = tempTweets;

  return parsedTweets;
}