// import { JSONFeed, JSONFeedItem } from './feedTypes.ts';
import { FeedItemEntry } from '../database';

/**
 * possible filters:
 * `title_excl`, `title_incl`,
 * `content_excl`, `content_incl`,
 * `author_excl`, `author_incl`,
 * @param entries 
 * @param filters 
 * @returns 
 */
export function filter(entries: FeedItemEntry[], filters: any
  ): FeedItemEntry[] {

  /*
  NOTE: REMEMBER FILTERS WITH NUMBER VALS ARE STRINGS, SO CONVERT TO NUMBER
  */

  function getAttr(entry: FeedItemEntry, attribute: string) {
    switch (attribute) {
      case "title":
        return entry.title;
      case "content":
        return entry.content;
      case "author":
        return entry.author;
      default:
        console.log("invalid filter target attribute");
        return undefined;
    }
  }

  const filteredEntries: FeedItemEntry[] = [];
  loop1:
  for (const entry of entries) {
    loop2:
    for (const key in filters) {
      const val: string = filters[key];
      if (key.endsWith("excl")) {
        const regex = new RegExp(val, "i");
        const string = getAttr(entry, key.split("_")[0]);
        // if string returns undefined it means the filter doesn't exist, so 
        // just continue to next filter
        if (string === undefined) continue loop2;
        // item should EXCLUDE everything in the filter
        const itemContainsSomethinginFilter = regex.test(string);
        if (itemContainsSomethinginFilter) {
          // skip adding item to filteredItems
          continue loop1;
        }
      } else if (key.endsWith("incl")) {
        const regex = new RegExp(val, "i");
        const string = getAttr(entry, key.split("_")[0]);
        // if string returns undefined it means the filter doesn't exist, so 
        // just continue to next filter
        if (string === undefined) continue loop2;
        // item should INCLUDE something in the filter
        const itemContainsSomethinginFilter = regex.test(string);
        if (! itemContainsSomethinginFilter) {
          // skip adding item to filteredItems
          continue loop1;
        }
      } else if (key == "min_views") {
        // item should have at least the min views
        const itemViews: number | undefined = entry?._views;
        if (itemViews && itemViews < Number(val)) {
          // skip adding item to filteredItems
          continue loop1;
        }
      // } else if (key == "no_self_retweets" && val == "true") {
      //   /* remove retweets of mid-thread tweets from threads that have 
      //   been posted/retweeted before */
      //   const threadID = item._threadId;
      //   const notFirstTweetinThread = threadID !== item.id;
      //   if (threadID && notFirstTweetinThread) {
      //     // if main tweet (threadID) is already in feed, discard the 
      //     // tweet as its a retweet of a mid-thread tweet i've already
      //     // read
      //     const ids = items.map(item => item.id);
      //     if (ids.includes(threadID)) {
      //       continue loop1;
      //     }
      //   }
      } else {
        console.log("Unknown filter key: " + key);
      }
    }
    // // skip video items with 0 views, as it means the video hasn't been 
    // // posted yet
    // if (item._views === 0) { continue loop1};

    // if item has passsed all filters, add it to the filteredItems
    filteredEntries.push(entry);
  }
  return filteredEntries
}