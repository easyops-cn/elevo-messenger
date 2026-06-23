export type ReasoningMetadata = {
  duration_ms?: number;
  streaming?: boolean;
  empty?: boolean;
  ref?: ReasoningRef;
};

export type ReasoningRef = {
  reasoningPath: string;
  bridgeId: string;
};

export function parseReasoningRef(value: unknown): ReasoningRef | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const ref = value as Record<string, unknown>;
  if (
    typeof ref.reasoningPath !== 'string' ||
    ref.reasoningPath.length === 0 ||
    typeof ref.bridgeId !== 'string' ||
    !/^[a-zA-Z0-9_-]+$/.test(ref.bridgeId)
  ) {
    return undefined;
  }
  return {
    reasoningPath: ref.reasoningPath,
    bridgeId: ref.bridgeId,
  };
}

export function isReasoningEmpty(metadata: ReasoningMetadata | undefined, trimmedBody: string) {
  return metadata?.empty === true || (!parseReasoningRef(metadata?.ref) && trimmedBody === '');
}
