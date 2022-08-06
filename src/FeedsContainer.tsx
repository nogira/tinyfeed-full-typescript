import { useState, useEffect } from "react";
import { Divider } from "@mantine/core";
import { Plus, Minus, Refresh, LayoutSidebarLeftCollapse } from "tabler-icons-react";

import { HorizontalContainer } from "./HorizontalContainer";
import { TopBarBtn } from "./TopBarBtn";
import { ItemList, removeItemSelection } from "./ItemList";
import { AddFeedModal } from "./AddFeedModal";
import { ICON_SIZE, ListType } from "./constants & types";
import { FeedState, FeedItemState, FeedItemEntry, getFeedIDsAndTypesFromDB, sha512Hash, 
  getIDsOfFeedEntries, addFeedEntry } from "./database";
import { RemoveFeedModal } from "./RemoveFeedModal";
import { feedURLToHTML, getFeedFromHTML } from "./get-feed/getFeedFromURL";
import { getYoutubeSearchFeed } from "./get-feed/getYoutubeSearchFeed";
import { getTwitterSearchFeed } from "./get-feed/getTwitterSearchFeed";
import { filter } from "./get-feed/filter";

export function FeedsContainer({
    feedState, setFeedState,
    sidebarIsHidden, toggleSidebarIsHidden
  }: any) {

  const [addFeedModalOpened, setAddFeedModalOpened] = useState(false);
  const [removeFeedModalOpened, setRemoveFeedModalOpened] = useState(false);

  const [feedsAreRefreshing, setFeedsAreRefreshing] = useState(false);
  // this toggle is used to reset feed refresh interval when feed is manually 
  // refreshed
  useEffect(() => {
    const interval = setInterval(() => {

      console.log("auto-refreshing feeds");
      refreshFeeds();

      // set interval to 1 hr
    }, 1000 * 60 * 60);
    
    return () => {
      clearInterval(interval);
    };
    // at start and end of when feed is refreshed, the time interval to next 
    // feed refresh is reset
  }, [feedsAreRefreshing]);

  async function refreshFeeds() {
    setFeedsAreRefreshing(true);

    /* update each feed */

    const feeds = await getFeedIDsAndTypesFromDB();
    for (const {id: feedID, type, url, query, filters} of feeds) {

      /* get current feed entries */

      let entries: FeedItemEntry[] = [];
      switch (type) {
        case "URL": {
          const feedStr = await feedURLToHTML(url);
          entries = await getFeedFromHTML(feedStr);
          break;
        }
        case "Youtube Search": {
          const encodedQuery = encodeURIComponent(query);                        // this orders by most recent
          const url = `https://www.youtube.com/results?search_query=${encodedQuery}&sp=CAI`;
          const feedStr = await feedURLToHTML(url);
          entries = await getYoutubeSearchFeed(feedStr);
          break;
        }
        case "Twitter Search": {
          entries = await getTwitterSearchFeed(query);
        }
      }
      // filter entries using user filters
      entries = filter(entries, filters);

      /* add if hash is unique */

      // --get past feed entry hashes to compare--
      // using a set bc its much faster to find if a val is present or not
      let oldEntries: Set<string> = await getIDsOfFeedEntries(feedID);

      for (const entry of entries) {

        if (! oldEntries.has(entry.id)) {
          addFeedEntry(feedID, {id: entry.id, url: entry.url, title: entry.title, 
            content: entry.content, author: entry.author, 
            datePublished: entry.datePublished, read: false});
        }
      }

      // sleep 500ms between feeds so don't get rate limited by a website/api
      await (new Promise(resolve => setTimeout(resolve, 500)));
    }

    /* update feed state bc current feed could have changed */

    // TODO: make it more user friendly by not removing selection on update

    removeItemSelection("feed");

    setFeedState((prevState: FeedState) => ({
        ...prevState,
        _currentFeedId: null,
        currentFeedEntries: [],
        _currentFeedEntryId: null,
        currentFeedEntryContent: "",
      }))

    setFeedsAreRefreshing(false);
  }
  return (
    <HorizontalContainer width={250}
      hidden={sidebarIsHidden}
      topBar={
        <div className="flex flex-horizontal justify-end">
          <TopBarBtn onClick={(e: any) => toggleSidebarIsHidden(true)}>
            <LayoutSidebarLeftCollapse  size={ICON_SIZE} className="pointer-events-none" />
          </TopBarBtn>

          <div className="flex-1"></div> {/* SPACER */}

          <TopBarBtn
            onClick={refreshFeeds}
            className={feedsAreRefreshing ? "pointer-events-none" : ""}
          >
            <Refresh size={ICON_SIZE} id="refresh-icon"
              className={`pointer-events-none${feedsAreRefreshing ? " reloading" : ""}`}
              
            />
          </TopBarBtn>

          <RemoveFeedModal
            opened={removeFeedModalOpened}
            setOpened={setRemoveFeedModalOpened}
            feedState={feedState}
            setFeedState={setFeedState}
          />
          <TopBarBtn onClick={(e: any) => {
            const id = feedState._currentFeedId;
            if (id !== null && id !== "all") {
              setRemoveFeedModalOpened(true);
            }
          }}>
            <Minus size={ICON_SIZE} className="pointer-events-none" />
          </TopBarBtn>

          <AddFeedModal
            opened={addFeedModalOpened}
            setOpened={setAddFeedModalOpened}
            feedState={feedState}
            setFeedState={setFeedState}
          />
          <TopBarBtn onClick={(e: any) => setAddFeedModalOpened(true)}>
            <Plus size={ICON_SIZE} className="pointer-events-none" />
          </TopBarBtn>
          
        </div>}
      content={
        <>
          <ItemList
            feedState={feedState}
            setFeedState={setFeedState}
            listType={ListType.feed}
            items={[{id: "all", name: "All"}].map(x => ({
              id: x.id,
              jsx: x.name,
            }))}
          />
          <Divider style={{margin: 5}} />
          <ItemList
            feedState={feedState}
            setFeedState={setFeedState}
            listType={ListType.feed}
            items={feedState.feeds.map((x: FeedItemState) => ({
              id: x.id,
              jsx: x.name,
            }))}
          />
        </>
      }
    />
  );
}