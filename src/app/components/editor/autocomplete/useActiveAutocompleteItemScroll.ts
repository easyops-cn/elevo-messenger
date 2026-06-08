import { useCallback, useEffect, useRef } from 'react';

export const useActiveAutocompleteItemScroll = <T extends HTMLElement>(
  activeIndex: number,
  itemCount: number,
) => {
  const itemRefs = useRef<Array<T | null>>([]);

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, itemCount);
    itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, itemCount]);

  return useCallback(
    (index: number) => (element: T | null) => {
      itemRefs.current[index] = element;
    },
    [],
  );
};
