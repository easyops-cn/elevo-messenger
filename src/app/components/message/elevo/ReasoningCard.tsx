import React, { CSSProperties, ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Icon, Icons, Text } from 'folds';
import * as css from './ReasoningCard.css';

type ReasoningCardProps = {
  style?: CSSProperties;
  children: ReactNode;
  durationMs?: number;
  empty?: boolean;
};
export function ReasoningCard({ style, children, durationMs, empty }: ReasoningCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const label =
    typeof durationMs === 'number' && durationMs > 0
      ? t('message.thought_for_seconds', { seconds: Math.max(1, Math.round(durationMs / 1000)) })
      : t('message.thinking');

  return (
    <Box
      className={css.ReasoningWrapper}
      style={style}
      direction="Column"
      gap="100"
    >
      <div
        className={empty ? css.ReasoningToggleEmpty : css.ReasoningToggle}
        onClick={empty ? undefined : () => setExpanded((v) => !v)}
        onKeyDown={empty ? undefined : (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        role={empty ? undefined : 'button'}
        tabIndex={empty ? undefined : 0}
      >
        <Text priority="300" size="T300">{label}</Text>
        {!empty && <Icon src={expanded ? Icons.ChevronBottom : Icons.ChevronRight} size="100" />}
      </div>
      {(expanded || empty) && children}
    </Box>
  );
}
