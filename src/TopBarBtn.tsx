import { handleBtnHover } from "./handleBtnHover";
import { LIGHT_GRAY } from "./constants & types";

export function TopBarBtn({ onClick, children, className }: any) {
  return (
      <div onClick={onClick}
        className={"m-1.5 p-1 rounded" + (className ? ` ${className}` : "")}
        onMouseEnter={(e: any) => handleBtnHover(e, LIGHT_GRAY)}
        onMouseLeave={(e: any) => handleBtnHover(e, null)}
      >
        {children}
      </div>
  );
}