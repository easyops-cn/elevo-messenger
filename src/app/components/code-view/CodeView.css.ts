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

export const SplitContent = style({
  display: 'grid',
  gridTemplateColumns: `${toRem(320)} minmax(0, 1fr)`,
  width: '100%',
  height: '100%',
  minHeight: 0,
  '@media': {
    '(max-width: 760px)': {
      gridTemplateColumns: 'minmax(0, 1fr)',
      gridTemplateRows: `${toRem(168)} minmax(0, 1fr)`,
    },
  },
});

export const TreePane = style({
  minHeight: 0,
  borderRight: border,
  paddingLeft: config.space.S400,
  '@media': {
    '(max-width: 760px)': {
      borderRight: 0,
      borderBottom: border,
    },
  },
});

export const TreeContent = style({
  padding: `${config.space.S200} 0`,
});

export const TreeList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: config.space.S100,
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

export const TreeItem = style({
  minWidth: 0,
});

export const TreeFileIconAdded = style({
  color: color.Success.Main,
});

export const TreeFileIconDeleted = style({
  color: color.Critical.Main,
});

export const TreeDirectory = style({
  display: 'grid',
  gridTemplateColumns: `${toRem(20)} minmax(0, 1fr)`,
  alignItems: 'center',
  gap: config.space.S100,
  width: '100%',
  minHeight: toRem(28),
  padding: `0 ${config.space.S100} 0 calc(${config.space.S100} + var(--code-view-tree-item-indent, 0px))`,
  color: elevoColor.Text.Secondary,
});

export const TreeFileButton = recipe({
  base: {
    display: 'grid',
    gridTemplateColumns: `${toRem(20)} minmax(0, 1fr)`,
    alignItems: 'center',
    gap: config.space.S100,
    width: '100%',
    minHeight: toRem(30),
    padding: `0 ${config.space.S100} 0 calc(${config.space.S100} + var(--code-view-tree-item-indent, 0px))`,
    border: 0,
    borderRadius: config.radii.R300,
    backgroundColor: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    textAlign: 'left',
    selectors: {
      '&:hover': {
        backgroundColor: color.Surface.ContainerHover,
      },
      '&:active': {
        backgroundColor: color.Surface.ContainerActive,
      },
      '&:focus-visible': {
        outline: `${config.borderWidth.B300} solid ${color.Primary.Main}`,
        outlineOffset: toRem(1),
      },
    },
  },
  variants: {
    active: {
      true: {
        backgroundColor: color.Surface.ContainerActive,
      },
      false: {},
    },
  },
});

export const ScrollContent = style({
  padding: `${config.space.S300} 0 ${config.space.S300} ${config.space.S400}`,
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
  borderBottom: border,
  backgroundColor: color.SurfaceVariant.Container,
  color: 'inherit',
});

export const FileHeaderToggle = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: config.space.S200,
  minWidth: 0,
  padding: 0,
  border: 0,
  backgroundColor: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  selectors: {
    '&:hover': {
      color: color.Primary.Main,
    },
    '&:active': {
      color: color.Primary.Main,
    },
    '&:focus-visible': {
      outline: `${config.borderWidth.B300} solid ${color.Primary.Main}`,
      outlineOffset: toRem(2),
    },
  },
});

export const FullFileButton = style({
  whiteSpace: 'nowrap',
  flexShrink: 0,
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
  userSelect: 'none',
  WebkitUserSelect: 'none',
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

export const LineBody = style([
  LineCode,
  {
    userSelect: 'text',
    WebkitUserSelect: 'text',
  },
]);

export const NoCode = style({
  display: 'block',
  padding: `${config.space.S300}`,
});

export const OmittedPatch = style({
  display: 'flex',
  flexDirection: 'column',
  gap: config.space.S100,
  padding: config.space.S300,
  backgroundColor: color.Background.Container,
});

export const OmittedPatchLine = style({
  fontFamily: 'monospace',
  fontSize: toRem(12),
});

export const Empty = style({
  height: '100%',
  minHeight: toRem(180),
});
