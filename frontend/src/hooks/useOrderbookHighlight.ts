import { useEffect, useRef, useState } from "react";
import { Level } from "./useOrderbook";

export const useOrderbookHighlight = (level: Level, isOrderbookFirstRender: boolean) => {
  const prevLevelRef = useRef<Level>();
  const [highlight, setHighlight] = useState(false);

  useEffect(() => {
    // Compare the previous level size with the current one
    const prevLevel = prevLevelRef.current;
    if (!isOrderbookFirstRender && level.size !== prevLevel?.size) {
      setHighlight(true);
      const timeoutId = setTimeout(() => setHighlight(false), 500);
      prevLevelRef.current = level;
      return () => clearTimeout(timeoutId);
    }
    // Update the ref to the current token after handling the potential update
    prevLevelRef.current = level;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level.size]); // Only re-run the effect if the level size changes

  return highlight;
};
