import React, { CSSProperties, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod/v4';
import { Box, Icon, Icons, Text, color, toRem } from 'folds';
import * as css from './ToolCallCard.css';
import { DisabledCheckboxIcon } from '../../../icons/DisabledCheckboxIcon';
import { SquareAsteriskIcon } from '../../../icons/SquareAsteriskIcon';
import { AskUserQuestionCard, type AskUserQuestionCardData } from './AskUser';

const ToolCallSchema = z.object({
  name: z.string(),
  title: z.string().optional(),
  input: z.unknown(),
  output: z.unknown().optional(),
  error: z.unknown().optional(),
  status: z.enum(['inprogress', 'completed', 'failed']),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ToolCallData = z.infer<typeof ToolCallSchema>;

const TodoItemSchema = z.object({
  content: z.string(),
  priority: z.string().optional(),
  status: z.enum(['completed', 'in_progress', 'pending']),
});

const TodoListSchema = z.array(TodoItemSchema);

const TodoPayloadSchema = z.object({
  todos: TodoListSchema,
});

const ApplyPatchInputSchema = z.object({
  patchText: z.string(),
});

type ApplyPatchOperation =
  | { kind: 'add'; path: string; content: string }
  | { kind: 'delete'; path: string }
  | { kind: 'update'; path: string; moveTo?: string; diff: string };

const QuestionToolInputSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      header: z.string(),
      options: z.array(
        z.object({
          label: z.string(),
          description: z.string(),
        })
      ),
      multiple: z.boolean().optional(),
    })
  ),
});

type TodoItem = z.infer<typeof TodoItemSchema>;

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

function tryParseJson(val: unknown): unknown {
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}

function parseApplyPatchText(patchText: string): ApplyPatchOperation[] | undefined {
  const lines = patchText.split('\n');

  type Pending = {
    kind: 'add' | 'update' | 'delete';
    path: string;
    moveTo?: string;
    body: string[];
  };
  const state: { operations: ApplyPatchOperation[]; current: Pending | null; done: boolean } = {
    operations: [],
    current: null,
    done: false,
  };

  const flush = () => {
    const { current } = state;
    if (!current) return;
    if (current.kind === 'add') {
      state.operations.push({
        kind: 'add',
        path: current.path,
        content: current.body.join('\n'),
      });
    } else if (current.kind === 'delete') {
      state.operations.push({ kind: 'delete', path: current.path });
    } else {
      state.operations.push({
        kind: 'update',
        path: current.path,
        moveTo: current.moveTo,
        diff: current.body.join('\n'),
      });
    }
    state.current = null;
  };

  lines.forEach((line) => {
    if (state.done) return;
    if (line.startsWith('*** Begin Patch')) return;
    if (line.startsWith('*** End Patch')) {
      flush();
      state.done = true;
      return;
    }
    if (line.startsWith('*** Add File: ')) {
      flush();
      state.current = {
        kind: 'add',
        path: line.slice('*** Add File: '.length).trim(),
        body: [],
      };
      return;
    }
    if (line.startsWith('*** Delete File: ')) {
      flush();
      state.current = {
        kind: 'delete',
        path: line.slice('*** Delete File: '.length).trim(),
        body: [],
      };
      return;
    }
    if (line.startsWith('*** Update File: ')) {
      flush();
      state.current = {
        kind: 'update',
        path: line.slice('*** Update File: '.length).trim(),
        body: [],
      };
      return;
    }
    if (line.startsWith('*** Move to: ') && state.current?.kind === 'update') {
      state.current.moveTo = line.slice('*** Move to: '.length).trim();
      return;
    }
    if (state.current) state.current.body.push(line);
  });
  flush();

  return state.operations.length > 0 ? state.operations : undefined;
}

function getApplyPatchForRender(data: ToolCallData): ApplyPatchOperation[] | undefined {
  if (data.name !== 'apply_patch') return undefined;
  const parsedInput = tryParseJson(data.input);
  const result = ApplyPatchInputSchema.safeParse(parsedInput);
  if (!result.success) return undefined;
  return parseApplyPatchText(result.data.patchText);
}

function applyPatchOperationKey(op: ApplyPatchOperation): string {
  if (op.kind === 'add') return `add:${op.path}:${op.content.length}`;
  if (op.kind === 'delete') return `delete:${op.path}`;
  return `update:${op.path}:${op.moveTo ?? ''}:${op.diff.length}`;
}

type ApplyPatchDiffLineModel = {
  key: string;
  className: string | undefined;
  line: string;
};

function buildApplyPatchDiffLines(text: string): ApplyPatchDiffLineModel[] {
  const result: ApplyPatchDiffLineModel[] = [];
  let offset = 0;
  text.split('\n').forEach((line) => {
    let className: string | undefined;
    if (line.startsWith('+')) className = css.ApplyPatchDiffLineAdded;
    else if (line.startsWith('-')) className = css.ApplyPatchDiffLineRemoved;
    else if (line.startsWith('@@')) className = css.ApplyPatchDiffLineMeta;
    result.push({ key: `${offset}`, className, line });
    offset += line.length + 1;
  });
  return result;
}

type ApplyPatchOperationCardProps = {
  operation: ApplyPatchOperation;
};

function ApplyPatchOperationCard({ operation }: ApplyPatchOperationCardProps) {
  const { t } = useTranslation();

  const label =
    operation.kind === 'add'
      ? t('toolCall.applyPatchAdd')
      : operation.kind === 'delete'
      ? t('toolCall.applyPatchDelete')
      : t('toolCall.applyPatchUpdate');

  const body =
    operation.kind === 'add'
      ? operation.content
      : operation.kind === 'update'
      ? operation.diff
      : null;

  const diffLines = useMemo(
    () => (body !== null ? buildApplyPatchDiffLines(body) : []),
    [body]
  );

  const moveTo = operation.kind === 'update' ? operation.moveTo : undefined;
  const headerClassName =
    body === null
      ? `${css.ApplyPatchHeader} ${css.ApplyPatchHeaderNoBody}`
      : css.ApplyPatchHeader;

  return (
    <div className={css.ApplyPatchCard}>
      <div className={headerClassName}>
        <Text size="L400" priority="400" as="span">
          {label}
        </Text>
        <Text size="T200" priority="300" as="span" truncate className={css.ApplyPatchPath}>
          {operation.path}
        </Text>
        {moveTo && (
          <>
            <Icon src={Icons.ArrowRight} size="50" />
            <Text size="T200" priority="300" as="span" className={css.ApplyPatchMoveTo}>
              {moveTo}
            </Text>
          </>
        )}
      </div>
      {body !== null && (
        <pre className={css.ApplyPatchDiff}>
          {diffLines.map((node) => (
            <span
              key={node.key}
              className={`${css.ApplyPatchDiffLine}${node.className ? ` ${node.className}` : ''}`}
            >
              {`${node.line}\n`}
            </span>
          ))}
        </pre>
      )}
    </div>
  );
}

function getTodosForRender(data: ToolCallData): TodoItem[] | undefined {
  if (data.name?.toLowerCase() !== 'todowrite') return undefined;

  if (data.status === 'completed') {
    const parsedOutput = tryParseJson(data.output);
    const todoList = TodoListSchema.safeParse(parsedOutput);
    if (todoList.success) return todoList.data;
  }

  if (data.status === 'inprogress') {
    const parsedInput = tryParseJson(data.input);
    const todoPayload = TodoPayloadSchema.safeParse(parsedInput);
    if (todoPayload.success) return todoPayload.data.todos;
  }

  return undefined;
}

function getQuestionForRender(data: ToolCallData): AskUserQuestionCardData | undefined {
  if (data.name !== 'question') return undefined;

  const parsedInput = tryParseJson(data.input);
  const result = QuestionToolInputSchema.safeParse(parsedInput);
  if (!result.success) return undefined;

  return {
    questions: result.data.questions.map((question) => ({
      question: question.question,
      header: question.header,
      options: question.options,
      multiSelect: question.multiple ?? false,
    })),
  };
}

type ToolCallCardProps = {
  data: ToolCallData;
  style?: CSSProperties;
  eventId?: string;
  initialHumanSender?: string;
};
export function ToolCallCard({ data, style, eventId, initialHumanSender }: ToolCallCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const iconColor = data.status === 'completed' ? color.Success.Main : data.status === 'failed' ? color.Critical.Main : color.Secondary.Main;

  const prettierInput = useMemo(() => tryJsonPrettier(data.input), [data.input]);
  const prettierOutput = useMemo(() => tryJsonPrettier(data.output), [data.output]);
  const todos = useMemo(() => getTodosForRender(data), [data]);
  const question = useMemo(() => getQuestionForRender(data), [data]);
  const patchOperations = useMemo(() => getApplyPatchForRender(data), [data]);

  const prettierToolName = useMemo(() =>
    data.name.charAt(0).toUpperCase() + data.name.slice(1).replace(/_([a-z])?/g, (_, c) => (` ${c ? c.toUpperCase() : ''}`)),
    [data.name]
  );

  const toolTitle = useMemo(() => {
    if (data.title) return data.title;

    if (typeof data.input === 'string') {
      try {
        JSON.parse(data.input);
      } catch {
        return data.input.length > 120 ? `${data.input.slice(0, 120)}...` : data.input;
      }
    }
  }, [data.title, data.input]);

  if (todos) {
    return (
      <Box style={style} direction="Column" gap="100">
        <div className={css.ToolCallBody}>
          <Text size="B300" priority="400" className={css.TodoHeader}>
            {t('toolCall.updateTodos')}
          </Text>
          <ul className={css.TodoList}>
            {todos.map((todo) => {
              const checked = todo.status === 'completed';
              return (
                <li key={`${todo.content}-${todo.priority ?? 'none'}-${todo.status}`} className={css.TodoItem}>
                  <Icon
                    src={checked ? DisabledCheckboxIcon : todo.status === 'in_progress' ? SquareAsteriskIcon : DisabledCheckboxIcon}
                    filled={checked}
                    size="50"
                    style={{ opacity: checked ? 0.45 : 0.75, marginTop: toRem(2) }}
                  />
                  <Text size="T200" priority="300" className={checked ? css.TodoTextCompleted : css.TodoText}>
                    {todo.content}
                  </Text>
                </li>
              );
            })}
          </ul>
        </div>
      </Box>
    );
  }

  if (question && eventId) {
    return (
      <AskUserQuestionCard
        data={question}
        style={style}
        readOnly={data.status !== 'completed'}
        provider="open-agent"
        eventId={eventId}
        agentMode={data.metadata?.agent_mode === 'plan' ? 'plan' : undefined}
        initialHumanSender={initialHumanSender}
      />
    );
  }

  if (patchOperations) {
    return (
      <Box style={style} direction="Column" gap="100">
        <div className={css.ApplyPatchList}>
          {patchOperations.map((op) => (
            <ApplyPatchOperationCard
              key={applyPatchOperationKey(op)}
              operation={op}
            />
          ))}
        </div>
      </Box>
    );
  }

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
        <Text size="L400" priority="300" truncate className={data.status === 'inprogress' ? css.ToolCallHeaderShimmer : undefined}>
          {toolTitle ? (
            <>
              {prettierToolName}
              <Text size="T200" as="span" className={data.status === 'inprogress' ? css.ToolCallHeaderShimmer : undefined}>
                {` ${toolTitle}`}
              </Text>
            </>
          ) : prettierToolName}
        </Text>
        <Icon src={expanded ? Icons.ChevronBottom : Icons.ChevronRight} size="100" />
      </div>
      {expanded && (
        <div className={css.ToolCallBody}>
          <Text size="T200" priority="300" className={css.Label}>
            Input
          </Text>
          <pre className={css.Preformatted}>{prettierInput}</pre>
          {data.status === 'completed' && data.output !== undefined && (
            <>
              <div className={css.Divider} />
              <Text size="T200" priority="300" className={css.Label}>
                Output
              </Text>
              <pre className={css.Preformatted}>{prettierOutput}</pre>
            </>
          )}
          {data.status === 'failed' && data.error !== undefined && (
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
