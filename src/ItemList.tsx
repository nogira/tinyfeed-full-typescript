import { BaseSyntheticEvent } from "react";

import { LIGHT_GRAY, BLUE, ListType } from "./constants & types";
import { handleBtnHover } from "./handleBtnHover";
import { FeedItemEntry, FeedState,
  getFeedEntries, getFeedEntry, getAllFeedEntries } from "./database";

export function removeItemSelection(prefix:string) {
  const prevSelected: any = document.querySelector(`.${prefix}.selected`);
  if (prevSelected) {
    prevSelected.style.backgroundColor = null;
    prevSelected.style.color = null;
    prevSelected.classList.remove("selected");
  }
}

/**
 * 
 * @param idStr the id, NOT prefixed with an underscore
 */
export async function handleItemSelection(idStr:string, feedState: FeedState, setFeedState: any) {

  const node: HTMLDivElement | null = document.querySelector(`#_${idStr}`);

  // only do something if the item clicked on is not already selected
  if (node && ! node.classList.contains("selected")) {

    const PREFIX = node.classList.contains("feed") ? "feed" : "feedEntry";

    /* MARK: - change selection state */

    if (node.classList.contains("feed")) {

      const id = idStr;

      // remove feed entry selection bc feed changed
      removeItemSelection("feedEntry");

      /* if "All" feed is selected, show all feed entries */

      if (id === "all") {
        const feedIDs = feedState.feeds.map((x: any) => x.id);
        const currentFeedEntries = await getAllFeedEntries(feedIDs);
        setFeedState((prevState: FeedState) => ({
          ...prevState,
          _currentFeedId: id,
          currentFeedEntries: currentFeedEntries,
          currentFeedEntryContent: "",
        }));

      /* get entries for single feed */

      } else {
        const currentFeedEntries = await getFeedEntries(id);
        setFeedState((prevState: FeedState) => ({
          ...prevState,
          _currentFeedId: id,
          currentFeedEntries: currentFeedEntries,
          currentFeedEntryContent: "",
        }));
      }

    } else if (node.classList.contains("feedEntry")) {
      let [feedID, entryID] = idStr.split("-");
      const feedEntry: FeedItemEntry = await getFeedEntry(feedID, entryID);
      const feedEntryHTML:string = `
        <a href="${feedEntry.url}" style="font-size: 130%; font-weight: bold;">
          ${feedEntry.title}
        </a>
        <hr style="margin-top: 10px; margin-bottom: 10px;">
        ${feedEntry.content}`;
      setFeedState({
        ...feedState,
        _currentFeedEntryId: entryID,
        currentFeedEntryContent: feedEntryHTML,
      });
    }

    /* MARK: - change styling to indicate selection */

    // remove class and styling from previously selected item if exists
    removeItemSelection(PREFIX);

    // modify current item to make it selected
    node.style.backgroundColor = BLUE;
    node.style.color = "white";
    node.classList.add("selected");
  }
}

export function ItemList({ feedState, setFeedState, listType, items }: any) {

  let prefix:string;
  if (listType === ListType.feed) {
    prefix = "feed";
  } else {
    prefix = "feedEntry";
  }

  return (
    <div className="flex flex-col justify-start justify-items-stretch mt-1 mb-1">
      {items.map((x: any) => (
        <div
          key={x.id}
          /* ids can't start with a number so must add this underscore to start */
          id={"_" + x.id}
          className={`${prefix} justify-self-start p-1 rounded ml-1 mr-1`}
          onMouseEnter={(e: BaseSyntheticEvent) => handleBtnHover(e, LIGHT_GRAY)}
          onMouseLeave={(e: BaseSyntheticEvent) => handleBtnHover(e, null)}
                                          // `substring(1)` is to remove the starting underscore
          onMouseDown={(e: BaseSyntheticEvent) => handleItemSelection(e.target.id.substring(1), feedState, setFeedState)}
        >
          <div
            style={{fontSize: "70%"}}
            className="pointer-events-none"
          >
            {x.jsx}
          </div>
        </div>
      ))}
    </div>
  )
}