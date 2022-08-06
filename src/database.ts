// pnpm install github:tauri-apps/tauri-plugin-sql
import Database from 'tauri-plugin-sql-api';
import { Filters } from './AddFeedModal';

import { renderRoot } from './main'

// top-level await not allowed yet
// const db: Database = await initDB();
let db: Database;

/* MARK: - state */

export const feedStateInit: FeedState = {
  // top-level await not allowed yet
  // feeds: await getFeedsFromDB(),
  feeds: [],
  _currentFeedId: null,
  currentFeedEntries: [],
  _currentFeedEntryId: null,
  currentFeedEntryContent: "",
}

// if (db === undefined) {
  initDBAndState();
// }

async function initDBAndState() {
  db = await initDB();
  feedStateInit.feeds = await getFeedsFromDB();
  console.log("RAN INIT");
  // above seems to execute post-render, so must update render
  renderRoot();
}

export interface FeedState {
  feeds: FeedItemState[]
  _currentFeedId: string | null
  currentFeedEntries: FeedItemEntryState[]
  _currentFeedEntryId: string | null
  currentFeedEntryContent:string
}
export interface FeedItemState {
  id: string
  name:string
}
/**
 * @param id the id of feed entry
 * @param combinedID the id of the feed entry + the id of the feed.
 * formatted as \`_${feedID}-${entryID}\` (must start with an undersocre bc 
 * can't start with a number as it will cause an error when using querySelector, 
 * preventing you from selecting it)
 */
export interface FeedItemEntryState {
  id: string
  combinedID: string
  url:string
  title:string
  contentSnippet:string
  author:string
  date: Date
  read: Boolean
}

/* MARK: - database */

export interface FeedItemEntry {
  id: string
  url:string
  title:string
  content:string
  author:string
  datePublished: Date
  read: Boolean
  _views?: number
}

async function getFeedsFromDB(): Promise<FeedItemState[]> {
  let out: FeedItemState[] = await db.select("select * from feeds")
    .then((x: any) => {
      return x.map((x: any) => ({id: x.id, name: x.name}))
        .sort((a: any, b: any) => a.name > b.name ? 1 : -1);
    })
    .catch(_ => {
      console.log("failed to load feeds");
      return [];
    })
  return out
}

export async function getFeedIDsAndTypesFromDB(
  ): Promise<{id: string, type: string, url: string, query: string, filters: Filters}[]> {

  let out: any = await db.select("SELECT id, type, url, query, filters FROM feeds")
    .then((arr: any) => arr.map((x: any) => ({
      ...x,
      filters: JSON.parse(x.filters),
    })))
    .catch(e => {
      console.log("failed to fetch feeds: ", e);
      return [];
    })
  return out
}

/** 
 * gives hash string 128 chars long. essentially impossible for a collision to occur.
 */
export async function sha512Hash(str: string) {
  return crypto.subtle.digest("SHA-512", new TextEncoder().encode(str)).then(buf => {
    return Array.prototype.map.call(new Uint8Array(buf), x=>(('00'+x.toString(16)).slice(-2))).join('');
  });
}

async function initDB(): Promise<Database> {
  // sqlite. The path is relative to `tauri::api::path::BaseDirectory::App`.
  const db = await Database.load('sqlite:test.db');

  const createTable = await db.execute(`
    CREATE TABLE IF NOT EXISTS feeds (
      id VARCHAR(128) NOT NULL,
      name VARCHAR(200),      --col 'name' must be string, and < 200 chars
      type VARCHAR(200) NOT NULL,
      url VARCHAR(200),
      query VARCHAR(200),
      filters MEDIUMTEXT,
      last_updated VARCHAR(24), -- don't need DATE type to sort by date since the string is ISO format
      update_interval INT, --hours
      max_entries_per_week INT
    )
  `);
  console.log(`CREATE FEEDS TABLE: ${createTable}`);

  return db
}

export async function addFeedToDB(
  id: string,
  name:string,
  type:string,
  url:string,
  query:string,
  filters: Filters,
  lastUpdated:string,
  updateInterval: Number,
  maxEntriesPerWeek: Number
  ) {

  /* MARK: - add feed to feeds table */

  let filtersStr = JSON.stringify(filters);

  name = sqlSafe(name);
  url = sqlSafe(url);
  query = sqlSafe(query);
  filtersStr = sqlSafe(filtersStr);

  await db.execute(`
  INSERT INTO feeds (id, name, type, url, query, filters, last_updated, update_interval, max_entries_per_week)
    VALUES ('${id}', '${name}', '${type}', '${url}', '${query}', '${filtersStr}', '${lastUpdated}', ${updateInterval}, ${maxEntriesPerWeek})
  `);

  /* MARK: - add feed entries to new table for this specific feed */

  const createTable = await db.execute(`
    CREATE TABLE IF NOT EXISTS F${id} (
      id VARCHAR(128) NOT NULL,
      url VARCHAR(200),
      title VARCHAR(200),
      content MEDIUMTEXT,
      content_snippet VARCHAR(100),
      author VARCHAR(200),
      date_published VARCHAR(200),
      read BOOL NOT NULL
    )
  `)
  console.log(`CREATE FEED TABLE: ${createTable}`);
}

export async function removeFeedFromDB(id: string) {
  await db.execute(`
    DELETE
    FROM feeds
    WHERE id = '${id}'
  `)

  await db.execute(`
    DROP TABLE IF EXISTS F${id}
  `)
}

export async function updateFeedEntries() {
  // get current feed titles and dates form db to check if feed exists before adding
}

function sqlSafe(str: string): string {
  // `'` in string messes up adding the string to sql table. replacing with `''`
  // fixes this
  return str.replace(/'/g, "''");
}

export async function addFeedEntry(
    feedID: string,
    {id, url, title, content, author, datePublished, read}: FeedItemEntry,
  ) {

  // create content snippet for the entry preview that just contains the start 
  // of the content text. this is to avoid storing all the content in memory

  // remove html tags, and convert html-encoded-chars to their char so the 
  // snippet isn't some gobbledygook that tells you nothing about the feed entry
  const n = document.createElement("div");
  n.innerHTML = String(content);
  const textContent = n.innerText;

  const snippetChars = 80;
  let contentSnippet:string;
  if (textContent.length > snippetChars) {
    contentSnippet = textContent.substring(0, snippetChars);
  } else {
    contentSnippet = textContent;
  }

  url = sqlSafe(url);
  title = sqlSafe(title);
  content = sqlSafe(content).trim();
  contentSnippet = sqlSafe(contentSnippet).trim();

  await db.execute(`
    INSERT INTO F${feedID} (id, url, title, content, content_snippet, author, date_published, read)
      VALUES ('${id}', '${url}', '${title}', '${content}', '${contentSnippet}', '${author}', '${datePublished.toISOString()}', ${read})
  `);
}

export async function getFeedEntry(feedID: string, entryID: string): Promise<FeedItemEntry> {

  const dbData: any[] = await db.select(`
    SELECT id, url, title, content, author, date_published, read
    FROM F${feedID}
    WHERE id = '${entryID}'
    ORDER BY date_published DESC
  `);
  const item = dbData[0];
  const entry: FeedItemEntry = {
    id: item.id,
    url: item.url,
    title: item.title,
    content: item.content,
    author: item.author,
    datePublished: new Date(item.date_published),
    read: item.read,
  }
  return entry;
}

export async function getFeedEntries(id: string): Promise<FeedItemEntryState[]> {

  const dbData: any[] = await db.select(`
    SELECT id, url, title, content_snippet, author, date_published, read
    FROM F${id}
    ORDER BY date_published DESC
  `);

  const entries: FeedItemEntryState[] = []
  for (const item of dbData) {
    const entry: FeedItemEntryState = {
      id: item.id,
      combinedID: `${id}-${item.id}`,
      url: item.url,
      title: item.title,
      contentSnippet: item.content_snippet,
      author: item.author,
      date: new Date(item.date_published),
      read: item.read,
    }
    entries.push(entry);
  }
  return entries
}

export async function getAllFeedEntries(feedIDs: string[]): Promise<FeedItemEntryState[]> {

  const entries: FeedItemEntryState[] = []

  for (const id of feedIDs) {
    entries.push(...await getFeedEntries(id));
  }

  return entries.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function setEntryToRead(feedID:string, entryID:string) {
  await db.execute(`
    UPDATE F${feedID}
    SET read = TRUE
    WHERE id = '${entryID}'
  `);
}

export async function getIDsOfFeedEntries(feedID: string): Promise<Set<string>> {

  const dbData: any[] = await db.select(`
    SELECT id
    FROM F${feedID}
  `);

  return new Set(dbData.map(x => x.id));
}