import React, { CSSProperties, ReactNode } from 'react';
import { Box, Chip, Icon, Icons, Text, color, config } from 'folds';
import { IContent } from 'matrix-js-sdk';
import { JUMBO_EMOJI_REG, URL_REG } from '../../utils/regex';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import {
  AskUserQuestionCard,
  QuestionAnsweredCard,
  parseAskUserQuestion,
  parseQuestionAnswered,
} from './elevo/AskUser';
import { ToolCallCard, parseToolCall } from './elevo/ToolCallCard';
import { ReasoningCard } from './elevo/ReasoningCard';
import { SseMarkdownBody, parseSseRender } from './elevo/SseMarkdownBody';
import { OidcLoginCard, parseOidcLogin } from './elevo/OidcLoginCard';
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
import { parseGeoUri } from '../../utils/common';
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
    <Text size="T300">
      <MessageDeletedContent reason={reason} />
    </Text>
  );
}

export function UnsupportedContent() {
  return (
    <Text size="T300">
      <MessageUnsupportedContent />
    </Text>
  );
}

export function BrokenContent() {
  return (
    <Text size="T300">
      <MessageBrokenContent />
    </Text>
  );
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

export function MText({ edited, content, renderBody, renderUrlsPreview, style, readOnly }: MTextProps) {
  const mx = useMatrixClient();
  const { body, formatted_body: customBody } = content;

  if (typeof body !== 'string') return <BrokenContent />;

  const oidcLogin = parseOidcLogin(content);
  if (oidcLogin && (!oidcLogin.userId || oidcLogin.userId === mx.getUserId())) {
    return <OidcLoginCard data={oidcLogin} style={style} />;
  }

  const askUserQuestion = parseAskUserQuestion(content);
  if (askUserQuestion) {
    return <AskUserQuestionCard data={askUserQuestion} style={style} readOnly={readOnly} />;
  }

  const sseRender = parseSseRender(content);
  if (sseRender?.streaming) {
    return (
      <SseMarkdownBody
        sseData={sseRender}
        renderBody={renderBody}
        renderUrlsPreview={renderUrlsPreview}
        style={style}
      />
    );
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
        {edited && !sseRender && <MessageEditedContent />}
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
};
export function MVideo({ content, renderAsFile, renderVideoContent }: MVideoProps) {
  const videoInfo = content?.info;
  const mxcUrl = content.file?.url ?? content.url;
  const safeMimeType = getBlobSafeMimeType(videoInfo?.mimetype ?? '');

  if (!videoInfo || !safeMimeType.startsWith('video') || typeof mxcUrl !== 'string') {
    if (mxcUrl) {
      return renderAsFile();
    }
    return <BrokenContent />;
  }

  return (
    <AttachmentBox image>
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
};
export function MFile({ content, renderFileContent }: MFileProps) {
  const fileInfo = content?.info;
  const mxcUrl = content.file?.url ?? content.url;

  if (typeof mxcUrl !== 'string') {
    return <BrokenContent />;
  }

  return (
    <Attachment>
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
