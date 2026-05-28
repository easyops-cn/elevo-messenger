/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React, { ComponentProps, HTMLAttributes, forwardRef } from 'react';
import classNames from 'classnames';
import { Box, Chip, Header, Icon, IconButton, Icons, Scroll, Text, as } from 'folds';
import { useTranslation } from 'react-i18next';
import * as css from './TextViewer.css';
import { copyToClipboard } from '../../utils/dom';
import { saveFile } from '../../utils/file-saver';
import { ShikiCode } from '../../plugins/shiki';

type TextViewerContentProps = {
  text: string;
  langName: string;
  size?: ComponentProps<typeof Text>['size'];
} & HTMLAttributes<HTMLPreElement>;
export const TextViewerContent = forwardRef<HTMLPreElement, TextViewerContentProps>(
  ({ text, langName, size, className, ...props }, ref) => (
    <Text
      as="pre"
      size={size}
      className={classNames(css.TextViewerPre, `language-${langName}`, className)}
      {...props}
      ref={ref}
    >
      <ShikiCode code={text} lang={langName} />
    </Text>
  )
);

export type TextViewerProps = {
  name: string;
  text: string;
  langName: string;
  mimeType?: string;
  hideCloseButton?: boolean;
  requestClose: () => void;
};

export const TextViewer = as<'div', TextViewerProps>(
  ({ className, name, text, langName, mimeType, hideCloseButton, requestClose, ...props }, ref) => {
    const { t } = useTranslation();

    const handleCopy = () => {
      copyToClipboard(text);
    };

    const handleDownload = async () => {
      await saveFile(new Blob([text], { type: mimeType ?? 'text/plain' }), name);
    };

    return (
      <Box
        className={classNames(css.TextViewer, className)}
        direction="Column"
        {...props}
        ref={ref}
      >
        <Header className={css.TextViewerHeader} size="400">
          <Box grow="Yes" alignItems="Center" gap="200">
            {!hideCloseButton && (
              <IconButton size="300" radii="300" onClick={requestClose}>
                <Icon size="50" src={Icons.ArrowLeft} />
              </IconButton>
            )}
            <Text size="T300" truncate>
              {name}
            </Text>
          </Box>
          <Box shrink="No" alignItems="Center" gap="200">
            <Chip
              variant="Primary"
              radii="300"
              onClick={handleDownload}
              before={<Icon size="50" src={Icons.Download} />}
            >
              <Text size="B300">{t('viewer.download')}</Text>
            </Chip>
            <Chip variant="Primary" radii="300" onClick={handleCopy}>
              <Text size="B300">Copy All</Text>
            </Chip>
          </Box>
        </Header>

        <Box
          grow="Yes"
          className={css.TextViewerContent}
          justifyContent="Center"
          alignItems="Center"
        >
          <Scroll hideTrack variant="Background" visibility="Hover">
            <TextViewerContent
              className={css.TextViewerPrePadding}
              text={text}
              langName={langName}
            />
          </Scroll>
        </Box>
      </Box>
    );
  }
);
