/*

pnpm tauri dev

pnpm tauri build

*/

import { useState } from 'react'
// import logo from './logo.svg'
import './App.css'

import { feedStateInit } from './database'
import { FeedsContainer } from './FeedsContainer';
import { FeedEntryContentContainer } from './FeedEntryContentContainer';
import { FeedEntriesContainer } from './FeedEntriesContainer';

function App() {

  console.log("LOADED APP");

  const [feedState, setFeedState] = useState(feedStateInit)
  const [sidebarIsHidden, toggleSidebarIsHidden] = useState(false);

  return (
    <div style={{display: "flex", flexDirection: "row"}} className="select-none">
      <FeedsContainer
       feedState={feedState}
       setFeedState={setFeedState}
       sidebarIsHidden={sidebarIsHidden}
       toggleSidebarIsHidden={toggleSidebarIsHidden}
      />

      <FeedEntriesContainer
        feedState={feedState}
        setFeedState={setFeedState}
        sidebarIsHidden={sidebarIsHidden}
        toggleSidebarIsHidden={toggleSidebarIsHidden}
      />

      <FeedEntryContentContainer
        feedState={feedState}
      />
    </div>
  )
}

export default App
