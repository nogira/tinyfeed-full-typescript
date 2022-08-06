import { assert, describe, it } from 'vitest';
import { getFeedFromHTML } from "../get-feed/getFeedFromURL";

async function test(url: string) {

  const feedStr = await fetch(url)
    .then(x => x.text());

  const feed = getFeedFromHTML(feedStr);
  console.log(feed);
}

describe.concurrent('suite', () => {
  it('json test', async () => {
    await test("https://www.jsonfeed.org/feed.json");
  });
  it('rss test', async () => {
    await test("https://www.nasa.gov/rss/dyn/mission_pages/kepler/news/kepler-newsandfeatures-RSS.rss");
  });
  it('atom test', async () => {
    await test("https://www.youtube.com/feeds/videos.xml?channel_id=UC5WjFrtBdufl6CZojX3D8dQ");
  });
});