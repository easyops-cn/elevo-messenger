import { style, keyframes } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

const cardBorder = `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`;

const shimmer = keyframes({
  '0%': { backgroundPosition: '200% center' },
  '100%': { backgroundPosition: '-200% center' },
});

export const ToolCallHeaderShimmer = style({
  backgroundSize: '200% auto',
  backgroundImage: `linear-gradient(
    90deg,
    ${color.SurfaceVariant.OnContainer} 0%,
    ${color.SurfaceVariant.OnContainer} 40%,
    ${color.SurfaceVariant.Container} 50%,
    ${color.SurfaceVariant.OnContainer} 60%,
    ${color.SurfaceVariant.OnContainer} 100%
  )`,
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  animation: `${shimmer} 3s linear infinite 1s`,
});

export const ToolCallHeader = style({
  backgroundColor: color.SurfaceVariant.Container,
  color: color.SurfaceVariant.OnContainer,
  border: cardBorder,
  borderRadius: config.radii.R300,
  padding: `${config.space.S100} ${config.space.S200}`,
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
  cursor: 'pointer',
  width: 'fit-content',
  maxWidth: '100%',
});

export const ToolCallBody = style({
  backgroundColor: color.SurfaceVariant.Container,
  border: cardBorder,
  borderRadius: config.radii.R300,
  padding: `${config.space.S200} ${config.space.S300}`,
  width: 'fit-content',
  maxWidth: toRem(600),
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
