import React from "react";
import { THEME } from "@excalidraw/common";
import { GamifyBoardIcon } from "./GamifyBoardIcon";

export const GamifyBoardLogo: React.FC<{ theme?: Theme }> = ({ theme }) => {
  const textColor = theme === THEME.DARK ? "white" : "black";

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <GamifyBoardIcon theme={theme} />
      <span style={{ marginLeft: "8px", fontFamily: "'Baloo 2', sans-serif", fontSize: "24px", color: textColor }}>
        GamifyBoard
      </span>
    </div>
  );
};