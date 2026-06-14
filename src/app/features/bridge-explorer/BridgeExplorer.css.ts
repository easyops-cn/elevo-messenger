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

export const ViewerContent = style([
  DefaultReset,
  {
    flexGrow: 1,
    minHeight: 0,
    backgroundColor: color.Background.Container,
  },
]);

export const TextViewer = style([
  DefaultReset,
  {
    width: '100%',
    height: '100%',
    minHeight: 0,
  },
]);

export const SegmentedControl = style([
  DefaultReset,
  {
    display: 'flex',
    overflow: 'hidden',
    borderWidth: config.borderWidth.B300,
    borderStyle: 'solid',
    borderColor: color.Surface.ContainerLine,
    borderRadius: config.radii.R300,
    backgroundColor: color.Surface.Container,
  },
]);

export const SegmentedButton = style([
  DefaultReset,
  {
    height: toRem(24),
    paddingInline: config.space.S300,
    border: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
    color: color.Surface.OnContainer,
    font: 'inherit',
    fontSize: toRem(12),
    cursor: 'pointer',
    selectors: {
      '&:hover': {
        backgroundColor: color.Surface.ContainerHover,
      },
      '&[aria-pressed="true"]': {
        backgroundColor: color.Primary.Container,
        color: color.Primary.OnContainer,
      },
      '& + &': {
        borderLeftWidth: config.borderWidth.B300,
        borderLeftStyle: 'solid',
        borderLeftColor: color.Surface.ContainerLine,
      },
    },
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

export const MarkdownPreview = style([
  DefaultReset,
  {
    width: '100%',
    maxWidth: toRem(920),
    marginInline: 'auto',
    padding: config.space.S500,
    fontSize: toRem(14),
    lineHeight: '1.65',
  },
]);

globalStyle(`${MarkdownPreview} > :first-child`, {
  marginTop: 0,
});

globalStyle(`${MarkdownPreview} > :last-child`, {
  marginBottom: 0,
});

globalStyle(`${MarkdownPreview} h1, ${MarkdownPreview} h2, ${MarkdownPreview} h3`, {
  marginBlock: `${config.space.S500} ${config.space.S200}`,
  lineHeight: 1.25,
});

globalStyle(`${MarkdownPreview} h1`, {
  fontSize: toRem(28),
});

globalStyle(`${MarkdownPreview} h2`, {
  fontSize: toRem(22),
});

globalStyle(`${MarkdownPreview} h3`, {
  fontSize: toRem(18),
});

globalStyle(
  `${MarkdownPreview} p, ${MarkdownPreview} ul, ${MarkdownPreview} ol, ${MarkdownPreview} blockquote`,
  {
    marginBlock: config.space.S300,
  },
);

globalStyle(`${MarkdownPreview} ul, ${MarkdownPreview} ol`, {
  paddingInlineStart: config.space.S500,
});

globalStyle(`${MarkdownPreview} li + li`, {
  marginTop: config.space.S100,
});

globalStyle(`${MarkdownPreview} a`, {
  color: color.Primary.Main,
});

globalStyle(`${MarkdownPreview} blockquote`, {
  paddingInlineStart: config.space.S300,
  borderLeftWidth: config.borderWidth.B400,
  borderLeftStyle: 'solid',
  borderLeftColor: color.Surface.ContainerLine,
  color: color.Surface.OnContainer,
});

globalStyle(`${MarkdownPreview} code`, {
  paddingInline: config.space.S100,
  borderRadius: config.radii.R300,
  backgroundColor: color.Surface.Container,
  fontFamily: 'monospace',
  fontSize: '0.92em',
});

globalStyle(`${MarkdownPreview} pre`, {
  overflowX: 'auto',
  padding: config.space.S300,
  borderRadius: config.radii.R300,
  backgroundColor: color.Surface.Container,
});

globalStyle(`${MarkdownPreview} pre code`, {
  padding: 0,
  backgroundColor: 'transparent',
});

globalStyle(`${MarkdownPreview} table`, {
  width: '100%',
  borderCollapse: 'collapse',
  marginBlock: config.space.S300,
});

globalStyle(`${MarkdownPreview} th, ${MarkdownPreview} td`, {
  padding: config.space.S200,
  borderWidth: config.borderWidth.B300,
  borderStyle: 'solid',
  borderColor: color.Surface.ContainerLine,
  textAlign: 'left',
});

globalStyle(`${MarkdownPreview} img`, {
  maxWidth: '100%',
  height: 'auto',
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
