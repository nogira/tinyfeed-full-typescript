import { useState } from 'react'
import { Button, Modal, MultiSelect, NativeSelect, NumberInput, Space, TextInput } from '@mantine/core';

import { sha512Hash,
  addFeedToDB, addFeedEntry,
  FeedState, FeedItemState,
  FeedItemEntry } from './database'
import { feedURLToHTML, getFeedFromHTML } from './get-feed/getFeedFromURL';
import { getYoutubeSearchFeed } from './get-feed/getYoutubeSearchFeed';
import { getTwitterSearchFeed } from './get-feed/getTwitterSearchFeed';
import { filter } from './get-feed/filter';

export interface Filters {
  title_excl?: string
  title_incl?: string
  content_excl?: string
  content_incl?: string
  author_excl?: string
  author_incl?: string
  min_views?: string
}

export function AddFeedModal({opened, setOpened, feedState, setFeedState}: any) {

  const [feedName, setFeedName] = useState("");
  const [feedType, setFeedType] = useState("URL");
  const [feedURL, setFeedURL] = useState("");
  const [feedQuery, setFeedQuery] = useState("");

  const filtersInit: Filters = {}
  const [filters, setFilters] = useState(filtersInit);

  const [maxEntriesPerWeek, setmaxEntriesPerWeek] = useState(5);
  const [refreshInterval, setRefreshInterval] = useState(1);

  async function addFeed() {
    let url = "";
    let query = "";
    let _maxEntriesPerWeek = maxEntriesPerWeek
    switch (feedType) {
      case "URL":
        url = feedURL;
        // if url ends in `/`, it can cause fetch to fail (specifically using `curl`), so remove it
        if (url.endsWith("/")) {
          url = url.substring(0, url.length - 1)
        }
        // maxEntriesPerWeek not relevant for URLs, so just set to 0 for less confusion
        _maxEntriesPerWeek = 0
        break;
      case "Youtube Search":
        query = feedQuery;
        break;
      case "Twitter Search":
        query = feedQuery;
    }
    const id = await sha512Hash(url || query);
    const lastUpdated = (new Date()).toISOString();

    /* MARK: - ADD FEED - update database */

    addFeedToDB(id, feedName, feedType, url, query, filters, lastUpdated, refreshInterval, _maxEntriesPerWeek)

    /* MARK: - ADD FEED - update feedState */

    setFeedState((prevState: FeedState) => {
      const newFeed: FeedItemState = {
        id: id,
        name: feedName,
      }
      const feeds = prevState.feeds
      feeds.push(newFeed);
      feeds.sort((a: any, b: any) => a.name > b.name ? 1 : -1);
      return {
        ...prevState,
        feeds: feeds,
      };
    })

    /* ---------------------------------------------------------------------- */

    // fetch feed entries
    let entries: FeedItemEntry[] = [];
    switch (feedType) {
      case "URL": {
        const feedStr = await feedURLToHTML(url);
        entries = await getFeedFromHTML(feedStr);
        break;
      }
      case "Youtube Search": {
        const query = encodeURIComponent(feedQuery);
        const url = `https://www.youtube.com/results?search_query=${query}&sp=CAI`;
        const feedStr = await feedURLToHTML(url);
        entries = await getYoutubeSearchFeed(feedStr);
        break;
      }
      case "Twitter Search": {
        entries = await getTwitterSearchFeed(feedQuery);
      }
    }
    // filter entries using user filters
    entries = filter(entries, filters);

    /* MARK: - ADD FEED ENTRIES - update database */

    for (const entry of entries) {

      addFeedEntry(id, {id: entry.id, url: entry.url, title: entry.title, 
        content: entry.content, author: entry.author, 
        datePublished: entry.datePublished, read: false});

      /* note: do not need to update feed state bc this feed is not be selected */
    }

    // reset filters state bc if this is reopened, the multiselect from last 
    // feed add seems to go out of sync with the filter from last feed add
    setFilters({});

    setOpened(false);
  }

  return (
    <Modal
      // className="text-sm"
      opened={opened}
      onClose={() => setOpened(false)}
      title="Add Feed"
    >
      <TextInput
        size="xs"
        value={feedName}
        onChange={e => setFeedName(e.currentTarget.value)}
        placeholder="cool blog"
        label="Name for your feed"
        required
      />
      <NativeSelect
        size="xs"
        value={feedType}
        onChange={e => setFeedType(e.currentTarget.value)}
        data={['URL', 'Youtube Search', 'Twitter Search']}
        label="Select feed type"
        required
      />
      { feedType === "URL" &&
          <TextInput
            size="xs"
            value={feedURL}
            onChange={e => setFeedURL(e.currentTarget.value)}
            placeholder="https://website.com/feed"
            label="Feed URL"
            required
          />
      }
      { feedType === "Youtube Search" &&
          <TextInput
            size="xs"
            value={feedQuery}
            onChange={e => setFeedQuery(e.currentTarget.value)}
            placeholder="fusion reactor"
            label="Search Query"
            required
          />
      }
      { feedType === "Twitter Search" &&
          <TextInput
            size="xs"
            value={feedQuery}
            onChange={e => setFeedQuery(e.currentTarget.value)}
            placeholder="from:ElonMusk mars -filter:replies"
            label="Search Query"
            required
          />
      }

      <Space h="lg" />

      {/* feedType !== "URL" &&
        <NumberInput
          size="xs"
          value={maxEntriesPerWeek}
          onChange={val => val && setmaxEntriesPerWeek(val)}
          label="Max feed items per week"
          description="Only most viewed/faved will be shown"
          required
        />
      */}
      {/* <NumberInput
        size="xs"
        value={refreshInterval}
        onChange={val => val && setRefreshInterval(val)}
        label="Refresh feed every x hours"
        required
      /> */}

      <Space h="lg" />

      <FiltersComponent
        filters={filters}
        setFilters={setFilters}
        feedType={feedType}
      />

      <Space h="lg" />

      <div className='flex justify-center'>
        <Button onClick={addFeed} size="xs">
          Add
        </Button>
      </div>
      
    </Modal>
  );
}

// FIXME: FILTERS COMPONENT IS REALLY UGLY CODE. NEED TO SIMPLIFY

function FiltersComponent({filters, setFilters, feedType}: any) {

  const filterMultiSelectNamesInit: string[] = []
  const [filterMultiSelectNames, setFilterMultiSelectNames] = useState(filterMultiSelectNamesInit);

  const multiSelectValLabelRef = [
    { value: 'title_excl', label: 'Title excludes' },
    { value: 'title_incl', label: 'Title includes' },
    { value: 'content_excl', label: 'Content excludes' },
    { value: 'content_incl', label: 'Content includes' },
    { value: 'author_excl', label: 'Author excludes' },
    { value: 'author_incl', label: 'Author includes' },
  ];
  if (feedType === "Youtube Search") {
    multiSelectValLabelRef.push(
      { value: 'min_views', label: 'Minimum views' }
    );
  }
  function getFilterValue(filters: Filters, attr: string): string {
    switch (attr) {
      case "title_excl": return filters.title_excl ?? "";
      case "title_incl": return filters.title_incl ?? "";
      case "content_excl": return filters.content_excl ?? "";
      case "content_incl": return filters.content_incl ?? "";
      case "author_excl": return filters.author_excl ?? "";
      case "author_incl": return filters.author_incl ?? "";
      case "min_views": return filters.min_views ?? ""
    }
    return ""
  }
  function setFilterValue(filters: Filters, attr: string, val: string) {
    switch (attr) {
      case "title_excl": filters.title_excl = val; break;
      case "title_incl": filters.title_incl = val; break;
      case "content_excl": filters.content_excl = val; break;
      case "content_incl": filters.content_incl = val; break;
      case "author_excl": filters.author_excl = val; break;
      case "author_incl": filters.author_incl = val; break;
      case "min_views": filters.min_views = val; break;
    }
  }
  function removeFilterValue(filters: Filters, attr: string) {
    switch (attr) {
      case "title_excl": delete filters.title_excl; break;
      case "title_incl": delete filters.title_incl; break;
      case "content_excl": delete filters.content_excl; break;
      case "content_incl": delete filters.content_incl; break;
      case "author_excl": delete filters.author_excl; break;
      case "author_incl": delete filters.author_incl; break;
      case "min_views": delete filters.min_views; break;
    }
  }

  return (
    <>
      <MultiSelect
        label="Filters"
        value={filterMultiSelectNames}
        onChange={(newVal) => {
          // if a filter type is unselected, find the one unselected, then 
          // remove from `filters`
          let oldCopy = [...filterMultiSelectNames];
          // if array gets shorter find the item removed
          if (newVal.length < filterMultiSelectNames.length) {
            for (const elem of newVal) {
              oldCopy = oldCopy.filter(x => x !== elem);
            }
            const itemRemoved = oldCopy[0];
            // remove item from filters
            setFilters((prevFilters: Filters) => {
              removeFilterValue(prevFilters, itemRemoved);
              return prevFilters;
            })
          }
          setFilterMultiSelectNames(newVal);
        }}
        data={multiSelectValLabelRef}
      />

      {filterMultiSelectNames.map((attr: string) => (
        <TextInput key={attr}
          size="xs"
          value={getFilterValue(filters, attr)}
          onChange={e => {
            const val = e.currentTarget.value;
            if (val !== undefined) {
              setFilters((prevFilters: Filters) => {
                const newFilters: any = {...prevFilters}
                setFilterValue(newFilters, attr, val);
                return newFilters
              })
            }
          }}
          placeholder=""
          label={multiSelectValLabelRef.filter(x => x.value == attr)[0].label}
          required
        />
      ))}
    </>
  );
}