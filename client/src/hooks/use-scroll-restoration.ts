import { useEffect, type RefObject } from "react";
import { useLocation } from "wouter";

const scrollPositions = new Map<string, number>();

/**
 * Saves and restores scroll position per route.
 * Attach the ref to the scrollable container element.
 */
export function useScrollRestoration(ref: RefObject<HTMLElement | null>) {
  const [location] = useLocation();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Restore saved position for this route
    const saved = scrollPositions.get(location);
    if (saved !== undefined) {
      el.scrollTop = saved;
    } else {
      el.scrollTop = 0;
    }

    // Save position on scroll
    const onScroll = () => {
      scrollPositions.set(location, el.scrollTop);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      // Save final position on unmount
      scrollPositions.set(location, el.scrollTop);
      el.removeEventListener("scroll", onScroll);
    };
  }, [location, ref]);
}
