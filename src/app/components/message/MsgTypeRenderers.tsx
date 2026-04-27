import React, { CSSProperties, ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod/v4';
import { Box, Chip, Icon, Icons, Text, color, config, toRem } from 'folds';
import { IContent } from 'matrix-js-sdk';
import { invoke } from '@tauri-apps/api/core';
import { JUMBO_EMOJI_REG, URL_REG } from '../../utils/regex';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import {
  AskUserQuestionCard,
  QuestionAnsweredCard,
  parseAskUserQuestion,
  parseQuestionAnswered,
} from './elevo/AskUser';
import { isDesktopTauri } from '../../plugins/useTauriOpener';
import { trimReplyFromBody } from '../../utils/room';
import { MessageTextBody } from './layout';
import {
  MessageBadEncryptedContent,
  MessageBrokenContent,
  MessageDeletedContent,
  MessageEditedContent,
  MessageUnsupportedContent,
} from './content';
import {
  IAudioContent,
  IAudioInfo,
  IEncryptedFile,
  IFileContent,
  IFileInfo,
  IImageContent,
  IImageInfo,
  IThumbnailContent,
  IVideoContent,
  IVideoInfo,
  MATRIX_SPOILER_PROPERTY_NAME,
  MATRIX_SPOILER_REASON_PROPERTY_NAME,
} from '../../../types/matrix/common';
import { FALLBACK_MIMETYPE, getBlobSafeMimeType } from '../../utils/mimeTypes';
import { parseGeoUri, scaleYDimension } from '../../utils/common';
import { Attachment, AttachmentBox, AttachmentContent, AttachmentHeader } from './attachment';
import { FileHeader, FileDownloadButton } from './FileHeader';
import { VoiceMessage } from './content/VoiceMessage';

export function MBadEncrypted() {
  return (
    <Text>
      <MessageBadEncryptedContent />
    </Text>
  );
}

type RedactedContentProps = {
  reason?: string;
};
export function RedactedContent({ reason }: RedactedContentProps) {
  return (
    <Text>
      <MessageDeletedContent reason={reason} />
    </Text>
  );
}

export function UnsupportedContent() {
  return (
    <Text>
      <MessageUnsupportedContent />
    </Text>
  );
}

export function BrokenContent() {
  return (
    <Text>
      <MessageBrokenContent />
    </Text>
  );
}

const ToolCallSchema = z.object({
  name: z.string(),
  title: z.string().optional(),
  input: z.unknown(),
  output: z.unknown().optional(),
  status: z.enum(['inprogress', 'completed']),
});

type ToolCallData = z.infer<typeof ToolCallSchema>;

const OidcLoginSchema = z.object({
  provider: z.string(),
  url: z.string().optional(),
  done: z.boolean().optional(),
  userId: z.string().optional(),
});

type OidcLoginData = z.infer<typeof OidcLoginSchema>;

function parseToolCall(content: Record<string, unknown>): ToolCallData | undefined {
  const result = ToolCallSchema.safeParse(content['vip.elevo.tool_call']);
  return result.success ? result.data : undefined;
}

type RenderBodyProps = {
  body: string;
  customBody?: string;
};
type MTextProps = {
  edited?: boolean;
  content: Record<string, unknown>;
  renderBody: (props: RenderBodyProps) => ReactNode;
  renderUrlsPreview?: (urls: string[]) => ReactNode;
  style?: CSSProperties;
  readOnly?: boolean;
};

function parseOidcLogin(content: Record<string, unknown>): OidcLoginData | undefined {
  const result = OidcLoginSchema.safeParse(content['vip.elevo.oidc_login']);
  if (!result.success) return undefined;
  const { done, url } = result.data;
  if (done === true || url) return result.data;
  return undefined;
}

const toolCallHeaderStyles: CSSProperties = {
  backgroundColor: color.SurfaceVariant.Container,
  color: color.SurfaceVariant.OnContainer,
  border: `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`,
  borderRadius: config.radii.R300,
  padding: `${config.space.S100} ${config.space.S200}`,
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
  cursor: 'pointer',
  width: 'fit-content',
};

const toolCallBodyStyles: CSSProperties = {
  backgroundColor: color.SurfaceVariant.Container,
  border: `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`,
  borderRadius: config.radii.R300,
  padding: `${config.space.S200} ${config.space.S300}`,
  maxWidth: toRem(600),
};

type ToolCallCardProps = { data: ToolCallData; style?: CSSProperties };
function ToolCallCard({ data, style }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const iconColor = data.status === 'completed' ? color.Success.Main : color.Secondary.Main;
  const formatValue = (val: unknown) =>
    typeof val === 'string' ? val : JSON.stringify(val, null, 2);
  const preStyles: CSSProperties = {
    fontFamily: 'monospace',
    fontSize: toRem(12),
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    margin: 0,
  };
  const dividerStyles: CSSProperties = {
    borderTop: `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`,
    margin: `${config.space.S200} 0`,
  };

  return (
    <Box style={style} direction="Column" gap="100">
      <div
        style={toolCallHeaderStyles}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <Icon src={Icons.Terminal} size="100" style={{ color: iconColor }} />
        <Text size="T200" priority="300">
          {data.title || data.name}
        </Text>
        <Icon src={expanded ? Icons.ChevronBottom : Icons.ChevronRight} size="100" />
      </div>
      {expanded && (
        <div style={toolCallBodyStyles}>
          <Text
            size="T200"
            priority="300"
            style={{ fontWeight: 500, marginBottom: config.space.S100 }}
          >
            Input
          </Text>
          <pre style={preStyles}>{formatValue(data.input)}</pre>
          {data.output !== undefined && (
            <>
              <div style={dividerStyles} />
              <Text
                size="T200"
                priority="300"
                style={{ fontWeight: 500, marginBottom: config.space.S100 }}
              >
                Output
              </Text>
              <pre style={preStyles}>{formatValue(data.output)}</pre>
            </>
          )}
        </div>
      )}
    </Box>
  );
}

type ReasoningCardProps = { style?: CSSProperties; children: ReactNode };
function ReasoningCard({ style, children }: ReasoningCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <Box
      style={{ ...style, opacity: 0.7, fontSize: config.fontSize.T300 }}
      direction="Column"
      gap="100"
    >
      <div
        style={{
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: config.space.S100,
        }}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <Text priority="300" size="T300">{t('message.thinking')}</Text>
        <Icon src={expanded ? Icons.ChevronBottom : Icons.ChevronRight} size="100" />
      </div>
      {expanded && children}
    </Box>
  );
}

const oidcLinkStyles: CSSProperties = {
  backgroundColor: color.SurfaceVariant.Container,
  color: color.SurfaceVariant.OnContainer,
  border: `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`,
  borderRadius: config.radii.R300,
  padding: config.space.S300,
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
  textDecoration: 'none',
  cursor: 'default',
  transition: 'background-color 0.15s ease',
  maxWidth: toRem(400),
};

export function MText({ edited, content, renderBody, renderUrlsPreview, style, readOnly }: MTextProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const { body, formatted_body: customBody } = content;

  if (typeof body !== 'string') return <BrokenContent />;

  const oidcLogin = parseOidcLogin(content);
  if (oidcLogin && (!oidcLogin.userId || oidcLogin.userId === mx.getUserId())) {
    const cardContent = (
      <>
        <Icon src={Icons.ShieldUser} size="300" />
        <Box grow="Yes" direction="Column" gap="100">
          <Text size="T300" priority="400">
            <b>{t('oidcLogin.title', { provider: oidcLogin.provider })}</b>
          </Text>
          <Text size="T200" priority="300">
            {t(oidcLogin.done ? 'oidcLogin.doneDescription' : 'oidcLogin.description', {
              provider: oidcLogin.provider,
            })}
          </Text>
        </Box>
        <Icon
          src={oidcLogin.done ? Icons.Check : Icons.ArrowRight}
          size="200"
          style={oidcLogin.done ? { color: color.Success.Main } : undefined}
        />
      </>
    );

    const handleOidcClick = () => {
      if (isDesktopTauri && oidcLogin.url) {
        invoke('open_oauth_window', { authUrl: oidcLogin.url, label: 'oauth-elevo-bridge' }).catch(
          (err) => {
            // eslint-disable-next-line no-console
            console.error('Failed to open OAuth window, falling back to browser:', err);
            window.open(oidcLogin.url, '_blank', 'noopener,noreferrer');
          }
        );
      }
    };

    const renderOidcCard = () => {
      if (oidcLogin.done) {
        return <div style={oidcLinkStyles}>{cardContent}</div>;
      }
      if (isDesktopTauri) {
        return (
          <div
            role="button"
            tabIndex={0}
            style={{ ...oidcLinkStyles, cursor: 'pointer' }}
            onClick={handleOidcClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOidcClick();
              }
            }}
          >
            {cardContent}
          </div>
        );
      }
      return (
        <a
          href={oidcLogin.url}
          target="_blank"
          rel="noreferrer noopener"
          style={{ ...oidcLinkStyles, cursor: 'pointer' }}
        >
          {cardContent}
        </a>
      );
    };

    return <Box style={style}>{renderOidcCard()}</Box>;
  }

  const askUserQuestion = parseAskUserQuestion(content);
  if (askUserQuestion) {
    return <AskUserQuestionCard data={askUserQuestion} style={style} readOnly={readOnly} />;
  }

  const questionAnswered = parseQuestionAnswered(content);
  if (questionAnswered) {
    return <QuestionAnsweredCard data={questionAnswered} style={style} />;
  }

  const toolCall = parseToolCall(content);
  if (toolCall) {
    return <ToolCallCard data={toolCall} style={style} />;
  }

  if (content['vip.elevo.reasoning'] === true) {
    const trimmedBody = trimReplyFromBody(body);
    return (
      <ReasoningCard style={style}>
        <MessageTextBody
          preWrap={typeof customBody !== 'string'}
          jumboEmoji={JUMBO_EMOJI_REG.test(trimmedBody)}
        >
          {renderBody({
            body: trimmedBody,
            customBody: typeof customBody === 'string' ? customBody : undefined,
          })}
          {edited && <MessageEditedContent />}
        </MessageTextBody>
      </ReasoningCard>
    );
  }

  const trimmedBody = trimReplyFromBody(body);
  const urlsMatch = renderUrlsPreview && trimmedBody.match(URL_REG);
  const urls = urlsMatch ? [...new Set(urlsMatch)] : undefined;

  return (
    <>
      <MessageTextBody
        preWrap={typeof customBody !== 'string'}
        jumboEmoji={JUMBO_EMOJI_REG.test(trimmedBody)}
        style={style}
      >
        {renderBody({
          body: trimmedBody,
          customBody: typeof customBody === 'string' ? customBody : undefined,
        })}
        {edited && <MessageEditedContent />}
      </MessageTextBody>
      {renderUrlsPreview && urls && urls.length > 0 && renderUrlsPreview(urls)}
    </>
  );
}

type MEmoteProps = {
  displayName: string;
  edited?: boolean;
  content: Record<string, unknown>;
  renderBody: (props: RenderBodyProps) => ReactNode;
  renderUrlsPreview?: (urls: string[]) => ReactNode;
};
export function MEmote({
  displayName,
  edited,
  content,
  renderBody,
  renderUrlsPreview,
}: MEmoteProps) {
  const { body, formatted_body: customBody } = content;

  if (typeof body !== 'string') return <BrokenContent />;
  const trimmedBody = trimReplyFromBody(body);
  const urlsMatch = renderUrlsPreview && trimmedBody.match(URL_REG);
  const urls = urlsMatch ? [...new Set(urlsMatch)] : undefined;

  return (
    <>
      <MessageTextBody
        emote
        preWrap={typeof customBody !== 'string'}
        jumboEmoji={JUMBO_EMOJI_REG.test(trimmedBody)}
      >
        <b>{`${displayName} `}</b>
        {renderBody({
          body: trimmedBody,
          customBody: typeof customBody === 'string' ? customBody : undefined,
        })}
        {edited && <MessageEditedContent />}
      </MessageTextBody>
      {renderUrlsPreview && urls && urls.length > 0 && renderUrlsPreview(urls)}
    </>
  );
}

type MNoticeProps = {
  edited?: boolean;
  content: Record<string, unknown>;
  renderBody: (props: RenderBodyProps) => ReactNode;
  renderUrlsPreview?: (urls: string[]) => ReactNode;
};
export function MNotice({ edited, content, renderBody, renderUrlsPreview }: MNoticeProps) {
  const { body, formatted_body: customBody } = content;

  if (typeof body !== 'string') return <BrokenContent />;
  const trimmedBody = trimReplyFromBody(body);
  const urlsMatch = renderUrlsPreview && trimmedBody.match(URL_REG);
  const urls = urlsMatch ? [...new Set(urlsMatch)] : undefined;

  return (
    <>
      <MessageTextBody
        notice
        preWrap={typeof customBody !== 'string'}
        jumboEmoji={JUMBO_EMOJI_REG.test(trimmedBody)}
      >
        {renderBody({
          body: trimmedBody,
          customBody: typeof customBody === 'string' ? customBody : undefined,
        })}
        {edited && <MessageEditedContent />}
      </MessageTextBody>
      {renderUrlsPreview && urls && urls.length > 0 && renderUrlsPreview(urls)}
    </>
  );
}

type RenderImageContentProps = {
  body: string;
  filename?: string;
  info?: IImageInfo & IThumbnailContent;
  mimeType?: string;
  url: string;
  encInfo?: IEncryptedFile;
  markedAsSpoiler?: boolean;
  spoilerReason?: string;
};
type MImageProps = {
  content: IImageContent;
  renderImageContent: (props: RenderImageContentProps) => ReactNode;
};
export function MImage({ content, renderImageContent }: MImageProps) {
  const imgInfo = content?.info;
  const mxcUrl = content.file?.url ?? content.url;
  if (typeof mxcUrl !== 'string') {
    return <BrokenContent />;
  }

  return (
    <AttachmentBox image>
      {renderImageContent({
        body: content.body || 'Image',
        info: imgInfo,
        mimeType: imgInfo?.mimetype,
        url: mxcUrl,
        encInfo: content.file,
        markedAsSpoiler: content[MATRIX_SPOILER_PROPERTY_NAME],
        spoilerReason: content[MATRIX_SPOILER_REASON_PROPERTY_NAME],
      })}
    </AttachmentBox>
  );
}

type RenderVideoContentProps = {
  body: string;
  info: IVideoInfo & IThumbnailContent;
  mimeType: string;
  url: string;
  encInfo?: IEncryptedFile;
  markedAsSpoiler?: boolean;
  spoilerReason?: string;
};
type MVideoProps = {
  content: IVideoContent;
  renderAsFile: () => ReactNode;
  renderVideoContent: (props: RenderVideoContentProps) => ReactNode;
  outlined?: boolean;
};
export function MVideo({ content, renderAsFile, renderVideoContent, outlined }: MVideoProps) {
  const videoInfo = content?.info;
  const mxcUrl = content.file?.url ?? content.url;
  const safeMimeType = getBlobSafeMimeType(videoInfo?.mimetype ?? '');

  if (!videoInfo || !safeMimeType.startsWith('video') || typeof mxcUrl !== 'string') {
    if (mxcUrl) {
      return renderAsFile();
    }
    return <BrokenContent />;
  }

  const height = scaleYDimension(videoInfo.w || 400, 400, videoInfo.h || 400);

  const filename = content.filename ?? content.body ?? 'Video';

  return (
    <Attachment outlined={outlined}>
      <AttachmentHeader>
        <FileHeader
          body={filename}
          mimeType={safeMimeType}
          after={
            <FileDownloadButton
              filename={filename}
              url={mxcUrl}
              mimeType={safeMimeType}
              encInfo={content.file}
            />
          }
        />
      </AttachmentHeader>
      <AttachmentBox
        style={{
          height: toRem(height < 48 ? 48 : height),
        }}
      >
        {renderVideoContent({
          body: content.body || 'Video',
          info: videoInfo,
          mimeType: safeMimeType,
          url: mxcUrl,
          encInfo: content.file,
          markedAsSpoiler: content[MATRIX_SPOILER_PROPERTY_NAME],
          spoilerReason: content[MATRIX_SPOILER_REASON_PROPERTY_NAME],
        })}
      </AttachmentBox>
    </Attachment>
  );
}

type RenderAudioContentProps = {
  info: IAudioInfo;
  mimeType: string;
  url: string;
  encInfo?: IEncryptedFile;
};
type MAudioProps = {
  content: IAudioContent;
  renderAsFile: () => ReactNode;
  renderAudioContent: (props: RenderAudioContentProps) => ReactNode;
  outlined?: boolean;
};
export function MAudio({ content, renderAsFile, renderAudioContent, outlined }: MAudioProps) {
  const audioInfo = content?.info;
  const mxcUrl = content.file?.url ?? content.url;
  const safeMimeType = getBlobSafeMimeType(audioInfo?.mimetype ?? '');

  if (!audioInfo || !safeMimeType.startsWith('audio') || typeof mxcUrl !== 'string') {
    if (mxcUrl) {
      return renderAsFile();
    }
    return <BrokenContent />;
  }

  const msc1767Audio = content['org.matrix.msc1767.audio'];
  const waveform = msc1767Audio?.waveform;
  if (Array.isArray(waveform) && waveform.length > 0) {
    return (
      <Box
        style={{
          padding: config.space.S300,
          backgroundColor: color.SurfaceVariant.Container,
          color: color.SurfaceVariant.OnContainer,
          borderRadius: config.radii.R400,
          ...(outlined
            ? {
                boxShadow: `inset 0 0 0 ${config.borderWidth.B300} ${color.SurfaceVariant.ContainerLine}`,
              }
            : {}),
        }}
      >
        <VoiceMessage
          mimeType={safeMimeType}
          url={mxcUrl}
          info={audioInfo}
          encInfo={content.file}
          waveform={waveform}
        />
      </Box>
    );
  }

  const filename = content.filename ?? content.body ?? 'Audio';
  return (
    <Attachment outlined={outlined}>
      <AttachmentHeader>
        <FileHeader
          body={filename}
          mimeType={safeMimeType}
          after={
            <FileDownloadButton
              filename={filename}
              url={mxcUrl}
              mimeType={safeMimeType}
              encInfo={content.file}
            />
          }
        />
      </AttachmentHeader>
      <AttachmentBox>
        <AttachmentContent>
          {renderAudioContent({
            info: audioInfo,
            mimeType: safeMimeType,
            url: mxcUrl,
            encInfo: content.file,
          })}
        </AttachmentContent>
      </AttachmentBox>
    </Attachment>
  );
}

type RenderFileContentProps = {
  body: string;
  info: IFileInfo & IThumbnailContent;
  mimeType: string;
  url: string;
  encInfo?: IEncryptedFile;
};
type MFileProps = {
  content: IFileContent;
  renderFileContent: (props: RenderFileContentProps) => ReactNode;
  outlined?: boolean;
};
export function MFile({ content, renderFileContent, outlined }: MFileProps) {
  const fileInfo = content?.info;
  const mxcUrl = content.file?.url ?? content.url;

  if (typeof mxcUrl !== 'string') {
    return <BrokenContent />;
  }

  return (
    <Attachment outlined={outlined}>
      <AttachmentHeader>
        <FileHeader
          body={content.filename ?? content.body ?? 'Unnamed File'}
          mimeType={fileInfo?.mimetype ?? FALLBACK_MIMETYPE}
        />
      </AttachmentHeader>
      <AttachmentBox>
        <AttachmentContent>
          {renderFileContent({
            body: content.filename ?? content.body ?? 'File',
            info: fileInfo ?? {},
            mimeType: fileInfo?.mimetype ?? FALLBACK_MIMETYPE,
            url: mxcUrl,
            encInfo: content.file,
          })}
        </AttachmentContent>
      </AttachmentBox>
    </Attachment>
  );
}

type MLocationProps = {
  content: IContent;
};
export function MLocation({ content }: MLocationProps) {
  const geoUri = content.geo_uri;
  if (typeof geoUri !== 'string') return <BrokenContent />;
  const location = parseGeoUri(geoUri);
  if (!location) return <BrokenContent />;

  return (
    <Box direction="Column" alignItems="Start" gap="100">
      <Text size="T400">{geoUri}</Text>
      <Chip
        as="a"
        size="400"
        href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}`}
        target="_blank"
        rel="noreferrer noopener"
        variant="Primary"
        radii="Pill"
        before={<Icon src={Icons.External} size="50" />}
      >
        <Text size="B300">Open Location</Text>
      </Chip>
    </Box>
  );
}

type MStickerProps = {
  content: IImageContent;
  renderImageContent: (props: RenderImageContentProps) => ReactNode;
};
export function MSticker({ content, renderImageContent }: MStickerProps) {
  const imgInfo = content?.info;
  const mxcUrl = content.file?.url ?? content.url;
  if (typeof mxcUrl !== 'string') {
    return <MessageBrokenContent />;
  }

  return (
    <AttachmentBox image>
      {renderImageContent({
        body: content.body || 'Sticker',
        info: imgInfo,
        mimeType: imgInfo?.mimetype,
        url: mxcUrl,
        encInfo: content.file,
      })}
    </AttachmentBox>
  );
}
