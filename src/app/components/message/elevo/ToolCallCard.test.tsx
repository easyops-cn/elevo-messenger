import { describe, expect, it } from 'vitest';

describe('parseToolCall', () => {
  it('accepts ref-only tool call events without inline input or output', async () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined,
      },
      configurable: true,
    });
    const { parseToolCall } = await import('./ToolCallCard');

    expect(
      parseToolCall({
        'vip.elevo.tool_call': {
          toolCallId: 'call-1',
          conversationId: 'conv-1',
          name: 'Bash',
          title: 'Run tests',
          status: 'completed',
          state: 'output-available',
          ref: {
            bridgeId: 'matrix-llm-bot',
            toolCallPath: '2026-06-23/00000000-0000-4000-8000-000000000000.json',
          },
        },
      }),
    ).toMatchObject({
      toolCallId: 'call-1',
      name: 'Bash',
      ref: {
        bridgeId: 'matrix-llm-bot',
        toolCallPath: '2026-06-23/00000000-0000-4000-8000-000000000000.json',
      },
    });
  });
});
