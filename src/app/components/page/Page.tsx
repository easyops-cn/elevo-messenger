import React, { ComponentProps, MutableRefObject, ReactNode } from 'react';
import { Box, Header, Line, Scroll, Text, as } from 'folds';
import classNames from 'classnames';
import { ContainerColor } from '../../styles/ContainerColor.css';
import * as css from './style.css';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { isDesktopTauri } from '../../plugins/useTauriOpener';
import { isMacOS } from '../../utils/user-agent';

type PageRootProps = {
  nav: ReactNode;
  children: ReactNode;
  variant?: 'Background' | 'Surface';
};

export function PageRoot({ nav, children, variant }: PageRootProps) {
  const screenSize = useScreenSizeContext();

  return (
    <Box grow="Yes" className={ContainerColor({ variant: variant ?? 'Background' })}>
      {nav}
      {screenSize !== ScreenSize.Mobile && variant === 'Surface' && (
        <Line variant="Background" size="300" direction="Vertical" />
      )}
      {children}
    </Box>
  );
}

type ClientDrawerLayoutProps = {
  stretch?: boolean;
  children: ReactNode;
};
export function PageNav({
  stretch,
  size,
  children,
}: ClientDrawerLayoutProps & css.PageNavVariants) {
  const screenSize = useScreenSizeContext();
  const isMobile = screenSize === ScreenSize.Mobile;

  return (
    <Box
      grow={stretch ? 'Yes' : undefined}
      shrink={stretch ? 'Yes' : 'No'}
      className={css.PageNav({ size })}
      style={{ width: isMobile ? '100%' : undefined }}
    >
      <Box grow="Yes" direction="Column">
        {children}
      </Box>
    </Box>
  );
}

export const PageNavHeader = as<'header', css.PageNavHeaderVariants>(
  ({ className, modal, ...props }, ref) => (
    <Header
      className={classNames(
        css.PageNavHeader({ modal, isDesktopMac: isDesktopTauri && isMacOS() }),
        className
      )}
      variant="Background"
      size="600"
      {...props}
      ref={ref}
    />
  )
);

export function PageNavContent({
  scrollRef,
  children,
}: {
  children: ReactNode;
  scrollRef?: MutableRefObject<HTMLDivElement | null>;
}) {
  return (
    <Box grow="Yes" direction="Column">
      <Scroll
        ref={scrollRef}
        variant="Background"
        direction="Vertical"
        size="400"
        hideTrack
        visibility="Hover"
      >
        <div className={css.PageNavContent}>{children}</div>
      </Scroll>
    </Box>
  );
}

export function PageMain({ children, isSidePanel, style }: { children: ReactNode; isSidePanel?: boolean; style?: React.CSSProperties }) {
  const screenSize = useScreenSizeContext();

  return (
    <Box
      grow="Yes"
      direction="Column"
      className={classNames(screenSize !== ScreenSize.Mobile ? css.PageMainFloating : undefined, {
        [css.PageMainSidePanel]: isSidePanel && screenSize === ScreenSize.Desktop,
      })}
      style={style}
    >
      {children}
    </Box>
  );
}

export const Page = as<'div'>(({ className, ...props }, ref) => (
  <Box
    grow="Yes"
    direction="Column"
    className={classNames(ContainerColor({ variant: 'Surface' }), className)}
    {...props}
    ref={ref}
  />
));

export const PageHeader = as<'div', css.PageHeaderVariants>(
  ({ className, outlined, balance, ...props }, ref) => {
    const screenSize = useScreenSizeContext();

    return (
      <Header
        as="header"
        size="600"
        className={classNames(
          css.PageHeader({
            balance,
            outlined,
            isMobileMac: isDesktopTauri && isMacOS() && screenSize === ScreenSize.Mobile,
          }),
          className
        )}
        {...props}
        ref={ref}
      />
    );
  }
);

export const PageContent = as<'div'>(({ className, ...props }, ref) => (
  <div className={classNames(css.PageContent, className)} {...props} ref={ref} />
));

export function PageHeroEmpty({ children }: { children: ReactNode }) {
  return (
    <Box
      className={classNames(ContainerColor({ variant: 'SurfaceVariant' }), css.PageHeroEmpty)}
      direction="Column"
      alignItems="Center"
      justifyContent="Center"
      gap="200"
    >
      {children}
    </Box>
  );
}

export const PageHeroSection = as<'div', ComponentProps<typeof Box>>(
  ({ className, ...props }, ref) => (
    <Box
      direction="Column"
      className={classNames(css.PageHeroSection, className)}
      {...props}
      ref={ref}
    />
  )
);

export function PageHero({
  icon,
  title,
  subTitle,
  children,
}: {
  icon: ReactNode;
  title: ReactNode;
  subTitle: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Box direction="Column" gap="400">
      <Box direction="Column" alignItems="Center" gap="200">
        {icon}
      </Box>
      <Box as="h2" direction="Column" gap="200" alignItems="Center">
        <Text align="Center" size="H2">
          {title}
        </Text>
        <Text align="Center" priority="400">
          {subTitle}
        </Text>
      </Box>
      {children}
    </Box>
  );
}

export const PageContentCenter = as<'div'>(({ className, ...props }, ref) => (
  <div className={classNames(css.PageContentCenter, className)} {...props} ref={ref} />
));
