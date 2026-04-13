import React, { ReactNode } from 'react';
import { Box, as } from 'folds';
import * as css from './layout.css';

type ModernLayoutProps = {
  isOwn?: boolean;
  before?: ReactNode;
};

export const ModernLayout = as<'div', ModernLayoutProps>(({ isOwn, before, children, ...props }, ref) => (
  <Box gap="300" direction={isOwn ? 'RowReverse' : 'Row'} {...props} ref={ref}>
    <Box className={css.ModernBefore} shrink="No">
      {before}
    </Box>
    <Box grow="Yes" direction="Column">
      {children}
    </Box>
  </Box>
));
