import React, { ReactNode } from 'react';
import { Box } from 'folds';

type ClientLayoutProps = {
  children: ReactNode;
};
export function ClientLayout({ children }: ClientLayoutProps) {
  return <Box grow="Yes">{children}</Box>;
}
