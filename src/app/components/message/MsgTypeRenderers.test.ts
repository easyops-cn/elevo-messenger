import { describe, expect, it } from 'vitest';
import { isReasoningEmpty } from './reasoning';

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
});
