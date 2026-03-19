import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

function useViewportBelow(breakpoint: number) {
  const getMatches = React.useCallback(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < breakpoint;
  }, [breakpoint]);

  const [matches, setMatches] = React.useState<boolean>(getMatches);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => setMatches(getMatches());

    onChange();
    mql.addEventListener("change", onChange);
    window.addEventListener("resize", onChange);

    return () => {
      mql.removeEventListener("change", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, [breakpoint, getMatches]);

  return matches;
}

export function useIsMobile() {
  return useViewportBelow(MOBILE_BREAKPOINT);
}

export function useIsTablet() {
  const isMobile = useIsMobile();
  const isTabletWidth = useViewportBelow(TABLET_BREAKPOINT);
  return isTabletWidth && !isMobile;
}
