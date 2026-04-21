import React, { ReactNode } from 'react';
import { Box, as } from 'folds';
import * as css from './layout.css';

type ModernLayoutProps = {
  isOwn?: boolean;
  before?: ReactNode;
  header?: ReactNode;
  beforeContent?: ReactNode;
  afterContent?: ReactNode;
};

export const ModernLayout = as<'div', ModernLayoutProps>(({ isOwn, before, header, beforeContent, afterContent, children, ...props }, ref) => (
  <Box gap="300" direction={isOwn ? 'RowReverse' : 'Row'} {...props} ref={ref}>
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
));
