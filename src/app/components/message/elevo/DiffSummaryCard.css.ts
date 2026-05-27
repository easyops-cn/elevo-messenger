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
  maxWidth: toRem(600),
  overflow: 'hidden',
});

export const Header = style({
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
  minWidth: 0,
});

export const HeaderIcon = style({
  width: toRem(8),
  height: toRem(8),
  borderRadius: '50%',
  backgroundColor: color.Primary.Main,
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
  marginTop: config.space.S300,
});

export const FileRow = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: config.space.S300,
  minWidth: 0,
});

export const FilePath = style({
  fontFamily: 'monospace',
  fontSize: toRem(12),
  color: elevoColor.Text.Secondary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
