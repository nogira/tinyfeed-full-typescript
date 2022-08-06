export function HorizontalContainer(props: any) {
  const topBarHeight = 40;
  const contentHeight = window.innerHeight - topBarHeight;
  const BORDER = "1px solid #DDD9D5";

  const topBarStyles = {
    height: topBarHeight,
    backgroundColor: '#FBF8F4',
    borderTop: BORDER,
    borderBottom: BORDER,
  }
  const contentStyles = {
    height: contentHeight
  }
  const containerStyles: any = {
    borderLeft: BORDER,
  }
  if (props.width) {
    containerStyles.width = props.width;
    containerStyles.minWidth = props.width;
    containerStyles.maxWidth = props.width;
  }
  
  return (
    <div className="w-screen" style={containerStyles} hidden={props.hidden}>
      <div style={topBarStyles}>
        {props.topBar}
      </div>
      <div className="overflow-scroll" style={contentStyles}>
        {props.content}
      </div>
    </div>
  );
}