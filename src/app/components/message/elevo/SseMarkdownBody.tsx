import React, { CSSProperties, ReactNode, useEffect, useMemo, useState } from 'react';
import { z } from 'zod/v4';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { color, config } from 'folds';
import { useTranslation } from 'react-i18next';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { trimReplyFromBody } from '../../../utils/room';
import { trimTrailingSlash } from '../../../utils/common';
import { MText } from '../MsgTypeRenderers';
import { MessageTextBody } from '../layout';

const SseRenderSchema = z.object({
  bridgeId: z.string().regex(/^[a-zA-Z0-9_-]+$/, 'bridgeId must be a valid identifier'),
  stepId: z.string(),
  streaming: z.boolean(),
});

export type SseRenderData = z.infer<typeof SseRenderSchema>;

export function parseSseRender(content: Record<string, unknown>): SseRenderData | undefined {
  const result = SseRenderSchema.safeParse(content['vip.elevo.sse']);
  return result.success ? result.data : undefined;
}

type RenderBodyProps = {
  body: string;
  customBody?: string;
};

export type SseMarkdownBodyProps = {
  sseData: SseRenderData;
  reasoning?: boolean;
  renderBody: (props: RenderBodyProps) => ReactNode;
  renderUrlsPreview?: (urls: string[]) => ReactNode;
  style?: CSSProperties;
};

export function SseMarkdownBody({ sseData, reasoning, renderBody, renderUrlsPreview, style }: SseMarkdownBodyProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const homeserverBaseUrl = mx.getHomeserverUrl();
  const [streamedBody, setStreamedBody] = useState('');
  const [streamError, setStreamError] = useState(false);
  const [streamDone, setStreamDone] = useState(false);

  useEffect(() => {
    setStreamedBody('');
    setStreamError(false);
    setStreamDone(false);

    const abortController = new AbortController();
    const decoder = new TextDecoder();
    let buffer = '';

    const readSse = async () => {
      try {
        const response = await fetch(
          `${trimTrailingSlash(homeserverBaseUrl)}/${sseData.bridgeId}-bridge/sse/step/${encodeURIComponent(sseData.stepId)}`,
          {
            method: 'GET',
            headers: {
              Accept: 'text/event-stream',
            },
            signal: abortController.signal,
          }
        );

        if (!response.ok || !response.body) {
          throw new Error(`SSE request failed with status: ${response.status}`);
        }

        const reader = response.body.getReader();

        const readNextChunk = async (): Promise<void> => {
          const { done, value } = await reader.read();
          if (done) return;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split(/\r?\n\r?\n/);
          buffer = events.pop() ?? '';

          events.forEach((eventBlock) => {
            const dataLines = eventBlock
              .split(/\r?\n/)
              .filter((line) => line.startsWith('data:'))
              .map((line) => line.slice(5).trimStart());

            if (dataLines.length === 0) return;

            const dataText = dataLines.join('\n');
            try {
              const payload: unknown = JSON.parse(dataText);
              if (
                typeof payload === 'object' &&
                payload !== null &&
                'type' in payload &&
                'delta' in payload &&
                payload.type === 'text-delta' &&
                typeof payload.delta === 'string'
              ) {
                setStreamedBody((prev) => prev + payload.delta);
              }
            } catch {
              // Ignore malformed SSE payload chunks and continue consuming stream.
            }
          });

          await readNextChunk();
        };

        await readNextChunk();
      } catch (error) {
        if (!abortController.signal.aborted) {
          setStreamError(true);
          // eslint-disable-next-line no-console
          console.error('Failed to consume step SSE stream:', error);
        }
      } finally {
        setStreamDone(true);
      }
    };

    readSse();

    return () => {
      abortController.abort();
    };
  }, [homeserverBaseUrl, sseData.bridgeId, sseData.stepId]);

  const markdownBody = !streamError ? streamedBody : 'Error loading streaming content.';
  
  const sanitizedHtml = useMemo(() => {
    const trimmedBody = trimReplyFromBody(markdownBody);
    const parsed = marked.parse(trimmedBody, { gfm: true, breaks: true }) as string;
    return DOMPurify.sanitize(typeof parsed === 'string' ? parsed : '');
  }, [markdownBody]);

  const content = useMemo(() => ({
    body: markdownBody,
    formatted_body: sanitizedHtml,
    ...(reasoning ? { 'vip.elevo.reasoning': {} } : null),
  }), [markdownBody, sanitizedHtml, reasoning]);

  if (!markdownBody && !streamDone) {
    return (
      <MessageTextBody style={{...style, fontStyle: 'italic', opacity: config.opacity.P300 }}>
        {t('room.typing')}
      </MessageTextBody>
    );
  }

  return (
    <MText
      content={content}
      renderBody={renderBody}
      renderUrlsPreview={renderUrlsPreview}
      style={streamError ? {...style, color: color.Critical.Main, fontStyle: 'italic' } : style}
    />
  );
}
