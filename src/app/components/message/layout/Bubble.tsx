import React, { ReactNode } from 'react';
import classNames from 'classnames';
import { Box, ContainerColor, as, color, toRem } from 'folds';
import * as css from './layout.css';
import { ScreenSize, useScreenSize } from '../../../hooks/useScreenSize';

type BubbleArrowProps = {
  variant: ContainerColor;
};
function BubbleLeftArrow({ variant }: BubbleArrowProps) {
  return (
    <svg
      className={css.BubbleLeftArrow}
      width="9"
      height="8"
      viewBox="0 0 9 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.00004 8V0H4.82847C3.04666 0 2.15433 2.15428 3.41426 3.41421L8.00004 8H9.00004Z"
        fill={color[variant].Container}
      />
    </svg>
  );
}

function BubbleRightArrow({ variant }: BubbleArrowProps) {
  return (
    <svg
      className={css.BubbleRightArrow}
      width="9"
      height="8"
      viewBox="0 0 9 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 8V0H4.17157C5.95338 0 6.84571 2.15428 5.58578 3.41421L1 8H0Z"
        fill={color[variant].Container}
      />
    </svg>
  );
}

type BubbleLayoutProps = {
  isOwn?: boolean;
  hideBubble?: boolean;
  transparent?: boolean;
  before?: ReactNode;
  header?: ReactNode;
  beforeContent?: ReactNode;
  afterContent?: ReactNode;
};

export const BubbleLayout = as<'div', BubbleLayoutProps>(
  ({ isOwn, hideBubble, transparent, before, header, beforeContent, afterContent, children, ...props }, ref) => {
    const screenSize = useScreenSize();
    const isMobile = screenSize === ScreenSize.Mobile;
    const padding = isMobile ? 16 : 56;

    return (
      <Box gap="300" direction={isOwn ? 'RowReverse' : 'Row'} {...props} style={{
        ...props.style,
        width: `calc(100% - ${toRem(padding)})`,
        maxWidth: isMobile ? undefined : `max(50vw, ${toRem(800)})`,
        [isOwn ? 'marginLeft' : 'marginRight']: 'auto',
      }} ref={ref}>
        <Box className={css.BubbleBefore} shrink="No">
          {before}
        </Box>
        <Box grow="Yes" direction="Column">
          {header}
          {beforeContent && (
            <Box alignSelf={isOwn ? 'End' : undefined} style={isOwn ? { maxWidth: '100%' } : undefined}>
              {beforeContent}
            </Box>
          )}
          {hideBubble ? (
            children
          ) : (
            <Box alignSelf={isOwn ? 'End' : undefined} style={isOwn ? { maxWidth: '100%' } : undefined}>
              <Box
                className={
                  hideBubble
                    ? undefined
                    : classNames(
                        css.BubbleContent({ transparent, isOwn }),
                        before
                          ? isOwn
                            ? css.BubbleContentArrowRight
                            : css.BubbleContentArrowLeft
                          : undefined
                      )
                }
                direction="Column"
              >
                {before && !transparent ? (isOwn ? <BubbleRightArrow variant="Primary" /> : <BubbleLeftArrow variant="SurfaceVariant" />) : null}
                {children}
              </Box>
            </Box>
          )}
          {afterContent && (
            <Box alignSelf={isOwn ? 'End' : undefined} style={isOwn ? { maxWidth: '100%' } : undefined}>
              {afterContent}
            </Box>
          )}
        </Box>
      </Box>
    );
});
