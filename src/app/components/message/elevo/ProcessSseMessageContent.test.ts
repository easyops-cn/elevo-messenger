import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { ProcessSseState } from './ProcessSseMessageContent';

const initialState: ProcessSseState = {
  blocks: [],
  connected: false,
  closed: false,
  error: null,
};

let processSseModule: typeof import('./ProcessSseMessageContent');

beforeAll(async () => {
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  });
  processSseModule = await import('./ProcessSseMessageContent');
});

describe('parseProcessSseRender', () => {
  it('accepts agent process SSE metadata', () => {
    expect(
      processSseModule.parseProcessSseRender({
        'vip.elevo.sse': {
          kind: 'agent-process',
          bridgeId: 'matrix-llm-bot',
          processId: 'process-1',
          streaming: true,
          hasProcessContent: true,
          hasResponseContent: false,
        },
      }),
    ).toEqual({
      kind: 'agent-process',
      bridgeId: 'matrix-llm-bot',
      processId: 'process-1',
      streaming: true,
      hasProcessContent: true,
      hasResponseContent: false,
    });
  });

  it('rejects legacy step SSE metadata', () => {
    expect(
      processSseModule.parseProcessSseRender({
        'vip.elevo.sse': {
          bridgeId: 'matrix-llm-bot',
          stepId: 'step-1',
          streaming: true,
        },
      }),
    ).toBeUndefined();
  });

  it('rejects invalid bridge ids', () => {
    expect(
      processSseModule.parseProcessSseRender({
        'vip.elevo.sse': {
          kind: 'agent-process',
          bridgeId: '../matrix-llm-bot',
          processId: 'process-1',
        },
      }),
    ).toBeUndefined();
  });
});

describe('process stream URL', () => {
  it('normalizes bridge provider and encodes process id', () => {
    expect(
      processSseModule.processStreamUrl('https://example.test/_matrix', 'matrix-llm-bot', 'p/1'),
    ).toBe('https://example.test/matrix-llm-bot-bridge/process/p%2F1/stream');
  });

  it('keeps already-normalized bridge providers', () => {
    expect(processSseModule.normalizeBridgeProvider('matrix-llm-bot-bridge')).toBe(
      'matrix-llm-bot-bridge',
    );
  });

  it('rejects invalid homeservers', () => {
    expect(processSseModule.processStreamUrl('file:///tmp', 'matrix-llm-bot', 'p1')).toBeNull();
  });
});

describe('readSseData', () => {
  it('reads chunked, multiline, and unterminated SSE data events', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('event: message\ndata: {"a":'));
        controller.enqueue(encoder.encode('1}\ndata: {"b":2}\n\n'));
        controller.enqueue(encoder.encode('data: {"c":3}'));
        controller.close();
      },
    });

    const data: string[] = [];
    for await (const eventData of processSseModule.readSseData(stream)) {
      data.push(eventData);
    }

    expect(data).toEqual(['{"a":1}\n{"b":2}', '{"c":3}']);
  });
});

describe('applyProcessSseChunk', () => {
  it('keeps first chunk order while updating existing blocks', () => {
    const state = [
      { type: 'reasoning-start', reasoningId: 'r1' },
      { type: 'text-start', textId: 't1' },
      { type: 'reasoning-delta', reasoningId: 'r1', delta: 'think' },
      { type: 'text-delta', textId: 't1', delta: 'answer' },
      { type: 'reasoning-end', reasoningId: 'r1', durationMs: 1234 },
      { type: 'text-end', textId: 't1' },
    ].reduce(processSseModule.applyProcessSseChunk, initialState);

    expect(state.blocks.map((block) => block.kind)).toEqual(['reasoning', 'text']);
    expect(state.blocks[0]).toMatchObject({
      id: 'reasoning:r1',
      kind: 'reasoning',
      text: 'think',
      active: false,
      durationMs: 1234,
    });
    expect(state.blocks[1]).toMatchObject({
      id: 'text:t1',
      kind: 'text',
      text: 'answer',
      active: false,
    });
  });

  it('maps tool input, output, and errors into tool call blocks', () => {
    const state = [
      { type: 'tool-input-available', toolCallId: 'tool-1', name: 'Bash', input: 'ls' },
      {
        type: 'tool-output-error',
        toolCallId: 'tool-1',
        name: 'Bash',
        input: 'ls',
        errorText: 'failed',
      },
    ].reduce(processSseModule.applyProcessSseChunk, initialState);

    expect(state.blocks).toHaveLength(1);
    expect(state.blocks[0]).toMatchObject({
      id: 'tool:tool-1',
      kind: 'tool',
      toolCall: {
        toolCallId: 'tool-1',
        name: 'Bash',
        input: 'ls',
        error: 'failed',
        status: 'failed',
      },
    });
  });

  it('maps final text, errorText, and plan text chunks', () => {
    const state = [
      { type: 'text', id: 'a', text: 'answer' },
      { type: 'error', id: 'b', errorText: 'boom' },
      { type: 'plan-text', id: 'c', text: 'plan' },
    ].reduce(processSseModule.applyProcessSseChunk, initialState);

    expect(state.blocks.map((block) => [block.kind, 'text' in block ? block.text : ''])).toEqual([
      ['text', 'answer'],
      ['error', 'boom'],
      ['planText', 'plan'],
    ]);
  });
});
