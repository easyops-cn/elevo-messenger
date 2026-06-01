import { Badge, Box, Icon, IconButton, Icons, Spinner, Text, as, toRem } from 'folds';
import React, { ReactNode } from 'react';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { useTranslation } from 'react-i18next';
import { AsyncStatus } from '../../hooks/useAsyncCallback';
import { useMediaDownload } from '../../hooks/useMediaDownload';
import { mimeTypeToExt } from '../../utils/mimeTypes';
import { FolderOpenIcon } from '../../icons/FolderOpenIcon';

const badgeStyles = { maxWidth: toRem(100) };

type FileDownloadButtonProps = {
  filename: string;
  url: string;
  mimeType: string;
  encInfo?: EncryptedAttachmentInfo;
  createdAt?: number;
};
export function FileDownloadButton({
  filename,
  url,
  mimeType,
  encInfo,
  createdAt,
}: FileDownloadButtonProps) {
  const { t } = useTranslation();
  const [downloadState, download, action] = useMediaDownload(
    url,
    mimeType,
    filename,
    encInfo,
    createdAt,
  );

  const downloading = downloadState.status === AsyncStatus.Loading;
  const hasError = downloadState.status === AsyncStatus.Error;
  return (
    <IconButton
      aria-label={t(action.labelKey)}
      disabled={downloading}
      onClick={download}
      variant={hasError ? 'Critical' : 'SurfaceVariant'}
      size="300"
      radii="300"
    >
      {downloading ? (
        <Spinner size="100" variant={hasError ? 'Critical' : 'Secondary'} />
      ) : (
        <Icon size="100" src={action.kind === 'open-folder' ? FolderOpenIcon : Icons.Download} />
      )}
    </IconButton>
  );
}

export type FileHeaderProps = {
  body: string;
  mimeType: string;
  after?: ReactNode;
};
export const FileHeader = as<'div', FileHeaderProps>(({ body, mimeType, after, ...props }, ref) => (
  <Box alignItems="Center" gap="200" grow="Yes" {...props} ref={ref}>
    <Box shrink="No">
      <Badge style={badgeStyles} variant="Secondary" radii="Pill">
        <Text size="O400" truncate>
          {mimeTypeToExt(mimeType)}
        </Text>
      </Badge>
    </Box>
    <Box grow="Yes">
      <Text size="T300" truncate>
        {body}
      </Text>
    </Box>
    {after}
  </Box>
));
