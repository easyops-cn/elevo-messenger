import React, { CSSProperties, ReactNode, useMemo } from 'react';
import { Box, Chip, Icon, Icons, Text, color, config } from 'folds';
import { IContent } from 'matrix-js-sdk';
import { JUMBO_EMOJI_REG, URL_REG } from '../../utils/regex';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { AskUserQuestionCard, QuestionAnsweredCard, parseAskUser } from './elevo/AskUser';
import { ToolCallCard, parseToolCall } from './elevo/ToolCallCard';
import { ReasoningCard } from './elevo/ReasoningCard';
import { SseMarkdownBody, parseSseRender } from './elevo/SseMarkdownBody';
import { OidcLoginCard, parseOidcLogin } from './elevo/OidcLoginCard';
import { PlanCard, hasPlan } from './elevo/PlanCard';
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
import type { CodeViewWorkspaceContext } from '../code-view';

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
  codeViewWorkspace?: CodeViewWorkspaceContext;
  style?: CSSProperties;
  eventId?: string;
  senderId?: string;
};

function parseJsonInput(input: unknown): unknown {
  if (typeof input !== 'string') return input;

  try {
    return JSON.parse(input);
  } catch {
    return input;
  }
}

function getExitPlanModePlan(toolCall: ReturnType<typeof parseToolCall>): string | undefined {
  if (!toolCall || toolCall.name !== 'ExitPlanMode') return undefined;

  const input = parseJsonInput(toolCall.input);
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return undefined;

  const plan = (input as Record<string, unknown>).plan;
  return typeof plan === 'string' && plan.trim() ? plan : undefined;
}

export function MText({
  edited,
  content,
  renderBody,
  renderUrlsPreview,
  codeViewWorkspace,
  style,
  eventId,
  senderId,
}: MTextProps) {
  const mx = useMatrixClient();
  const { body, formatted_body: customBody } = content;
  const initialHumanSender =
    typeof content['vip.elevo.initial_human_sender'] === 'string'
      ? content['vip.elevo.initial_human_sender']
      : undefined;

  const askUser = useMemo(() => parseAskUser(content), [content]);
  const oidcLogin = useMemo(() => parseOidcLogin(content), [content]);
  const sseRender = useMemo(() => parseSseRender(content), [content]);
  const toolCall = useMemo(() => parseToolCall(content), [content]);
  const plan = hasPlan(content);

  if (plan) {
    return (
      <PlanCard
        content={content}
        renderBody={renderBody}
        renderUrlsPreview={renderUrlsPreview}
        style={style}
      />
    );
  }

  if (typeof body !== 'string') return <BrokenContent />;

  if (askUser) {
    if (askUser.answers) {
      return (
        <QuestionAnsweredCard
          answers={askUser.answers}
          questions={askUser.questions}
          style={style}
        />
      );
    }

    return (
      <AskUserQuestionCard
        data={askUser}
        style={style}
        eventId={eventId}
        initialHumanSender={initialHumanSender}
        questionSenderId={senderId}
      />
    );
  }

  if (oidcLogin && (!oidcLogin.userId || oidcLogin.userId === mx.getUserId())) {
    return <OidcLoginCard data={oidcLogin} style={style} />;
  }

  const reasoningContent = content['vip.elevo.reasoning'] as
    | undefined
    | {
        duration_ms?: number;
        streaming?: boolean;
      };
  const reasoning = !!reasoningContent;

  if (sseRender?.streaming) {
    return (
      <SseMarkdownBody
        sseData={sseRender}
        reasoning={reasoning}
        renderBody={renderBody}
        renderUrlsPreview={renderUrlsPreview}
        style={style}
      />
    );
  }

  if (toolCall) {
    const exitPlan = getExitPlanModePlan(toolCall);

    if (exitPlan) {
      return (
        <Box direction="Column" gap="300" style={style}>
          <ToolCallCard data={toolCall} codeViewWorkspace={codeViewWorkspace} />
          <PlanCard
            content={{
              body: exitPlan,
              msgtype: 'm.text',
              'vip.elevo.plan': true,
            }}
            renderBody={renderBody}
            renderUrlsPreview={renderUrlsPreview}
          />
        </Box>
      );
    }

    return <ToolCallCard data={toolCall} codeViewWorkspace={codeViewWorkspace} style={style} />;
  }

  if (reasoning) {
    const trimmedBody = trimReplyFromBody(body);
    const durationMs =
      typeof reasoningContent?.duration_ms === 'number'
        ? Number(reasoningContent.duration_ms)
        : undefined;
    const reasoningStreaming = reasoningContent?.streaming;
    const isEmpty = trimmedBody === '';
    return (
      <ReasoningCard
        style={style}
        durationMs={durationMs}
        streaming={reasoningStreaming}
        empty={isEmpty}
      >
        {!isEmpty && (
          <MessageTextBody
            preWrap={typeof customBody !== 'string'}
            jumboEmoji={JUMBO_EMOJI_REG.test(trimmedBody)}
          >
            {renderBody({
              body: trimmedBody,
              customBody: typeof customBody === 'string' ? customBody : undefined,
            })}
          </MessageTextBody>
        )}
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
  createdAt?: number;
  markedAsSpoiler?: boolean;
  spoilerReason?: string;
};
type MImageProps = {
  content: IImageContent;
  createdAt?: number;
  renderImageContent: (props: RenderImageContentProps) => ReactNode;
};
export function MImage({ content, createdAt, renderImageContent }: MImageProps) {
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
        createdAt,
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
  createdAt?: number;
  markedAsSpoiler?: boolean;
  spoilerReason?: string;
};
type MVideoProps = {
  content: IVideoContent;
  createdAt?: number;
  renderAsFile: () => ReactNode;
  renderVideoContent: (props: RenderVideoContentProps) => ReactNode;
};
export function MVideo({ content, createdAt, renderAsFile, renderVideoContent }: MVideoProps) {
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
        createdAt,
        markedAsSpoiler: content[MATRIX_SPOILER_PROPERTY_NAME],
        spoilerReason: content[MATRIX_SPOILER_REASON_PROPERTY_NAME],
      })}
    </AttachmentBox>
  );
}

type RenderAudioContentProps = {
  name: string;
  info: IAudioInfo;
  mimeType: string;
  url: string;
  encInfo?: IEncryptedFile;
  createdAt?: number;
  waveform?: number[];
};
type MAudioProps = {
  content: IAudioContent;
  createdAt?: number;
  renderAsFile: () => ReactNode;
  renderAudioContent: (props: RenderAudioContentProps) => ReactNode;
  outlined?: boolean;
};
export function MAudio({
  content,
  createdAt,
  renderAsFile,
  renderAudioContent,
  outlined,
}: MAudioProps) {
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
  const filename =
    content['org.matrix.msc1767.file']?.name ?? content.filename ?? content.body ?? 'Audio';
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
          createdAt={createdAt}
          waveform={waveform}
        />
      </Box>
    );
  }

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
              createdAt={createdAt}
            />
          }
        />
      </AttachmentHeader>
      <AttachmentBox>
        <AttachmentContent>
          {renderAudioContent({
            name: filename,
            info: audioInfo,
            mimeType: safeMimeType,
            url: mxcUrl,
            encInfo: content.file,
            createdAt,
            waveform,
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
  createdAt?: number;
  renderImageContent: (props: RenderImageContentProps) => ReactNode;
};
export function MSticker({ content, createdAt, renderImageContent }: MStickerProps) {
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
        createdAt,
      })}
    </AttachmentBox>
  );
}
