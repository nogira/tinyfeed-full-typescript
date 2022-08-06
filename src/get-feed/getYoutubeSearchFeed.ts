import { FeedItemEntry, sha512Hash } from "../database";

export async function getYoutubeSearchFeed(htmlStr:string): Promise<FeedItemEntry[]> {
  let data = htmlStr.match(/<script.+?var ytInitialData = (.+?);<\/script>/)?.[1] ?? "";
  const dataObj: any = JSON.parse(data);
  let videos: any;
  try {
    videos = dataObj.contents.twoColumnSearchResultsRenderer.primaryContents
        .sectionListRenderer.contents[0].itemSectionRenderer.contents;
  } catch {
    console.log("Youtube search object structure changed.");
    return [];
  }

  const feedEntries: FeedItemEntry[] = []
  for (let video of videos) {
    video = video.videoRenderer;
    // if videoRenderer attribute not present, skip this video item bc not a video
    if (! video) { continue }

    let content = video.detailedMetadataSnippets?.[0]?.snippetText?.runs
      ?.map((x: any) => x.text)?.join("") || "";
    // modify the content by adding the video to the top of the content
    const iframe = `<iframe width="100%" style="aspect-ratio: 853 / 480"
    src="https://www.youtube.com/embed/${video.videoId}">
    </iframe><br>`
    content = iframe + content;

    const timeText = video.publishedTimeText?.simpleText;
    // timeText is undefined if the video is a livestream, so if livestream, ignore
    if (timeText === undefined) { continue }
    const num = timeText.match(/\d+/)?.[0];
    let multiplier = 1;
    let date = new Date();
    if (/minute/.test(timeText)) {
        multiplier = 1000 * 60;
    } else if (/hour/.test(timeText)) {
        multiplier = 1000 * 60 * 60;
    } else if (/day/.test(timeText)) {
        multiplier = 1000 * 60 * 60 * 24;
    } else if (/month/.test(timeText)) {
        multiplier = 1000 * 60 * 60 * 24 * 30;
    } else if (/year/.test(timeText)) {
        multiplier = 1000 * 60 * 60 * 24 * 365;
    }
    if (multiplier !== 1) {
      date =  new Date(Date.now() - (num * multiplier));
    }

    const feedEntry: FeedItemEntry = {
      id: "",
      url: `https://www.youtube.com/watch?v=${video.videoId}` || "",
      title: video.title.runs[0].text || "",
      content: content || "",
      author: video.longBylineText?.runs?.[0]?.text || "",
      datePublished: date,
      read: false,
    }

    const _views = Number(video.viewCountText?.simpleText
      ?.replace(/ views?|\.|,/g, "")
      ?.replace("K", "000")
      ?.replace("M", "000000")
      ?.replace("No", "0"));

    if (_views) {
      // 0 views is usually spam, so ignore
      if (_views === 0) continue;
      feedEntry._views = _views;
    }

    /* add id now that i have all the values */
    // not using date.published for youtube search feed bc date can change due 
    // to how it is formatted
    feedEntry.id = await sha512Hash(`${feedEntry.url}${feedEntry.content}`);

    feedEntries.push(feedEntry);
  }
  return feedEntries;
}