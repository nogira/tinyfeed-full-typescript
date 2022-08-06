import { FeedItemEntry, sha512Hash } from "../database"
import { QueryTweet, queryToTweets } from "./twitter/queryToTweets";
import { Tweet, TweetMedia } from "./twitter/types";

// TODO: fetch entire thread if tweet is a thread

export async function getTwitterSearchFeed(query: string): Promise<FeedItemEntry[]> {

  const tweets: QueryTweet[] = await queryToTweets(query);

  const feedEntries: FeedItemEntry[] = []
  for (let tweet of tweets) {

    /**
     * remove shortened image urls and convert other urls from shortened to 
     * full
     */
    function prettifyURLsInText(text: string, tweet: Tweet) {
      const urls = tweet.urls
      if (urls) {
          for (const url of urls) {
              const shortURL = url.shortenedURL;
              const fullURL = url.fullURL;
              text = text.replace(shortURL, `<a href="${fullURL}">${fullURL}</a>`);
          }
      }
      const media = tweet.media;
      if (media) {
          for (const image of media) {
              const url = image.shortenedImgURL;
              text = text.replace(url, "");
          }
      }
      return text;
    }
    let content = tweet.text.replace(/\n/g, "<br>");
    content = prettifyURLsInText(content, tweet);
    const noTextContent = content.trim() === "";
    
    /**
     * convert image urls to html image tags, and include whether tweet has 
     * images and/or has video
     * @param media
     */
    function parseMedia(media: TweetMedia[] | undefined): [String, Boolean, Boolean] {
        let mediaTags = "";
        let hasImages = false, hasVideo = false;
        if (media) {
            for (const item of media) {
              mediaTags += "<br><br>";
              if (item.type === "photo") {
                  hasImages = true;
                  mediaTags += `<img width=\"100%\" src=\"${item.fullImgURL}\">`;
              } else {
                  hasVideo = true;
                  mediaTags += `<video controls
                    style="width: 100%; max-height: calc(100vh - 64px); background-color: black;"
                    poster="${item.fullImgURL}" src="${item.videoURL}"></video>`
              }
            }
            return [ mediaTags, hasImages, hasVideo ];
        }
        return ["", false, false];
    }
    let [ mediaTags, hasImages, hasVideo] = parseMedia(tweet.media);
    // remove starting `<br><br>` if no content before image(s)
    if (noTextContent) {
      mediaTags = mediaTags.substring(8);
    }
    content += mediaTags;
    
    if (tweet.quote) {
        const quote = tweet.quote;
        const user = quote.user;
        let text = quote.text;
        text = prettifyURLsInText(text, quote);
        const [ mediaTags ] = parseMedia(quote.media);
        if (! noTextContent) {
          content += "<br><br>"
        }
        content += `<blockquote>🐦 <b>@${user}</b><br><br>
            ${text + mediaTags}</blockquote>`;
    }

    // let title = "🐦";
    if (tweet.isThread) {
        // title += "🧵";
        console.log("IS THREAD");
        // TODO: use the thread id to filter
        // item._threadId = tweet.threadID;
    }
    // if (hasImages) {
    //     title += "📷";
    // }
    // if (hasVideo) {
    //     title += "📹";
    // }
    // title += " @" + tweet.user;
    const title = "@" + tweet.user;

    const feedEntry: FeedItemEntry = {
      id: "",
      url: `https://www.twitter.com/${tweet.user}/status/${tweet.id}` || "",
      title: title || "",
      content: content || "",
      author: tweet.user || "",
      // example twitter format: "Mon Mar 14 06:07:25 +0000 2022"
      datePublished: tweet.date ? new Date(tweet.date) : new Date(),
      read: false,
    }

    /* add id now that i have all the values */
    feedEntry.id = await sha512Hash(`${feedEntry.url}${feedEntry.datePublished}`);

    feedEntries.push(feedEntry)
  }
  return feedEntries
}