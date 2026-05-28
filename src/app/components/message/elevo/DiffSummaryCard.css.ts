import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';
import { elevoColor } from '../../../../config.css';

const cardBorder = `${config.borderWidth.B300} solid ${elevoColor.Border.Light}`;

export const DiffSummaryCard = style({
  backgroundColor: color.SurfaceVariant.Container,
  color: color.SurfaceVariant.OnContainer,
  border: cardBorder,
  borderRadius: config.radii.R300,
  padding: config.space.S300,
  overflow: 'hidden',
});

export const Header = style({
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
  minWidth: 0,
});

export const HeaderIcon = style({
  color: color.Primary.Main,
  flexShrink: 0,
});

export const Title = style({
  minWidth: 0,
});

export const LineCount = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: config.space.S100,
  fontFamily: 'monospace',
  fontSize: toRem(11),
  lineHeight: toRem(16),
  whiteSpace: 'nowrap',
});

export const Added = style({
  color: color.Success.Main,
});

export const Deleted = style({
  color: color.Critical.Main,
});

export const FileList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: config.space.S100,
});

export const FileItem = style({
  minWidth: 0,
});

export const FileRow = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: config.space.S200,
  minWidth: 0,
  borderRadius: config.radii.R300,
  padding: `${config.space.S100} ${config.space.S200}`,
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
      outlineOffset: toRem(1),
    },
  },
});

export const FilePath = style({
  fontFamily: 'monospace',
  fontSize: toRem(12),
  color: elevoColor.Text.Secondary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const FileMeta = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: config.space.S100,
  color: elevoColor.Text.Secondary,
});

export const DiffDetails = style({
  marginTop: config.space.S100,
  border: `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`,
  borderRadius: config.radii.R300,
  backgroundColor: color.Background.Container,
  overflowX: 'auto',
});

export const DiffBlock = style({
  fontFamily: 'monospace',
  fontSize: toRem(12),
  lineHeight: toRem(18),
  margin: 0,
  padding: `${config.space.S100} 0`,
  minWidth: 'fit-content',
});

export const DiffLine = style({
  display: 'block',
  padding: `0 ${config.space.S200}`,
  whiteSpace: 'pre',
});

export const DiffLineAdded = style({
  backgroundColor: color.Success.Container,
  color: color.Success.OnContainer,
});

export const DiffLineDeleted = style({
  backgroundColor: color.Critical.Container,
  color: color.Critical.OnContainer,
});

export const DiffLineMeta = style({
  color: elevoColor.Text.Secondary,
});
