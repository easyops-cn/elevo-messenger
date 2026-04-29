import React from 'react';
import { Box, Spinner } from 'folds';

export function PaeSpinner() {
  return (
    <Box grow="Yes" alignItems="Center" justifyContent="Center">
      <Spinner variant="Secondary" size="600" />
    </Box>
  );
}
