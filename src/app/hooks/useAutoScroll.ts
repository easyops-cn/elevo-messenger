import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

export function useAutoScroll(
  scrollContainerRef: RefObject<HTMLDivElement>,
  scrollContentRef: RefObject<HTMLDivElement>
) {
  const detectScrolledUpRef = useRef(false);
  const manualScrolledRef = useRef(false);
  const [scrollable, setScrollable] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const disableScrollUpDetectionForAWhile = useCallback((delay?: number) => {
    detectScrolledUpRef.current = false;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      detectScrolledUpRef.current = true;
    }, delay ?? 200);
  }, []);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const contentContainer = scrollContentRef.current;
    if (manualScrolledRef.current || !scrollContainer || !contentContainer) {
      return;
    }

    const handleScroll = () => {
      setScrollable(
        scrollContainer.scrollTop + scrollContainer.clientHeight + 24 <
          scrollContainer.scrollHeight
      );
      if (!detectScrolledUpRef.current) {
        return;
      }
      manualScrolledRef.current =
        scrollContainer.scrollTop + scrollContainer.clientHeight + 6 <
        scrollContainer.scrollHeight;
    };
    scrollContainer.addEventListener("scroll", handleScroll);

    const observer = new ResizeObserver(() => {
      if (manualScrolledRef.current) {
        return;
      }
      detectScrolledUpRef.current = false;
      // Scroll to the bottom of the content container
      scrollContainer.scrollTo({
        top: contentContainer.scrollHeight,
        behavior: "instant",
      });
      disableScrollUpDetectionForAWhile();
    });
    observer.observe(contentContainer);

    return () => {
      observer.disconnect();
      scrollContainer.removeEventListener("scroll", handleScroll);
    };
    // Auto scroll after the conversation becomes available
  }, [disableScrollUpDetectionForAWhile, scrollContainerRef, scrollContentRef]);

  const scrollToBottom = useCallback((behavior?: "auto" | "smooth" | "instant") => {
    manualScrolledRef.current = false;
    detectScrolledUpRef.current = false;
    const scrollContainer = scrollContainerRef.current;
    scrollContainer?.scrollTo({
      top: scrollContainer?.scrollHeight,
      behavior: behavior ?? "instant",
    });
    disableScrollUpDetectionForAWhile();
  }, [scrollContainerRef, disableScrollUpDetectionForAWhile]);

  const toggleAutoScroll = useCallback((enabled: boolean, resetDelay?: number) => {
    manualScrolledRef.current = !enabled;
    if (!enabled) {
      disableScrollUpDetectionForAWhile(resetDelay);
    }
  }, [disableScrollUpDetectionForAWhile]);

  return { scrollable, scrollToBottom, toggleAutoScroll };
}