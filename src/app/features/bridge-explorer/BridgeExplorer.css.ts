import { globalStyle, style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';

export const Shell = style([
  DefaultReset,
  {
    height: '100%',
    width: '100%',
    backgroundColor: color.Background.Container,
    color: color.Background.OnContainer,
  },
]);

export const Header = style([
  DefaultReset,
  {
    paddingInline: config.space.S300,
    height: toRem(44),
    flexShrink: 0,
    borderBottomWidth: config.borderWidth.B300,
    borderBottomStyle: 'solid',
    borderBottomColor: color.Surface.ContainerLine,
    gap: config.space.S200,
  },
]);

export const Body = style([
  DefaultReset,
  {
    flexGrow: 1,
    minHeight: 0,
  },
]);

export const Sidebar = style([
  DefaultReset,
  {
    width: toRem(280),
    flexShrink: 0,
    minWidth: 0,
    borderRightWidth: config.borderWidth.B300,
    borderRightStyle: 'solid',
    borderRightColor: color.Surface.ContainerLine,
    backgroundColor: color.Surface.Container,
  },
]);

export const Viewer = style([
  DefaultReset,
  {
    flexGrow: 1,
    minWidth: 0,
    minHeight: 0,
  },
]);

export const TreeScroll = style([DefaultReset, { flexGrow: 1, minHeight: 0 }]);

export const TreeList = style([DefaultReset, { padding: config.space.S100 }]);

export const TreeRow = style([
  DefaultReset,
  {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: config.space.S100,
    paddingInline: config.space.S100,
    paddingBlock: config.space.S100,
    borderRadius: config.radii.R300,
    cursor: 'pointer',
    textAlign: 'left',
    selectors: {
      '&:hover': { backgroundColor: color.Surface.ContainerHover },
      '&[aria-selected="true"]': {
        backgroundColor: color.Primary.Container,
        color: color.Primary.OnContainer,
      },
    },
  },
]);

export const TreeChildren = style([DefaultReset, {}]);

// Nudge the file icon slightly further right so files read as nested under
// folders even though they share the same row indent.
export const FileIconIndent = style([DefaultReset, { marginLeft: config.space.S100 }]);

export const ViewerContent = style([
  DefaultReset,
  {
    flexGrow: 1,
    minHeight: 0,
    backgroundColor: color.Background.Container,
  },
]);

export const Pre = style([
  DefaultReset,
  {
    margin: 0,
    padding: config.space.S300,
    fontFamily: 'monospace',
    fontSize: toRem(13),
    lineHeight: '1.5',
    whiteSpace: 'pre',
    tabSize: 2,
  },
]);

globalStyle(`${Pre} code`, {
  fontFamily: 'inherit',
});

export const MediaWrap = style([
  DefaultReset,
  {
    padding: config.space.S400,
    width: '100%',
    height: '100%',
    overflow: 'auto',
  },
]);

export const MediaImage = style([
  DefaultReset,
  { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' },
]);

export const Centered = style([
  DefaultReset,
  {
    height: '100%',
    width: '100%',
    padding: config.space.S700,
    textAlign: 'center',
  },
]);

export const InlineError = style([
  DefaultReset,
  {
    margin: config.space.S300,
    padding: config.space.S300,
    borderRadius: config.radii.R300,
    backgroundColor: color.Critical.Container,
    color: color.Critical.OnContainer,
    gap: config.space.S200,
  },
]);
