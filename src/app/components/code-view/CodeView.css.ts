import { globalStyle, style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';
import { elevoColor } from '../../../config.css';

const border = `${config.borderWidth.B300} solid ${elevoColor.Border.Light}`;

export const CodeView = style([
  DefaultReset,
  {
    height: '100%',
    minHeight: 0,
    backgroundColor: color.Background.Container,
    color: color.Background.OnContainer,
  },
]);

export const Header = style([
  DefaultReset,
  {
    minHeight: toRem(56),
    padding: `${config.space.S200} ${config.space.S300}`,
    borderBottom: border,
    flexShrink: 0,
    gap: config.space.S300,
  },
]);

export const HeaderTitle = style({
  minWidth: 0,
});

export const HeaderMeta = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: config.space.S200,
  flexShrink: 0,
});

export const LineCount = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: config.space.S100,
  fontFamily: 'monospace',
  fontSize: toRem(12),
  lineHeight: toRem(18),
  whiteSpace: 'nowrap',
});

export const Added = style({
  color: color.Success.Main,
});

export const Deleted = style({
  color: color.Critical.Main,
});

export const Content = style({
  minHeight: 0,
});

export const ScrollContent = style({
  padding: config.space.S300,
});

export const FileList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: config.space.S300,
});

export const FilePanel = style({
  border,
  borderRadius: config.radii.R300,
  backgroundColor: color.SurfaceVariant.Container,
  overflow: 'hidden',
});

export const FileHeader = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: config.space.S200,
  width: '100%',
  padding: `${config.space.S200} ${config.space.S300}`,
  border: 0,
  backgroundColor: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  selectors: {
    '&:hover': {
      backgroundColor: color.SurfaceVariant.ContainerHover,
    },
    '&:active': {
      backgroundColor: color.SurfaceVariant.ContainerActive,
    },
    '&:focus-visible': {
      outline: `${config.borderWidth.B300} solid ${color.Primary.Main}`,
      outlineOffset: toRem(-2),
    },
  },
});

export const FilePath = style({
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  textAlign: 'left',
  fontFamily: 'monospace',
});

export const FileMeta = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: config.space.S200,
  color: elevoColor.Text.Secondary,
});

export const CodeBlock = style({
  borderTop: border,
  overflowX: 'auto',
  backgroundColor: color.Background.Container,
});

export const Empty = style({
  height: '100%',
  minHeight: toRem(180),
});

globalStyle(`${CodeBlock} pre.shiki`, {
  margin: 0,
  padding: `${config.space.S200} 0`,
  minWidth: 'fit-content',
  backgroundColor: `${color.Background.Container} !important`,
  fontFamily: 'monospace',
  fontSize: toRem(13),
  lineHeight: toRem(20),
});

globalStyle(`${CodeBlock} pre.shiki code`, {
  display: 'block',
});

globalStyle(`${CodeBlock} pre.shiki .line`, {
  display: 'inline',
  minHeight: toRem(20),
  padding: `0 ${config.space.S300}`,
  whiteSpace: 'pre',
});
