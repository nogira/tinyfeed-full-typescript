import { useState } from "react";
import { Book, Filter, FilterOff, LayoutSidebarLeftExpand } from "tabler-icons-react";

import { ICON_SIZE, ListType } from "./constants & types";
import { FeedItemEntryState, FeedItemState, FeedState, setEntryToRead } from "./database";
import { HorizontalContainer } from "./HorizontalContainer";
import { ItemList, handleItemSelection } from "./ItemList";
import { TopBarBtn } from "./TopBarBtn";

import { invoke } from "@tauri-apps/api/tauri";

/**
 * example call: `fetchURL("https://google.com").then(x => console.log(x))`
 * @param url 
 * @returns 
 */
async function fetchURL(url:string) {
  return invoke("fetch_async", {url: url});
}

export function FeedEntriesContainer({
    feedState, setFeedState,
    sidebarIsHidden, toggleSidebarIsHidden
  }: {feedState: FeedState, setFeedState: any,
    sidebarIsHidden: Boolean, toggleSidebarIsHidden: any}) {
  
  const [filterOn, toggleFilterOn] = useState(true);
  let currentEntries = feedState.currentFeedEntries;
  // if filter is on, filter out the read items
  if (filterOn) {
    currentEntries = currentEntries.filter(x => x.read === false);
  }

  function markSelectedEntryAsRead() {
    const currentlySelected = document.querySelector(".selected.feedEntry");
    const combinedID = currentlySelected?.id.substring(1);
    /* select item right below item just marked as read so can delete multiple
    items in quick succession. if none below, try the item right above instead */
    if (currentlySelected?.nextElementSibling) {
      const id = currentlySelected?.nextElementSibling.id.substring(1);
      handleItemSelection(id, feedState, setFeedState)
    } else if (currentlySelected?.previousElementSibling) {
      const id = currentlySelected?.previousElementSibling.id.substring(1);
      handleItemSelection(id, feedState, setFeedState);
    }
    if (combinedID) {

      /* MARK: - update feed state  */

      setFeedState((prevState: FeedState) => {
        const feedEntries: FeedItemEntryState[] = prevState.currentFeedEntries
        for (const entry of feedEntries) {
          if (entry.combinedID == combinedID) {
            entry.read = true;
          }
        }
        return {...prevState, currentFeedEntries: feedEntries}
      })

      /* MARK: - update read val in db */

      const [feedID, entryID] = combinedID.split("-");
      setEntryToRead(feedID, entryID)
    }
  }

  return (
    <HorizontalContainer width={350}
        topBar={
          <div className="flex flex-horizontal justify-end">
            {sidebarIsHidden &&
              <TopBarBtn onClick={(e: any) => toggleSidebarIsHidden(false)}>
                <LayoutSidebarLeftExpand size={ICON_SIZE} className="pointer-events-none" />
              </TopBarBtn>}

            <div className="flex-1"></div> {/* SPACER */}

            <TopBarBtn onClick={markSelectedEntryAsRead}>
              <Book size={ICON_SIZE} className="pointer-events-none"  />
            </TopBarBtn>

            {/* <TopBarBtn onClick={(e: any) => toggleRead(!read)}>
              {read ? <CircleDotted size={ICON_SIZE} className="pointer-events-none" />
              : <Circle size={ICON_SIZE} className="pointer-events-none" />}
            </TopBarBtn> */}
            
            <TopBarBtn onClick={(e: any) =>  toggleFilterOn(!filterOn)}>
              {filterOn ? <FilterOff size={ICON_SIZE} className="pointer-events-none" />
              : <Filter size={ICON_SIZE} className="pointer-events-none" />}
            </TopBarBtn>
          </div>}
        content={
          <ItemList
            feedState={feedState}
            setFeedState={setFeedState}
            listType={ListType.feedEntry}
            items={currentEntries.map(x => ({
              id: x.combinedID,
              jsx: (
                <>
                  <div className="font-bold truncate">{x.title}</div>
                  <div className="text-black/30 truncate">
                    {/* if contentSnippet is empty, replace with an invisible 
                      character so the entry container maintains the same height
                      (otherwise the title would be right on top of the author) */}
                    {x.contentSnippet || <span dangerouslySetInnerHTML={{__html: "&zwnj;"}}></span>}
                  </div>
                  <div className="flex flex-horizontal justify-between font-bold text-black/30">
                    <div className="truncate">{x.author}</div>
                    <div className="truncate">
                      {(() => {
                        const d = x.date;
                        const month = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                        return `${d.getDate()} ${month[d.getMonth()]} ${d.getFullYear()}`
                      })()}
                    </div>
                  </div>
                </>
              ),
            }))}
          />
        }
      />
  );
}