/* eslint-disable react/prop-types */
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
import { IAudioInfo, IEncryptedFile, IImageContent } from '../../types/matrix/common';
import { useMatrixClient } from '../hooks/useMatrixClient';
import { useMediaAuthentication } from '../hooks/useMediaAuthentication';
import { mxcUrlToHttp } from '../utils/matrix';
import {
  canOpenDesktopMediaPreview,
  getMediaPreviewLangName,
  openDesktopMediaPreview,
} from '../features/media-preview/openMediaPreview';
import type { ImageContentProps, VideoContentProps } from './message/content';

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
  const useAuth = useMediaAuthentication();

  const getAccessToken = () => (useAuth ? mx.getAccessToken() ?? undefined : undefined);

  const openFilePreview = async (
    type: 'image' | 'pdf' | 'text' | 'unknown',
    name: string,
    mimeType: string,
    url: string,
    encInfo?: IEncryptedFile,
    size?: number
  ): Promise<boolean> => {
    if (!canOpenDesktopMediaPreview()) return false;
    const mediaUrl = mxcUrlToHttp(mx, url, useAuth);
    if (!mediaUrl) return false;
    await openDesktopMediaPreview({
      type,
      name,
      mimeType,
      size,
      mediaUrl,
      accessToken: getAccessToken(),
      encInfo,
      langName: getMediaPreviewLangName(mimeType, name),
    });
    return true;
  };

  const openAudioVideoPreview = async (
    type: 'audio' | 'video',
    name: string,
    mimeType: string,
    url: string,
    encInfo?: IEncryptedFile,
    size?: number,
    info?: IAudioInfo,
    waveform?: number[]
  ): Promise<boolean> => {
    if (!canOpenDesktopMediaPreview()) return false;
    const mediaUrl = mxcUrlToHttp(mx, url, useAuth);
    if (!mediaUrl) return false;
    await openDesktopMediaPreview({
      type,
      name,
      mimeType,
      size,
      mediaUrl,
      accessToken: getAccessToken(),
      encInfo,
      info,
      waveform,
    });
    return true;
  };

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

  const renderImageContent = (props: ImageContentProps) => {
    const { body, mimeType, url, encInfo, info } = props;
    return (
      <ImageContent
        {...props}
        onOpenPreview={() =>
          openFilePreview('image', body, mimeType ?? 'image/*', url, encInfo, info?.size)
        }
        renderImage={(p) => <Image {...p} loading="lazy" />}
        renderViewer={(p) => <ImageViewer {...p} />}
      />
    );
  };

  const renderVideoContent = (props: VideoContentProps) => {
    const { body, info, mimeType, url, encInfo } = props;
    return (
      <VideoContent
        {...props}
        onOpenPreview={() =>
          openAudioVideoPreview('video', body, mimeType, url, encInfo, info.size)
        }
        renderThumbnail={() => (
          <ThumbnailContent
            info={info}
            renderImage={(src) => <Image alt={body} title={body} src={src} loading="lazy" />}
          />
        )}
        renderVideo={(p) => <Video {...p} />}
      />
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
                onOpenPreview={() =>
                  openFilePreview('pdf', body, mimeType, url, encInfo, info.size)
                }
                renderViewer={(p) => <PdfViewer {...p} />}
              />
            )}
            renderAsTextFile={() => (
              <ReadTextFile
                body={body}
                mimeType={mimeType}
                url={url}
                encInfo={encInfo}
                onOpenPreview={() =>
                  openFilePreview('text', body, mimeType, url, encInfo, info.size)
                }
                renderViewer={(p) => <TextViewer {...p} />}
              />
            )}
          >
            <DownloadFile body={body} mimeType={mimeType} url={url} encInfo={encInfo} info={info} />
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
        <MImage content={getContent()} renderImageContent={renderImageContent} />
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
          renderVideoContent={renderVideoContent}
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
          renderAudioPreviewAction={(props) =>
            canOpenDesktopMediaPreview() ? (
              <DownloadFile
                body="Open Preview"
                mimeType={props.mimeType}
                url={props.url}
                encInfo={props.encInfo}
                info={{ size: props.info.size ?? 0 }}
                onClick={() =>
                  openAudioVideoPreview(
                    'audio',
                    props.body,
                    props.mimeType,
                    props.url,
                    props.encInfo,
                    props.info.size,
                    props.info,
                    props.waveform
                  )
                }
              />
            ) : null
          }
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
