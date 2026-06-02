import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
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

export const CodeViewModal = style({
  width: '85vw',
  maxWidth: toRem(1200),
  minHeight: '90vh',
});

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

export const HeaderIcon = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: color.Primary.Main,
  flexShrink: 0,
  lineHeight: 0,
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
  borderRadius: config.radii.R400,
  backgroundColor: color.SurfaceVariant.Container,
  overflow: 'clip',
});

export const FileHeader = style({
  position: 'sticky',
  top: 0,
  zIndex: 1,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: config.space.S200,
  width: '100%',
  padding: `${config.space.S200} ${config.space.S300}`,
  border: 0,
  borderBottom: border,
  backgroundColor: color.SurfaceVariant.Container,
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
  overflowX: 'auto',
  backgroundColor: color.Background.Container,
});

export const CodePre = style({
  margin: 0,
  padding: `${config.space.S200} 0`,
  minWidth: 'fit-content',
  backgroundColor: color.Background.Container,
  fontFamily: 'monospace',
  fontSize: toRem(13),
  lineHeight: toRem(20),
});

export const CodeGrid = style({
  display: 'block',
});

export const CodeLine = recipe({
  base: {
    display: 'grid',
    minHeight: toRem(20),
  },
  variants: {
    lineNumbers: {
      true: {
        gridTemplateColumns: `${toRem(52)} ${toRem(52)} minmax(max-content, 1fr)`,
      },
      false: {
        gridTemplateColumns: 'minmax(max-content, 1fr)',
      },
    },
    diff: {
      add: {
        backgroundColor: 'color-mix(in srgb, #2da44e 16%, transparent)',
      },
      delete: {
        backgroundColor: 'color-mix(in srgb, #cf222e 14%, transparent)',
      },
      context: {},
    },
  },
});

export const HunkHeader = recipe({
  base: {
    display: 'grid',
    minHeight: toRem(28),
    alignItems: 'center',
    backgroundColor: color.SurfaceVariant.Container,
    color: elevoColor.Text.Secondary,
    borderTop: border,
    borderBottom: border,
  },
  variants: {
    lineNumbers: {
      true: {
        gridTemplateColumns: `${toRem(52)} ${toRem(52)} minmax(max-content, 1fr)`,
      },
      false: {
        gridTemplateColumns: 'minmax(max-content, 1fr)',
      },
    },
  },
});

export const LineNumber = style({
  padding: `0 ${config.space.S200}`,
  color: elevoColor.Text.Secondary,
  textAlign: 'right',
  userSelect: 'none',
  borderRight: border,
});

export const LineCode = style({
  padding: `0 ${config.space.S300}`,
  whiteSpace: 'pre',
});

export const NoCode = style({
  display: 'block',
  padding: `${config.space.S300}`,
});

export const Empty = style({
  height: '100%',
  minHeight: toRem(180),
});
