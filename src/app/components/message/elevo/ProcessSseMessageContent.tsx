import React, { CSSProperties, ReactNode, useEffect, useMemo, useState } from 'react';
import { Box, Icon, Icons, Text, color } from 'folds';
import { useTranslation } from 'react-i18next';
import { z } from 'zod/v4';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { JUMBO_EMOJI_REG, URL_REG } from '../../../utils/regex';
import { trimReplyFromBody } from '../../../utils/room';
import type { CodeViewWorkspaceContext } from '../../code-view';
import { MessageTextBody } from '../layout';
import { ReasoningCard } from './ReasoningCard';
import { ToolCallCard, type ToolCallData } from './ToolCallCard';
import { trimTrailingSlash } from '../../../utils/common';
import { LoaderCircleIcon } from '../../../icons/LoaderCircleIcon';
import { CircleAlertIcon } from '../../../icons/CircleAlertIcon';
import * as css from './ProcessSseMessageContent.css';

const ProcessSseRenderSchema = z.object({
  kind: z.literal('agent-process'),
  bridgeId: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  processId: z.string().min(1),
  streaming: z.boolean().optional(),
  hasProcessContent: z.boolean().optional(),
  hasResponseContent: z.boolean().optional(),
});

export type ProcessSseRenderData = z.infer<typeof ProcessSseRenderSchema>;

export function parseProcessSseRender(
  content: Record<string, unknown>,
): ProcessSseRenderData | undefined {
  const result = ProcessSseRenderSchema.safeParse(content['vip.elevo.sse']);
  return result.success ? result.data : undefined;
}

type ProcessSseTextBlock = {
  id: string;
  kind: 'text' | 'reasoning' | 'error' | 'planText';
  text: string;
  active: boolean;
  durationMs?: number | null;
};

export type ProcessSseBlock =
  | ProcessSseTextBlock
  | {
      id: string;
      kind: 'tool';
      toolCall: ToolCallData;
    };

export type ProcessSseState = {
  blocks: ProcessSseBlock[];
  connected: boolean;
  closed: boolean;
  error: string | null;
};

const INITIAL_STATE: ProcessSseState = {
  blocks: [],
  connected: false,
  closed: false,
  error: null,
};

const PROCESS_STREAM_LOAD_ERROR = 'Failed to load process stream';
const PROCESS_STREAM_PARSE_ERROR = 'Failed to parse process stream';

type ProcessSseChunk = {
  type?: unknown;
  [key: string]: unknown;
};

type RenderBodyProps = {
  body: string;
  customBody?: string;
};

type ProcessSseMessageContentProps = {
  processSse: ProcessSseRenderData;
  body: string;
  customBody?: string;
  renderBody: (props: RenderBodyProps) => ReactNode;
  renderUrlsPreview?: (urls: string[]) => ReactNode;
  codeViewWorkspace?: CodeViewWorkspaceContext;
  style?: CSSProperties;
};

export function processStreamUrl(
  homeserver: string | null | undefined,
  bridgeId: string | null | undefined,
  processId: string,
): string | null {
  const base = normalizeHomeserver(homeserver);
  if (!base) return null;

  const encodedProcessId = encodeURIComponent(processId);
  const provider = normalizeBridgeProvider(bridgeId);
  const path = provider
    ? `/${provider}/process/${encodedProcessId}/stream`
    : `/process/${encodedProcessId}/stream`;

  return new URL(path, base).toString();
}

export function normalizeHomeserver(homeserver: string | null | undefined): string | null {
  const value = homeserver?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return trimTrailingSlash(url.toString());
  } catch {
    return null;
  }
}

export function normalizeBridgeProvider(bridgeId: string | null | undefined): string | null {
  const value = bridgeId?.trim().replace(/^\/+|\/+$/g, '');
  if (!value) return null;
  if (!/^[A-Za-z0-9_-]+(?:-bridge)?$/.test(value)) return null;
  return value.endsWith('-bridge') ? value : `${value}-bridge`;
}

export function applyProcessSseChunk(state: ProcessSseState, rawChunk: unknown): ProcessSseState {
  if (!isRecord(rawChunk) || typeof rawChunk.type !== 'string') return state;
  const chunk = rawChunk as ProcessSseChunk;

  switch (chunk.type) {
    case 'text-start':
      return upsertTextBlock(state, textBlockId(chunk, 'text'), 'text', '', true, false);
    case 'text-delta':
      return appendTextBlock(
        state,
        textBlockId(chunk, 'text'),
        'text',
        stringField(chunk, 'delta'),
      );
    case 'text-end':
      return finishTextBlock(state, textBlockId(chunk, 'text'), 'text');
    case 'reasoning-start':
      return upsertTextBlock(state, textBlockId(chunk, 'reasoning'), 'reasoning', '', true, false);
    case 'reasoning-delta':
      return appendTextBlock(
        state,
        textBlockId(chunk, 'reasoning'),
        'reasoning',
        stringField(chunk, 'delta'),
      );
    case 'reasoning-end':
      return finishTextBlock(state, textBlockId(chunk, 'reasoning'), 'reasoning', {
        text: stringField(chunk, 'reasoning'),
        durationMs: numberOrNull(chunk.durationMs),
      });
    case 'tool-input-available':
      return upsertToolBlock(state, chunk, 'inprogress');
    case 'tool-output-available':
      return upsertToolBlock(state, chunk, 'completed');
    case 'tool-output-error':
      return upsertToolBlock(state, chunk, 'failed');
    case 'text':
      return upsertTextBlock(
        state,
        textBlockId(chunk, 'text'),
        'text',
        stringField(chunk, 'text') || stringField(chunk, 'delta'),
        false,
        true,
      );
    case 'error':
      return upsertTextBlock(
        state,
        textBlockId(chunk, 'error'),
        'error',
        stringField(chunk, 'errorText') || stringField(chunk, 'text'),
        false,
        true,
      );
    case 'plan-text':
      return upsertTextBlock(
        state,
        textBlockId(chunk, 'plan'),
        'planText',
        stringField(chunk, 'text') || stringField(chunk, 'delta'),
        false,
        true,
      );
    default:
      return state;
  }
}

export async function* readSseData(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string, void, void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() ?? '';

      for (const eventBlock of events) {
        const data = sseDataFromEventBlock(eventBlock);
        if (data !== null) yield data;
      }
    }

    buffer += decoder.decode();
    if (buffer) {
      const data = sseDataFromEventBlock(buffer);
      if (data !== null) yield data;
    }
  } finally {
    reader.releaseLock();
  }
}

function useProcessSseStream(
  homeserver: string | null | undefined,
  bridgeId: string | null | undefined,
  processId: string | null | undefined,
  enabled: boolean,
): ProcessSseState {
  const url = useMemo(
    () => (enabled && processId ? processStreamUrl(homeserver, bridgeId, processId) : null),
    [bridgeId, enabled, homeserver, processId],
  );
  const [state, setState] = useState<ProcessSseState>(INITIAL_STATE);

  useEffect(() => {
    if (!url) {
      setState(
        enabled && processId
          ? { ...INITIAL_STATE, error: PROCESS_STREAM_LOAD_ERROR }
          : INITIAL_STATE,
      );
      return;
    }

    let cancelled = false;
    const abortController = new AbortController();
    setState({ ...INITIAL_STATE, connected: true });

    const readStream = async () => {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
          },
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Process stream request failed with status: ${response.status}`);
        }

        for await (const data of readSseData(response.body)) {
          if (cancelled) return;

          try {
            const chunk = JSON.parse(data);
            setState((current) => applyProcessSseChunk(current, chunk));
          } catch {
            setState((current) => ({ ...current, error: PROCESS_STREAM_PARSE_ERROR }));
          }
        }

        if (cancelled) return;
        setState((current) => ({ ...current, connected: false, closed: true }));
      } catch (error) {
        if (cancelled || abortController.signal.aborted) return;
        setState((current) => ({
          ...current,
          connected: false,
          error: PROCESS_STREAM_LOAD_ERROR,
        }));
        console.error('Failed to consume process SSE stream:', error);
      }
    };

    readStream();

    return () => {
      cancelled = true;
      abortController.abort();
      setState((current) => ({ ...current, connected: false }));
    };
  }, [enabled, processId, url]);

  return state;
}

export function ProcessSseMessageContent({
  processSse,
  body,
  customBody,
  renderBody,
  renderUrlsPreview,
  codeViewWorkspace,
  style,
}: ProcessSseMessageContentProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const shouldStream = processSse.streaming === true;
  const canHaveProcessContent = processSse.hasProcessContent !== false;
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const stream = useProcessSseStream(
    mx.getHomeserverUrl(),
    processSse.bridgeId,
    processSse.processId,
    shouldStream || (!shouldStream && detailsExpanded && canHaveProcessContent),
  );
  const fallbackBodyBlock = useMemo<ProcessSseBlock | undefined>(() => {
    if (!body.trim()) return undefined;
    return { id: 'message-body', kind: 'text', text: body, active: false };
  }, [body]);
  const visibleBlocks =
    stream.blocks.length > 0 ? stream.blocks : fallbackBodyBlock ? [fallbackBodyBlock] : [];
  const detailBlocks = visibleBlocks.filter(
    (block) => block.kind === 'reasoning' || block.kind === 'tool',
  );
  const canExpand = !shouldStream && canHaveProcessContent;
  const loadingDetails =
    detailsExpanded && !stream.closed && !stream.error && detailBlocks.length === 0;
  const trimmedBody = trimReplyFromBody(body);
  const urlsMatch = renderUrlsPreview && trimmedBody.match(URL_REG);
  const urls = urlsMatch ? [...new Set(urlsMatch)] : undefined;

  if (shouldStream) {
    return (
      <Box className={css.ProcessSseMessage} style={style} direction="Column">
        {visibleBlocks.map((block) => (
          <ProcessSseBlockView
            key={block.id}
            block={block}
            renderBody={renderBody}
            codeViewWorkspace={codeViewWorkspace}
            includeResponseBlocks
          />
        ))}
        {stream.error && <ProcessSseStatus errorText={t('message.processLoadError')} critical />}
        {stream.connected && visibleBlocks.length === 0 && (
          <ProcessSseStatus loading text={t('message.thinking')} />
        )}
      </Box>
    );
  }

  return (
    <Box className={css.ProcessSseMessage} style={style} direction="Column">
      {canExpand && (
        <div>
          <button
            type="button"
            className={css.ProcessSseDetailsToggle}
            onClick={() => setDetailsExpanded((expanded) => !expanded)}
          >
            <Text size="T300" as="span">
              {t('message.processDetails')}
            </Text>
            {loadingDetails ? (
              <Icon src={LoaderCircleIcon} size="100" className={css.ProcessSseSpinner} />
            ) : (
              <Icon src={detailsExpanded ? Icons.ChevronBottom : Icons.ChevronRight} size="100" />
            )}
          </button>
          {detailsExpanded && (
            <div className={css.ProcessSseDetails}>
              {detailBlocks.length > 0 ? (
                detailBlocks.map((block) => (
                  <ProcessSseBlockView
                    key={block.id}
                    block={block}
                    renderBody={renderBody}
                    codeViewWorkspace={codeViewWorkspace}
                    includeResponseBlocks={false}
                  />
                ))
              ) : stream.error ? (
                <ProcessSseStatus errorText={t('message.processLoadError')} critical />
              ) : stream.closed ? (
                <Text size="T300" priority="300">
                  {t('message.processDetailsUnavailable')}
                </Text>
              ) : (
                <ProcessSseStatus loading text={t('message.processLoading')} />
              )}
            </div>
          )}
        </div>
      )}
      {trimmedBody ? (
        <>
          <MessageTextBody
            preWrap={typeof customBody !== 'string'}
            jumboEmoji={JUMBO_EMOJI_REG.test(trimmedBody)}
          >
            {renderBody({
              body: trimmedBody,
              customBody: typeof customBody === 'string' ? customBody : undefined,
            })}
          </MessageTextBody>
          {renderUrlsPreview && urls && urls.length > 0 && renderUrlsPreview(urls)}
        </>
      ) : processSse.hasResponseContent === false ? (
        <Text size="T300" priority="300">
          {t('message.emptyResponse')}
        </Text>
      ) : null}
    </Box>
  );
}

function ProcessSseBlockView({
  block,
  renderBody,
  codeViewWorkspace,
  includeResponseBlocks,
}: {
  block: ProcessSseBlock;
  renderBody: (props: RenderBodyProps) => ReactNode;
  codeViewWorkspace?: CodeViewWorkspaceContext;
  includeResponseBlocks: boolean;
}) {
  if (block.kind === 'tool') {
    return (
      <div className={css.ProcessSseBlock}>
        <ToolCallCard data={block.toolCall} codeViewWorkspace={codeViewWorkspace} />
      </div>
    );
  }

  if (block.kind === 'reasoning') {
    const trimmedBody = trimReplyFromBody(block.text);
    return (
      <ReasoningCard
        durationMs={block.durationMs ?? undefined}
        streaming={block.active}
        empty={!trimmedBody}
        expanded={!!trimmedBody}
      >
        {trimmedBody && (
          <MessageTextBody preWrap jumboEmoji={JUMBO_EMOJI_REG.test(trimmedBody)}>
            {renderBody({ body: trimmedBody })}
          </MessageTextBody>
        )}
      </ReasoningCard>
    );
  }

  if (!includeResponseBlocks) return null;

  const trimmedBody = trimReplyFromBody(block.text);
  if (!trimmedBody) return null;

  return (
    <MessageTextBody
      preWrap
      jumboEmoji={JUMBO_EMOJI_REG.test(trimmedBody)}
      style={block.kind === 'error' ? { color: color.Critical.Main } : undefined}
    >
      {renderBody({ body: trimmedBody })}
    </MessageTextBody>
  );
}

function ProcessSseStatus({
  text,
  errorText,
  loading,
  critical,
}: {
  text?: string;
  errorText?: string;
  loading?: boolean;
  critical?: boolean;
}) {
  return (
    <span className={`${css.ProcessSseStatus} ${critical ? css.ProcessSseError : ''}`}>
      <Icon
        src={critical ? CircleAlertIcon : LoaderCircleIcon}
        size="100"
        className={loading ? css.ProcessSseSpinner : undefined}
      />
      <span>{errorText ?? text}</span>
    </span>
  );
}

function sseDataFromEventBlock(eventBlock: string): string | null {
  const dataLines = eventBlock
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart());

  return dataLines.length > 0 ? dataLines.join('\n') : null;
}

function upsertTextBlock(
  state: ProcessSseState,
  id: string,
  kind: ProcessSseTextBlock['kind'],
  text: string,
  active: boolean,
  append: boolean,
): ProcessSseState {
  const index = state.blocks.findIndex((block) => block.id === id);
  if (index < 0) {
    return {
      ...state,
      blocks: [...state.blocks, { id, kind, text, active }],
    };
  }

  const blocks = state.blocks.slice();
  const existing = blocks[index];
  blocks[index] =
    existing.kind === 'tool'
      ? { id, kind, text, active }
      : { ...existing, kind, text: append ? existing.text + text : text, active };
  return { ...state, blocks };
}

function appendTextBlock(
  state: ProcessSseState,
  id: string,
  kind: Extract<ProcessSseTextBlock['kind'], 'text' | 'reasoning'>,
  delta: string,
): ProcessSseState {
  return upsertTextBlock(state, id, kind, delta, true, true);
}

function finishTextBlock(
  state: ProcessSseState,
  id: string,
  kind: Extract<ProcessSseTextBlock['kind'], 'text' | 'reasoning'>,
  options: { text?: string; durationMs?: number | null } = {},
): ProcessSseState {
  const index = state.blocks.findIndex((block) => block.id === id);
  if (index < 0) return state;

  const blocks = state.blocks.slice();
  const existing = blocks[index];
  if (existing.kind !== 'tool') {
    blocks[index] = {
      ...existing,
      kind,
      text: options.text ? options.text : existing.text,
      active: false,
      ...(options.durationMs === undefined ? {} : { durationMs: options.durationMs }),
    };
  }
  return { ...state, blocks };
}

function upsertToolBlock(
  state: ProcessSseState,
  chunk: ProcessSseChunk,
  status: ToolCallData['status'],
): ProcessSseState {
  const id = stringField(chunk, 'toolCallId') || stringField(chunk, 'id') || 'tool';
  const toolCall: ToolCallData = {
    toolCallId: id,
    conversationId: stringOrUndefined(chunk.conversationId),
    name: stringField(chunk, 'name') || stringField(chunk, 'toolName') || 'tool',
    title: stringOrUndefined(chunk.title),
    input: valueOrUndefined(chunk.input),
    output: valueOrUndefined(chunk.output),
    error: valueOrUndefined(chunk.error) ?? valueOrUndefined(chunk.errorText),
    status,
    state: stringOrUndefined(chunk.state) as ToolCallData['state'],
    metadata: valueOrUndefined(chunk.metadata) as ToolCallData['metadata'],
    summary: valueOrUndefined(chunk.summary),
    ref: valueOrUndefined(chunk.ref) as ToolCallData['ref'],
  };
  const block = { id: `tool:${id}`, kind: 'tool' as const, toolCall };
  const index = state.blocks.findIndex((existing) => existing.id === block.id);
  if (index < 0) return { ...state, blocks: [...state.blocks, block] };

  const blocks = state.blocks.slice();
  blocks[index] = block;
  return { ...state, blocks };
}

function textBlockId(chunk: ProcessSseChunk, fallback: string): string {
  const id =
    stringField(chunk, 'id') ||
    stringField(chunk, 'textId') ||
    stringField(chunk, 'reasoningId') ||
    stringField(chunk, 'blockId') ||
    fallback;
  return `${fallback}:${id}`;
}

function stringField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value : '';
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function valueOrUndefined(value: unknown): unknown | undefined {
  return value === undefined ? undefined : value;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
