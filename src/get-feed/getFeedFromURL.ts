import { Command } from '@tauri-apps/api/shell'
import { XMLParser } from "fast-xml-parser";

import { FeedItemEntry, sha512Hash } from '../database'

function isArray(input: any): boolean {
  return input.splice ? true : false;
}

import { invoke } from '@tauri-apps/api'

export async function feedURLToHTML(url: string): Promise<string> {
  // const fetch = new Command('curl-fetch', [url]);
  // const feedStr = await fetch.execute().then(x => x.stdout);

  let feedStr: string = await invoke('fetch_async', { url: url })
    // return "" if error
    .catch(_ => "") as string;

  return feedStr;
}

export async function getFeedFromHTML(feedStr: string): Promise<FeedItemEntry[]> {

  const feedEntries: FeedItemEntry[] = [];

  /* MARK: - JSON FEED */

  if (feedStr.startsWith("{")) {
    // console.log("this is json feed")
    const feedObj = JSON.parse(feedStr);
    const items = feedObj.items;
    for (const item of items) {
      const feedEntry: FeedItemEntry = {
        id: "",
        url: item.url || "",
        title: item.title || "",
        content: item.content_html || item.content_text || "",
        author: item.authors?.[0]?.name || "",
        datePublished: item.date_published ? new Date(item.date_published) : new Date(),
        read: false,
      }

      /* add id now that i have all the values */
      feedEntry.id = await sha512Hash(`${feedEntry.url}${feedEntry.datePublished}`);

      feedEntries.push(feedEntry);
    }

  /* MARK: - RSS/ATOM FEED */

  } else {
    // console.log("this is xml feed")
    const xmlOptions = {
      preserveOrder: false,
      alwaysCreateTextNode: true,
      trimValues: true,
      ignoreAttributes: false,
      removeNSPrefix: false,
    }
    const parser = new XMLParser(xmlOptions);
    const obj: any = parser.parse(feedStr);
    let items = obj.rss?.channel?.item || obj.feed?.entry;
    // if only 1 item the xml parser won't put it in an array like it does for 
    // 2+ items, so put in array so it's able to be processed in the loop
    console.log(obj);
    if (! isArray(items)) {
      items = [items];
    }
    for (const item of items) {

      // TODO: tbh prob put all this formatting stuff where the feed is initially 
      // parsed so easier to create plugins that modify without having to modify how 
      // it's stored in sql (e.g. you might need an image column for youtube feed to 
      // be able to then add the image to the content here, but if you simply modify 
      // the content at the point of parsing, all the image data is directly available
      // to use to modify the content)

      const url: string = item?.link?.["@_href"] || item.link?.["#text"] || item?.link || "";

      let content: string = item["content:encoded"]?.["#text"] || item.content?.["#text"] 
        || item.description?.["#text"] || item.summary?.["#text"] 
        || item["media:group"]?.["media:description"]?.["#text"] 
        || "";
      const isHTML = content.includes("<br>");
      if (!isHTML) {
        content = content.replace(/\n/g, "<br>");
      }

      // if it's a youtube feed, modify the content by adding the video to the 
      // top of the content
      if (url.startsWith("https://www.youtube")) {
        const videoID = url.match(/(\w{11})$/)?.[1];
        const video = `<iframe width="100%" style="aspect-ratio: 853 / 480"
        src="https://www.youtube.com/embed/${videoID}">
        </iframe><br>`
        content = video + content;
      }

      let author = item?.author?.name?.["#text"] || item?.["dc:creator"]?.["#text"] || "";
      if (! author) {
        const authors = item?.author || item?.["dc:creator"];
        if (authors) {
          for (const a of authors) {
            author = a?.name?.["#text"] || a?.["#text"];
          }
        }
      }

      const dateStr: string = item.pubDate?.["#text"] || item.published?.["#text"] || "";

      const feedEntry: FeedItemEntry = {
        id: "",
        url: url,
        title: item.title?.["#text"] || "",
        content: content,
        author: author || "",
        datePublished: dateStr ? new Date(dateStr) : new Date(),
        read: false,
      }

      /* optional attributes */

      const _views = Number(item?.["media:group"]?.["media:community"]?.["media:statistics"]?.["@_views"]);
      if (_views) {
          item._views = _views;
      }

      /* add id now that i have all the values */
      feedEntry.id = await sha512Hash(`${feedEntry.url}${feedEntry.datePublished}`);

      feedEntries.push(feedEntry);
    }
  }
  return feedEntries;
}