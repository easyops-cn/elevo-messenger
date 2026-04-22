import { Box, Icon, IconSrc } from 'folds';
import React, { ReactNode, useState } from 'react';
import { useHover } from 'react-aria';
import { BubbleLayout, CompactLayout, ModernLayout } from '..';
import { MessageLayout } from '../../../state/settings';
import { elevoColor } from '../../../../config.css';

export type EventContentProps = {
  messageLayout: number;
  time: ReactNode;
  iconSrc: IconSrc;
  content: ReactNode;
};
export function EventContent({ messageLayout, time, iconSrc, content }: EventContentProps) {
  const [hover, setHover] = useState(false);
  const { hoverProps } = useHover({ onHoverChange: setHover });

  const timeStyle: React.CSSProperties =
    messageLayout !== MessageLayout.Compact
      ? { opacity: hover ? 1 : 0, transition: 'opacity 150ms' }
      : {};

  const beforeJSX = (
    <Box gap="300" justifyContent="SpaceBetween" alignItems="Center" grow="Yes">
      {messageLayout === MessageLayout.Compact && time}
      <Box
        grow={messageLayout === MessageLayout.Compact ? undefined : 'Yes'}
        alignItems="Center"
        justifyContent="Center"
      >
        <Icon style={{ opacity: 0.35 }} size="50" src={iconSrc} />
      </Box>
    </Box>
  );

  const msgContentJSX = (
    <Box justifyContent="SpaceBetween" alignItems="Baseline" gap="200" style={{
      color: elevoColor.Text.Muted,
    }}>
      {content}
      {messageLayout !== MessageLayout.Compact && <span style={timeStyle}>{time}</span>}
    </Box>
  );

  if (messageLayout === MessageLayout.Compact) {
    return <CompactLayout before={beforeJSX}>{msgContentJSX}</CompactLayout>;
  }
  if (messageLayout === MessageLayout.Bubble) {
    return (
      <BubbleLayout hideBubble before={beforeJSX} {...hoverProps}>
        {msgContentJSX}
      </BubbleLayout>
    );
  }
  return (
    <ModernLayout before={beforeJSX} {...hoverProps}>
      {msgContentJSX}
    </ModernLayout>
  );
}
