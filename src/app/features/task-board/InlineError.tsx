import React, { useCallback } from 'react';
import { Box, Button, Icon, Icons, Text } from 'folds';
import { useTranslation } from 'react-i18next';
import { TaskApiError } from './api';
import * as css from './TaskBoard.css';

/** Map an error to a human-friendly message, honoring HTTP status when present. */
export function useErrorMessage(): (error: unknown) => string {
  const { t } = useTranslation();
  return useCallback(
    (error: unknown): string => {
      if (error instanceof TaskApiError) {
        switch (error.status) {
          case 401:
            return t('taskBoard.error401');
          case 403:
            return t('taskBoard.error403');
          case 404:
            return t('taskBoard.error404');
          case 502:
          case 0:
            return t('taskBoard.error502');
          default:
            return error.message || t('taskBoard.errorGeneric');
        }
      }
      if (error instanceof Error) return error.message;
      return t('taskBoard.errorGeneric');
    },
    [t],
  );
}

type InlineErrorProps = {
  message: string;
  onRetry?: () => void;
};

export function InlineError({ message, onRetry }: InlineErrorProps) {
  const { t } = useTranslation();
  return (
    <Box className={css.InlineError} direction="Column">
      <Box alignItems="Center" gap="200">
        <Icon size="100" src={Icons.Warning} />
        <Text size="T300">{message}</Text>
      </Box>
      {onRetry && (
        <Box>
          <Button size="300" variant="Critical" fill="Soft" radii="300" onClick={onRetry}>
            <Text size="B300">{t('taskBoard.retry')}</Text>
          </Button>
        </Box>
      )}
    </Box>
  );
}
