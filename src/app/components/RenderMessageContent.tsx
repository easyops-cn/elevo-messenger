import React from 'react';
import { MsgType } from 'matrix-js-sdk';
import { HTMLReactParserOptions } from 'html-react-parser';
import { Opts } from 'linkifyjs';
import { config } from 'folds';
import {
  AudioContent,
  DownloadFile,
  FileContent,
  ImageContent,
  MAudio,
  MBadEncrypted,
  MEmote,
  MFile,
  MImage,
  MLocation,
  MNotice,
  MText,
  MVideo,
  ReadPdfFile,
  ReadTextFile,
  RenderBody,
  ThumbnailContent,
  UnsupportedContent,
  VideoContent,
} from './message';
import { UrlPreviewCard, UrlPreviewHolder } from './url-preview';
import { Image, MediaControl, Video } from './media';
import { ImageViewer } from './image-viewer';
import { PdfViewer } from './Pdf-viewer';
import { TextViewer } from './text-viewer';
import { testMatrixTo } from '../plugins/matrix-to';
import { IImageContent } from '../../types/matrix/common';
import { useMatrixClient } from '../hooks/useMatrixClient';
import { useMediaAuthentication } from '../hooks/useMediaAuthentication';
import { mxcUrlToHttp } from '../utils/matrix';
import { openDesktopFilePreview, type DesktopPreviewViewerType } from '../utils/desktopPreview';
import {
  READABLE_EXT_TO_MIME_TYPE,
  READABLE_TEXT_MIME_TYPES,
  getFileNameExt,
  mimeTypeToExt,
} from '../utils/mimeTypes';

type RenderMessageContentProps = {
  displayName: string;
  msgType: string;
  ts: number;
  eventId?: string;
  edited?: boolean;
  getContent: <T>() => T;
  urlPreview?: boolean;
  highlightRegex?: RegExp;
  htmlReactParserOptions: HTMLReactParserOptions;
  linkifyOpts: Opts;
  outlineAttachment?: boolean;
};
export function RenderMessageContent({
  displayName,
  msgType,
  ts,
  eventId,
  edited,
  getContent,
  urlPreview,
  highlightRegex,
  htmlReactParserOptions,
  linkifyOpts,
  outlineAttachment,
}: RenderMessageContentProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();

  const renderUrlsPreview = (urls: string[]) => {
    const filteredUrls = urls.filter((url) => !testMatrixTo(url));
    if (filteredUrls.length === 0) return undefined;
    return (
      <UrlPreviewHolder>
        {filteredUrls.map((url) => (
          <UrlPreviewCard key={url} url={url} ts={ts} />
        ))}
      </UrlPreviewHolder>
    );
  };
  const renderCaption = () => {
    const content: IImageContent = getContent();
    if (content.filename && content.filename !== content.body) {
      return (
        <MText
          style={{ marginTop: config.space.S200 }}
          edited={edited}
          content={content}
          renderBody={(props) => (
            <RenderBody
              {...props}
              highlightRegex={highlightRegex}
              htmlReactParserOptions={htmlReactParserOptions}
              linkifyOpts={linkifyOpts}
            />
          )}
          renderUrlsPreview={urlPreview ? renderUrlsPreview : undefined}
          eventId={eventId}
        />
      );
    }
    return null;
  };

  const renderFile = () => (
    <>
      <MFile
        content={getContent()}
        renderFileContent={({ body, mimeType, info, encInfo, url }) => (
          <FileContent
            body={body}
            mimeType={mimeType}
            renderAsPdfFile={() => (
              <ReadPdfFile
                body={body}
                mimeType={mimeType}
                url={url}
                encInfo={encInfo}
                onOpenDesktop={async () => {
                  const mediaUrl = mxcUrlToHttp(mx, url, useAuthentication);
                  return !!(
                    mediaUrl &&
                    (await openDesktopFilePreview({
                      viewerType: 'pdf',
                      name: body,
                      mimeType,
                      size: info.size,
                      mediaUrl,
                      encInfo,
                    }))
                  );
                }}
                renderViewer={(p) => <PdfViewer {...p} />}
              />
            )}
            renderAsTextFile={() => (
              <ReadTextFile
                body={body}
                mimeType={mimeType}
                url={url}
                encInfo={encInfo}
                onOpenDesktop={async () => {
                  const mediaUrl = mxcUrlToHttp(mx, url, useAuthentication);
                  return !!(
                    mediaUrl &&
                    (await openDesktopFilePreview({
                      viewerType: 'text',
                      name: body,
                      mimeType,
                      size: info.size,
                      mediaUrl,
                      encInfo,
                    }))
                  );
                }}
                renderViewer={(p) => <TextViewer {...p} />}
              />
            )}
          >
            <DownloadFile
              body={body}
              mimeType={mimeType}
              url={url}
              encInfo={encInfo}
              info={info}
              onOpenDesktop={async () => {
                const mediaUrl = mxcUrlToHttp(mx, url, useAuthentication);
                if (!mediaUrl) return false;
                let viewerType: DesktopPreviewViewerType = 'file';
                if (mimeType.startsWith('image/')) viewerType = 'image';
                else if (mimeType.startsWith('video/')) viewerType = 'video';
                else if (mimeType.startsWith('audio/')) viewerType = 'audio';
                else if (mimeType === 'application/pdf') viewerType = 'pdf';
                else if (
                  READABLE_TEXT_MIME_TYPES.includes(mimeType) ||
                  READABLE_EXT_TO_MIME_TYPE[getFileNameExt(body)]
                ) {
                  viewerType = 'text';
                }
                return openDesktopFilePreview({
                  viewerType,
                  name: body,
                  mimeType,
                  size: info.size,
                  mediaUrl,
                  encInfo,
                  langName:
                    viewerType === 'text'
                      ? READABLE_TEXT_MIME_TYPES.includes(mimeType)
                        ? mimeTypeToExt(mimeType)
                        : mimeTypeToExt(READABLE_EXT_TO_MIME_TYPE[getFileNameExt(body)] ?? mimeType)
                      : undefined,
                });
              }}
            />
          </FileContent>
        )}
      />
      {renderCaption()}
    </>
  );

  if (msgType === MsgType.Text) {
    return (
      <MText
        edited={edited}
        content={getContent()}
        renderBody={(props) => (
          <RenderBody
            {...props}
            highlightRegex={highlightRegex}
            htmlReactParserOptions={htmlReactParserOptions}
            linkifyOpts={linkifyOpts}
          />
        )}
        renderUrlsPreview={urlPreview ? renderUrlsPreview : undefined}
        eventId={eventId}
      />
    );
  }

  if (msgType === MsgType.Emote) {
    return (
      <MEmote
        displayName={displayName}
        edited={edited}
        content={getContent()}
        renderBody={(props) => (
          <RenderBody
            {...props}
            highlightRegex={highlightRegex}
            htmlReactParserOptions={htmlReactParserOptions}
            linkifyOpts={linkifyOpts}
          />
        )}
        renderUrlsPreview={urlPreview ? renderUrlsPreview : undefined}
      />
    );
  }

  if (msgType === MsgType.Notice) {
    return (
      <MNotice
        edited={edited}
        content={getContent()}
        renderBody={(props) => (
          <RenderBody
            {...props}
            highlightRegex={highlightRegex}
            htmlReactParserOptions={htmlReactParserOptions}
            linkifyOpts={linkifyOpts}
          />
        )}
        renderUrlsPreview={urlPreview ? renderUrlsPreview : undefined}
      />
    );
  }

  if (msgType === MsgType.Image) {
    return (
      <>
        <MImage
          content={getContent()}
          renderImageContent={(props) => (
            <ImageContent
              {...props}
              renderImage={(p) => <Image {...p} loading="lazy" />}
              renderViewer={(p) => <ImageViewer {...p} />}
            />
          )}
        />
        {renderCaption()}
      </>
    );
  }

  if (msgType === MsgType.Video) {
    return (
      <>
        <MVideo
          content={getContent()}
          renderAsFile={renderFile}
          renderVideoContent={({ body, info, ...props }) => (
            <VideoContent
              body={body}
              info={info}
              {...props}
              renderThumbnail={() => (
                <ThumbnailContent
                  info={info}
                  renderImage={(src) => (
                    <Image alt={body} title={body} src={src} loading="lazy" />
                  )}
                />
              )}
              renderVideo={(p) => <Video {...p} />}
            />
          )}
        />
        {renderCaption()}
      </>
    );
  }

  if (msgType === MsgType.Audio) {
    return (
      <>
        <MAudio
          content={getContent()}
          renderAsFile={renderFile}
          renderAudioContent={(props) => (
            <AudioContent {...props} renderMediaControl={(p) => <MediaControl {...p} />} />
          )}
          outlined={outlineAttachment}
        />
        {renderCaption()}
      </>
    );
  }

  if (msgType === MsgType.File) {
    return renderFile();
  }

  if (msgType === MsgType.Location) {
    return <MLocation content={getContent()} />;
  }

  if (msgType === 'm.bad.encrypted') {
    return <MBadEncrypted />;
  }

  return <UnsupportedContent />;
}
