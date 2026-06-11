import { createContext, useCallback, useContext, useState } from 'react';
import { useElementSizeObserver } from './useElementSizeObserver';

export const TABLET_BREAKPOINT = 1124;
export const MOBILE_BREAKPOINT = 750;
export const WIDE_DESKTOP_BREAKPOINT = 1600;

export enum ScreenSize {
  Desktop = 'Desktop',
  Tablet = 'Tablet',
  Mobile = 'Mobile',
}

export const getScreenSize = (width: number): ScreenSize => {
  if (width > TABLET_BREAKPOINT) return ScreenSize.Desktop;
  if (width > MOBILE_BREAKPOINT) return ScreenSize.Tablet;
  return ScreenSize.Mobile;
};

export const useScreenSize = (): ScreenSize => {
  const [size, setSize] = useState<ScreenSize>(getScreenSize(document.body.clientWidth));

  useElementSizeObserver(
    useCallback(() => document.body, []),
    useCallback((width) => setSize(getScreenSize(width)), []),
  );

  return size;
};

export const useScreenWidth = (): number => {
  const [width, setWidth] = useState<number>(document.body.clientWidth);

  useElementSizeObserver(
    useCallback(() => document.body, []),
    useCallback((clientWidth) => setWidth(clientWidth), []),
  );

  return width;
};

const ScreenSizeContext = createContext<ScreenSize | null>(null);
export const ScreenSizeProvider = ScreenSizeContext.Provider;

export const useScreenSizeContext = (): ScreenSize => {
  const screenSize = useContext(ScreenSizeContext);
  if (screenSize === null) {
    throw new Error('Screen size not provided!');
  }
  return screenSize;
};
