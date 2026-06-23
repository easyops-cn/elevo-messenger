import React, { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Icon, Icons, Text } from 'folds';
import { CircleAlertIcon } from '../../../icons/CircleAlertIcon';
import { LoaderCircleIcon } from '../../../icons/LoaderCircleIcon';
import * as css from './ReasoningCard.css';

type ReasoningCardProps = {
  style?: CSSProperties;
  children: ReactNode;
  durationMs?: number;
  streaming?: boolean;
  empty?: boolean;
  expanded: boolean;
  loading?: boolean;
  error?: string;
  onToggle?: () => void;
};
export function ReasoningCard({
  style,
  children,
  durationMs,
  streaming,
  empty,
  expanded,
  loading,
  error,
  onToggle,
}: ReasoningCardProps) {
  const { t } = useTranslation();
  const interactive = !empty && !!onToggle;

  const label =
    typeof durationMs === 'number'
      ? t('message.thought_for_seconds', { seconds: Math.max(1, Math.round(durationMs / 1000)) })
      : streaming
        ? t('message.thinking')
        : t('message.thought');

  return (
    <Box className={css.ReasoningWrapper} style={style} direction="Column" gap="100">
      <div
        className={interactive ? css.ReasoningToggle : css.ReasoningToggleEmpty}
        onClick={interactive ? onToggle : undefined}
        onKeyDown={
          interactive
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggle();
                }
              }
            : undefined
        }
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-busy={loading || undefined}
      >
        <Text priority="300" size="T300">
          {label}
        </Text>
        {!empty && loading && (
          <Icon src={LoaderCircleIcon} size="100" className={css.ReasoningStatusSpinner} />
        )}
        {!empty && !loading && error && (
          <span title={error}>
            <Icon src={CircleAlertIcon} size="100" className={css.ReasoningStatusError} />
          </span>
        )}
        {!empty && !loading && !error && (
          <Icon src={expanded ? Icons.ChevronBottom : Icons.ChevronRight} size="100" />
        )}
      </div>
      {expanded && !empty && children}
    </Box>
  );
}
