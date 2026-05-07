import React, { CSSProperties, ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Icon, Icons, Text } from 'folds';
import * as css from './ReasoningCard.css';

type ReasoningCardProps = { style?: CSSProperties; children: ReactNode };
export function ReasoningCard({ style, children }: ReasoningCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <Box
      className={css.ReasoningWrapper}
      style={style}
      direction="Column"
      gap="100"
    >
      <div
        className={css.ReasoningToggle}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <Text priority="300" size="T300">{t('message.thinking')}</Text>
        <Icon src={expanded ? Icons.ChevronBottom : Icons.ChevronRight} size="100" />
      </div>
      {expanded && children}
    </Box>
  );
}
