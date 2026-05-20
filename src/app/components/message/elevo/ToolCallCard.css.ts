import { keyframes, style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';
import { elevoColor } from '../../../../config.css';

const cardBorder = `${config.borderWidth.B300} solid ${elevoColor.Border.Light}`;

export const ToolCallHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
  cursor: 'pointer',
  width: 'fit-content',
  maxWidth: '100%',
});

export const ToolCallHeaderIcon = style({
  width: toRem(8),
  height: toRem(8),
  borderRadius: '50%',
  flexShrink: 0,
});

export const ToolCallHeaderIconCompleted = style({
  backgroundColor: color.Success.Main,
});

export const ToolCallHeaderIconFailed = style({
  backgroundColor: color.Critical.Main,
});

const toolCallSpinner = keyframes({
  to: { transform: 'rotate(360deg)' },
});

export const ToolCallHeaderIconInprogress = style({
  backgroundColor: 'transparent',
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export const ToolCallSpinnerSvg = style({
  position: 'absolute',
  width: toRem(8),
  height: toRem(8),
  animation: `${toolCallSpinner} 0.8s linear infinite`,
});

export const ToolCallSpinnerArc = style({
  fill: 'none',
  stroke: color.Primary.Main,
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeDasharray: '14.14',
  strokeDashoffset: 10,
});

export const ToolCallBody = style({
  backgroundColor: color.SurfaceVariant.Container,
  border: cardBorder,
  borderRadius: config.radii.R300,
  padding: `${config.space.S200} ${config.space.S300}`,
  marginBottom: config.space.S100,
  // maxWidth: toRem(600),
  width: '100%',
  overflow: 'hidden',
});

export const InlineRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S100,
});

export const InlineRowTop = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: config.space.S100,
});

export const InlineLabel = style({
  fontWeight: 500,
  fontSize: toRem(12),
  width: toRem(36),
  flexShrink: 0,
  lineHeight: toRem(18),
  color: elevoColor.Text.Muted,
});

export const InlineContent = style({
  fontFamily: 'monospace',
  fontSize: toRem(12),
  lineHeight: toRem(18),
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  margin: 0,
  minWidth: 0,
});

const outputLineHeight = toRem(18);

export const OutputCollapsed = style({
  fontFamily: 'monospace',
  fontSize: toRem(12),
  lineHeight: outputLineHeight,
  whiteSpace: 'pre',
  overflow: 'hidden',
  margin: 0,
  minWidth: 0,
  cursor: 'pointer',
});

export const OutputFade = style({
  position: 'relative',
  minWidth: 0,
  maxWidth: '100%',
  overflow: 'hidden',
  cursor: 'pointer',
  selectors: {
    '&::after': {
      content: '""',
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: outputLineHeight,
      background: `linear-gradient(transparent, ${color.SurfaceVariant.Container})`,
      pointerEvents: 'none',
    },
  },
});

export const OutputExpanded = style({
  fontFamily: 'monospace',
  fontSize: toRem(12),
  lineHeight: outputLineHeight,
  whiteSpace: 'pre',
  overflow: 'auto',
  margin: 0,
  minWidth: 0,
  cursor: 'pointer',
});

export const InlineDivider = style({
  borderTop: cardBorder,
  margin: `${config.space.S200} 0`,
});

export const Label = style({
  fontWeight: 500,
  marginBottom: config.space.S100,
});

export const Preformatted = style({
  fontFamily: 'monospace',
  fontSize: toRem(12),
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  margin: 0,
});

export const ErrorPre = style({
  fontFamily: 'monospace',
  fontSize: toRem(12),
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  margin: 0,
  color: color.Critical.Main,
});

export const Divider = style({
  borderTop: cardBorder,
  margin: `${config.space.S200} 0`,
});

export const TodoHeader = style({
  fontSize: toRem(13),
  marginBottom: config.space.S200,
});

export const TodoList = style({
  margin: 0,
  paddingLeft: 0,
  listStyle: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: config.space.S100,
});

export const TodoItem = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: config.space.S100,
});

export const TodoText = style({
  wordBreak: 'break-word',
});

export const TodoTextCompleted = style({
  wordBreak: 'break-word',
  textDecoration: 'line-through',
  opacity: 0.45,
});

export const ApplyPatchList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: config.space.S200,
});

export const ApplyPatchCard = style({
  backgroundColor: color.SurfaceVariant.Container,
  border: cardBorder,
  borderRadius: config.radii.R300,
  width: 'fit-content',
  maxWidth: toRem(600),
  overflow: 'hidden',
});

export const ApplyPatchHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
  padding: `${config.space.S100} ${config.space.S300}`,
  borderBottom: cardBorder,
  selectors: {
    '&:last-child': {
      borderBottom: 'none',
    },
  },
});

export const ApplyPatchHeaderNoBody = style({
  borderBottom: 'none',
});

export const ApplyPatchPath = style({
  fontFamily: 'monospace',
  fontSize: toRem(12),
  wordBreak: 'break-all',
  flex: 1,
  minWidth: 0,
});

export const ApplyPatchMoveTo = style({
  fontFamily: 'monospace',
  fontSize: toRem(12),
  opacity: 0.7,
  wordBreak: 'break-all',
});

export const ApplyPatchDiff = style({
  fontFamily: 'monospace',
  fontSize: toRem(13),
  lineHeight: toRem(20),
  margin: 0,
  padding: `${config.space.S200} 0`,
  maxHeight: toRem(210),
  overflow: 'auto',
});

export const ApplyPatchDiffLine = style({
  display: 'block',
  padding: `0 ${config.space.S300}`,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
});

export const ApplyPatchDiffLineAdded = style({
  backgroundColor: color.Success.Container,
  color: color.Success.OnContainer,
});

export const ApplyPatchDiffLineRemoved = style({
  backgroundColor: color.Critical.Container,
  color: color.Critical.OnContainer,
});

export const ApplyPatchDiffLineMeta = style({
  opacity: 0.7,
});
