import React, { CSSProperties, useMemo, useState } from 'react';
import { z } from 'zod/v4';
import { Box, Icon, Icons, Text, color } from 'folds';
import * as css from './ToolCallCard.css';

const ToolCallSchema = z.object({
  name: z.string(),
  title: z.string().optional(),
  input: z.unknown(),
  output: z.unknown().optional(),
  error: z.unknown().optional(),
  status: z.enum(['inprogress', 'completed', 'failed']),
});

export type ToolCallData = z.infer<typeof ToolCallSchema>;

export function parseToolCall(content: Record<string, unknown>): ToolCallData | undefined {
  const result = ToolCallSchema.safeParse(content['vip.elevo.tool_call']);
  return result.success ? result.data : undefined;
}

function tryJsonPrettier(val: unknown): string {
  if (typeof val !== 'string') return JSON.stringify(val, null, 2);
  try {
    const data = JSON.parse(val);
    if (typeof data === 'string') return data;
    return JSON.stringify(data, null, 2);
  } catch {
    return val;
  }
}

type ToolCallCardProps = { data: ToolCallData; style?: CSSProperties };
export function ToolCallCard({ data, style }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const iconColor = data.status === 'completed' ? color.Success.Main : data.status === 'failed' ? color.Critical.Main : color.Secondary.Main;

  const prettierInput = useMemo(() => tryJsonPrettier(data.input), [data.input]);
  const prettierOutput = useMemo(() => tryJsonPrettier(data.output), [data.output]);

  return (
    <Box style={style} direction="Column" gap="100">
      <div
        className={css.ToolCallHeader}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <Icon src={Icons.Terminal} size="100" style={{ color: iconColor }} />
        <Text size="T200" priority="300">
          {data.title || data.name}
        </Text>
        <Icon src={expanded ? Icons.ChevronBottom : Icons.ChevronRight} size="100" />
      </div>
      {expanded && (
        <div className={css.ToolCallBody}>
          <Text size="T200" priority="300" className={css.Label}>
            Input
          </Text>
          <pre className={css.Preformatted}>{prettierInput}</pre>
          {data.status === "completed" && data.output !== undefined && (
            <>
              <div className={css.Divider} />
              <Text size="T200" priority="300" className={css.Label}>
                Output
              </Text>
              <pre className={css.Preformatted}>{prettierOutput}</pre>
            </>
          )}
          {data.status === "failed" && data.error !== undefined && (
            <>
              <div className={css.Divider} />
              <Text size="T200" priority="300" className={css.Label}>
                Error
              </Text>
              <pre className={css.ErrorPre}>{String(data.error)}</pre>
            </>
          )}
        </div>
      )}
    </Box>
  );
}
