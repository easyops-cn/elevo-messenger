import React, { ReactNode } from 'react';
import { Box, as, toRem } from 'folds';
import * as css from './layout.css';
import { ScreenSize, useScreenSize } from '../../../hooks/useScreenSize';

type ModernLayoutProps = {
  isOwn?: boolean;
  before?: ReactNode;
  header?: ReactNode;
  beforeContent?: ReactNode;
  afterContent?: ReactNode;
};

export const ModernLayout = as<'div', ModernLayoutProps>(({ isOwn, before, header, beforeContent, afterContent, children, ...props }, ref) => {
  const screenSize = useScreenSize();
  const isMobile = screenSize === ScreenSize.Mobile;
  const padding = isMobile ? 16 : 56;
  
  return (
    <Box gap="300" direction={isOwn ? 'RowReverse' : 'Row'} {...props} style={{
      ...props.style,
      width: `calc(100% - ${toRem(padding)})`,
      maxWidth: isMobile ? undefined : `max(50vw, ${toRem(800)})`,
      [isOwn ? 'marginLeft' : 'marginRight']: 'auto',
    }} ref={ref}>
      <Box className={css.ModernBefore} shrink="No">
        {before}
      </Box>
      <Box grow="Yes" direction="Column">
        {header}
        {beforeContent && (
          <Box alignSelf={isOwn ? 'End' : undefined} style={isOwn ? { maxWidth: '100%' } : undefined}>
            {beforeContent}
          </Box>
        )}
        <Box
          direction="Column"
          alignSelf={isOwn ? 'End' : undefined}
          style={isOwn ? { maxWidth: '100%' } : undefined}
        >
          {children}
        </Box>
        {afterContent && (
          <Box alignSelf={isOwn ? 'End' : undefined} style={isOwn ? { maxWidth: '100%' } : undefined}>
            {afterContent}
          </Box>
        )}
      </Box>
    </Box>
  );
});
