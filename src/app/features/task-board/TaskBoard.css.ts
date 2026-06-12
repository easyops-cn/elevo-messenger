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

/* ---- Kanban board ---- */

export const BoardScroll = style([
  DefaultReset,
  {
    width: '100%',
    height: '100%',
    overflowX: 'auto',
    overflowY: 'hidden',
  },
]);

export const Board = style([
  DefaultReset,
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: config.space.S300,
    padding: config.space.S300,
    height: '100%',
    minWidth: toRem(960),
  },
]);

export const Column = style([
  DefaultReset,
  {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    minWidth: toRem(220),
    borderRadius: config.radii.R400,
    borderWidth: config.borderWidth.B300,
    borderStyle: 'solid',
    borderColor: color.Surface.ContainerLine,
    backgroundColor: color.Surface.Container,
  },
]);

export const ColumnHeader = style([
  DefaultReset,
  {
    display: 'flex',
    alignItems: 'center',
    gap: config.space.S200,
    height: toRem(36),
    flexShrink: 0,
    paddingInline: config.space.S200,
    borderBottomWidth: config.borderWidth.B300,
    borderBottomStyle: 'solid',
    borderBottomColor: color.Surface.ContainerLine,
    backgroundColor: color.Background.Container,
    borderTopLeftRadius: config.radii.R400,
    borderTopRightRadius: config.radii.R400,
  },
]);

export const ColumnCount = style([
  DefaultReset,
  {
    marginLeft: 'auto',
  },
]);

export const ColumnBody = style([
  DefaultReset,
  {
    display: 'flex',
    flexDirection: 'column',
    gap: config.space.S200,
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: config.space.S200,
  },
]);

/* status icon tones (applied to folds Icon via currentColor) */
export const ColumnIcon = style([DefaultReset, { flexShrink: 0 }]);

export const toneBacklog = style({ color: color.Secondary.Main });
export const tonePlanned = style({ color: color.Primary.Main });
export const toneInProgress = style({ color: color.Warning.Main });
export const toneCompleted = style({ color: color.Success.Main });

/* ---- Task card ---- */

export const TaskCard = style([
  DefaultReset,
  {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    cursor: 'pointer',
    padding: config.space.S300,
    borderRadius: config.radii.R400,
    borderWidth: config.borderWidth.B300,
    borderStyle: 'solid',
    borderColor: color.Surface.ContainerLine,
    backgroundColor: color.Surface.Container,
    color: color.Surface.OnContainer,
    selectors: {
      '&:hover': { backgroundColor: color.Surface.ContainerHover },
      '&:focus-visible': {
        outline: `${config.borderWidth.B400} solid ${color.Primary.Main}`,
      },
    },
  },
]);

export const ClampTwo = style({
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

export const ClampThree = style({
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

/* ---- Detail dialog ---- */

export const DialogContent = style([
  DefaultReset,
  {
    display: 'flex',
    flexDirection: 'column',
    width: toRem(960),
    maxWidth: 'calc(100vw - 48px)',
    height: 'calc(100vh - 48px)',
    maxHeight: 'none',
    backgroundColor: color.Surface.Container,
    color: color.Surface.OnContainer,
  },
]);

export const DialogHeader = style([
  DefaultReset,
  {
    display: 'flex',
    alignItems: 'flex-start',
    gap: config.space.S200,
    padding: config.space.S400,
    borderBottomWidth: config.borderWidth.B300,
    borderBottomStyle: 'solid',
    borderBottomColor: color.Surface.ContainerLine,
    flexShrink: 0,
  },
]);

export const DialogBody = style([
  DefaultReset,
  {
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: config.space.S400,
  },
]);

export const MetaGrid = style([
  DefaultReset,
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: config.space.S300,
    padding: config.space.S300,
    borderRadius: config.radii.R400,
    backgroundColor: color.SurfaceVariant.Container,
    marginBottom: config.space.S400,
  },
]);

export const MetaItem = style([DefaultReset, { minWidth: 0 }]);

export const DocSection = style([
  DefaultReset,
  {
    borderRadius: config.radii.R400,
    borderWidth: config.borderWidth.B300,
    borderStyle: 'solid',
    borderColor: color.Surface.ContainerLine,
    marginBottom: config.space.S300,
    overflow: 'hidden',
  },
]);

export const DocHeader = style([
  DefaultReset,
  {
    display: 'flex',
    alignItems: 'center',
    gap: config.space.S200,
    width: '100%',
    paddingInline: config.space.S300,
    height: toRem(40),
    flexShrink: 0,
    backgroundColor: color.SurfaceVariant.Container,
    color: color.SurfaceVariant.OnContainer,
    selectors: {
      '&:hover': { backgroundColor: color.SurfaceVariant.ContainerHover },
    },
  },
]);

export const DocToggle = style([
  DefaultReset,
  {
    display: 'flex',
    alignItems: 'center',
    gap: config.space.S200,
    flexGrow: 1,
    minWidth: 0,
    height: '100%',
    cursor: 'pointer',
    color: 'inherit',
    textAlign: 'left',
    selectors: {
      '&:focus-visible': {
        outline: `${config.borderWidth.B400} solid ${color.Primary.Main}`,
        outlineOffset: toRem(-2),
      },
    },
  },
]);

export const DocChevron = style({
  transition: 'transform 100ms ease',
  flexShrink: 0,
});

export const DocChevronCollapsed = style({
  transform: 'rotate(-90deg)',
});

export const DocBody = style([
  DefaultReset,
  {
    padding: config.space.S400,
    backgroundColor: color.Surface.Container,
  },
]);

export const Markdown = style([
  DefaultReset,
  {
    fontSize: toRem(14),
    lineHeight: 1.6,
    wordBreak: 'break-word',
  },
]);

globalStyle(`${Markdown} pre`, {
  overflow: 'auto',
  padding: config.space.S300,
  borderRadius: config.radii.R300,
  backgroundColor: color.SurfaceVariant.Container,
  fontSize: toRem(13),
});

globalStyle(`${Markdown} code`, {
  fontFamily: 'monospace',
  fontSize: '0.9em',
});

globalStyle(`${Markdown} :not(pre) > code`, {
  padding: `0 ${toRem(4)}`,
  borderRadius: config.radii.R300,
  backgroundColor: color.SurfaceVariant.Container,
});

globalStyle(`${Markdown} a`, {
  color: color.Primary.Main,
  textDecoration: 'underline',
});

globalStyle(`${Markdown} p`, {
  margin: `0 0 ${config.space.S200} 0`,
});

globalStyle(`${Markdown} > *:last-child`, {
  marginBottom: 0,
});

globalStyle(`${Markdown} ul, ${Markdown} ol`, {
  paddingLeft: toRem(20),
  margin: `0 0 ${config.space.S200} 0`,
});
