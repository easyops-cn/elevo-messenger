export type ReasoningMetadata = {
  duration_ms?: number;
  streaming?: boolean;
  empty?: boolean;
};

export function isReasoningEmpty(metadata: ReasoningMetadata | undefined, trimmedBody: string) {
  return metadata?.empty === true || trimmedBody === '';
}
