import { HorizontalContainer } from "./HorizontalContainer";

export function FeedEntryContentContainer({feedState}: any) {
  return (
    <HorizontalContainer
      topBar={""}
      content={
        <>
          <style>{`
              a {
                color: darkblue;
                text-decoration-line: underline;
                text-decoration-style: wavy;
              }
          `}</style>
          <div
            className="p-3 select-text text-sm"
            dangerouslySetInnerHTML={{ __html: feedState.currentFeedEntryContent }}
          />
        </>
      }
    />
  );
}