import { Button, Modal, Space } from '@mantine/core';

import { FeedState, removeFeedFromDB } from './database'
import { removeItemSelection } from "./ItemList";

export function RemoveFeedModal({opened, setOpened, feedState, setFeedState}: any) {

  function removeFeed() {
    const id = feedState._currentFeedId;

    removeFeedFromDB(id);

    setFeedState((prevState: FeedState) => {
      const feeds = prevState.feeds;
      for (let i=0; i < feeds.length; i++) {
        if (feeds[i].id === id) {
          feeds.splice(i, 1);
          break;
        }
      }
      return {
        ...prevState,
        feeds: feeds,
        _currentFeedId: null,
        currentFeedEntries: [],
        _currentFeedEntryId: null,
        currentFeedEntryContent: "",
      };
    })
    removeItemSelection("feed");

    setOpened(false);
  }

  return (
    <Modal
      opened={opened}
      onClose={() => setOpened(false)}
      title="Confirm you want to delete this feed"
    >
      <Space h="lg" />

      <div className='flex justify-center'>
        <Button onClick={removeFeed} size="xs">
          Confirm
        </Button>
      </div>

      <Space h="lg" />
    </Modal>
  );
}