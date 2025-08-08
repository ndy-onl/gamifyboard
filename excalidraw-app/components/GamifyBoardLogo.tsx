import React from "react";
import { THEME } from "@excalidraw/common";

export const GamifyBoardLogo: React.FC<{ theme?: Theme }> = ({ theme }) => {
  const logoColor = theme === THEME.DARK ? "#e6fafa" : "#1a4d4d";

  return (
    <svg
      width="544"
      height="472"
      viewBox="0 0 544 472"
      fill={logoColor}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="m 438.49277,242.30083 -136.24246,235.9784 136.24246,235.9784 h 272.48345 l 135.5834,-234.837 H 574.73441 v 79.7492 h 134.07591 l -43.687,75.6673 H 484.3455 l -90.38896,-156.5579 90.38896,-156.5579 h 180.77782 l 45.1946,78.2789 h 91.7063 l -91.048,-157.6994 z" />
    </svg>
  );
};