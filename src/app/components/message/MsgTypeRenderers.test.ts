import { describe, expect, it } from 'vitest';
import { isReasoningEmpty, parseReasoningRef } from './reasoning';

describe('isReasoningEmpty', () => {
  it('treats explicit empty reasoning metadata as empty even when body has fallback text', () => {
    expect(isReasoningEmpty({ duration_ms: 4200, empty: true }, 'Thought for 4 seconds')).toBe(
      true,
    );
  });

  it('keeps non-empty legacy reasoning expandable', () => {
    expect(isReasoningEmpty({ duration_ms: 4200 }, 'actual reasoning')).toBe(false);
  });

  it('keeps legacy empty-body reasoning non-expandable', () => {
    expect(isReasoningEmpty({ duration_ms: 4200 }, '')).toBe(true);
  });

  it('keeps ref-only reasoning expandable', () => {
    expect(
      isReasoningEmpty(
        {
          duration_ms: 4200,
          ref: {
            reasoningPath: '2026-06-23/00000000-0000-4000-8000-000000000000.json',
            bridgeId: 'matrix-llm-bot',
          },
        },
        'Thought for 4 seconds',
      ),
    ).toBe(false);
  });
});

describe('parseReasoningRef', () => {
  it('accepts valid reasoning refs', () => {
    expect(
      parseReasoningRef({
        reasoningPath: '2026-06-23/00000000-0000-4000-8000-000000000000.json',
        bridgeId: 'matrix-llm-bot',
      }),
    ).toEqual({
      reasoningPath: '2026-06-23/00000000-0000-4000-8000-000000000000.json',
      bridgeId: 'matrix-llm-bot',
    });
  });

  it('rejects invalid bridge ids', () => {
    expect(
      parseReasoningRef({
        reasoningPath: '2026-06-23/00000000-0000-4000-8000-000000000000.json',
        bridgeId: '../matrix-llm-bot',
      }),
    ).toBeUndefined();
  });
});
