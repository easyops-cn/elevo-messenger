import React, { ReactNode } from 'react';
import { useMatch } from 'react-router-dom';
import { Box } from 'folds';
import { ScreenSize, useScreenSizeContext } from '../hooks/useScreenSize';
import { BottomNav } from './client/BottomNav';

type MobileFriendlyPageNavProps = {
  path: string;
  hiddenOnMobile?: boolean;
  children: ReactNode;
};
export function MobileFriendlyPageNav({
  path,
  hiddenOnMobile,
  children,
}: MobileFriendlyPageNavProps) {
  const screenSize = useScreenSizeContext();
  const exactPath = useMatch({
    path,
    caseSensitive: true,
    end: true,
  });
  const isMobile = screenSize === ScreenSize.Mobile;

  if (isMobile && (hiddenOnMobile || !exactPath)) {
    return null;
  }

  return (
    <Box direction="Column" grow={isMobile ? 'Yes' : undefined} shrink={isMobile ? 'Yes' : 'No'}>
      {children}
      <BottomNav />
    </Box>
  );
}
