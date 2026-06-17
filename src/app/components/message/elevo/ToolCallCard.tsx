import React, { CSSProperties, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod/v4';
import classNames from 'classnames';
import { Box, Icon, Icons, Text, toRem } from 'folds';
import { structuredPatch } from 'diff';
import * as css from './ToolCallCard.css';
import { DisabledCheckboxIcon } from '../../../icons/DisabledCheckboxIcon';
import { SquareAsteriskIcon } from '../../../icons/SquareAsteriskIcon';
import { elevoColor } from '../../../../config.css';
import { MessageLayout, settingsAtom } from '../../../state/settings';
import { useSetting } from '../../../state/hooks/settings';
import { useOpenCodeView } from '../../../utils/codeView';
import type { DiffFileSummary } from './diffSummary';
import type { CodeViewWorkspaceContext } from '../../code-view';

const ToolCallSchema = z.object({
  toolCallId: z.string().optional(),
  conversationId: z.string().optional(),
  name: z.string(),
  title: z.string().optional(),
  input: z.unknown(),
  output: z.unknown().optional(),
  error: z.unknown().optional(),
  status: z.enum(['inprogress', 'approval-requested', 'approval-responded', 'completed', 'failed']),
  approval: z
    .object({
      id: z.string(),
      approved: z.boolean().optional(),
      reason: z.string().optional(),
    })
    .optional(),
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

const ToolCallDiffInputSchema = z.object({
  diff: z.string(),
  path: z.string().optional(),
});

const EditToolReplaceInputSchema = z.object({
  replace_all: z.boolean().optional(),
  file_path: z.string(),
  old_string: z.string(),
  new_string: z.string(),
});

const WriteToolInputSchema = z.object({
  file_path: z.string(),
  content: z.string(),
});

type ApplyPatchOperation =
  | { kind: 'add'; path: string; content: string; variant?: 'Write' }
  | { kind: 'delete'; path: string }
  | { kind: 'update'; path: string; moveTo?: string; diff: string };

type TodoItem = z.infer<typeof TodoItemSchema>;

export function parseToolCall(content: Record<string, unknown>): ToolCallData | undefined {
  const result = ToolCallSchema.safeParse(content['vip.elevo.tool_call']);
  return result.success ? result.data : undefined;
}

function tryJsonPrettier(val: unknown): string {
  if (typeof val !== 'string') return JSON.stringify(val, null, 2);
  try {
    const data = JSON.parse(val);
    if (typeof data === 'string') return data.trim();
    return JSON.stringify(data, null, 2);
  } catch {
    return val.trim();
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

function getBaseName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

function getApplyPatchForRender(data: ToolCallData): ApplyPatchOperation[] | undefined {
  if (data.name !== 'apply_patch') return undefined;
  const parsedInput = tryParseJson(data.input);
  const result = ApplyPatchInputSchema.safeParse(parsedInput);
  if (!result.success) return undefined;
  return parseApplyPatchText(result.data.patchText);
}

function isPatchDiffLine(line: string): boolean {
  return line.startsWith('@@') || /^[+\-\s]/.test(line);
}

function normalizeAddToolDiff(diff: string): string {
  const lines = diff.split('\n');
  if (lines.every(isPatchDiffLine)) return diff;
  const hunkHeader = `@@ -0,0 +1,${lines.length} @@`;
  return [hunkHeader, ...lines.map((line) => `+${line}`)].join('\n');
}

function buildReplaceDiff(filePath: string, oldStr: string, newStr: string): string {
  const patch = structuredPatch(filePath, filePath, oldStr, newStr);
  const lines: string[] = [];
  patch.hunks.forEach((hunk) => {
    lines.push('@@');
    lines.push(...hunk.lines);
  });
  return lines.join('\n');
}

function getToolCallDiffForRender(data: ToolCallData): ApplyPatchOperation[] | undefined {
  const parsedInput = tryParseJson(data.input);

  // Edit tool with replace_all / old_string / new_string format
  if (data.name === 'Edit') {
    const replaceResult = EditToolReplaceInputSchema.safeParse(parsedInput);
    if (replaceResult.success) {
      const { file_path, old_string, new_string } = replaceResult.data;
      return [
        {
          kind: 'update',
          path: file_path,
          diff: buildReplaceDiff(file_path, old_string, new_string),
        },
      ];
    }

    // Edit tool with diff / path format (legacy)
    const diffResult = ToolCallDiffInputSchema.safeParse(parsedInput);
    if (diffResult.success) {
      const path = diffResult.data.path ?? '';
      return [{ kind: 'update', path, diff: diffResult.data.diff }];
    }
    return undefined;
  }

  // Write tool — treat as creating a new file
  if (data.name === 'Write') {
    const writeResult = WriteToolInputSchema.safeParse(parsedInput);
    if (writeResult.success) {
      const { file_path, content } = writeResult.data;
      return [
        { kind: 'add', variant: 'Write', path: file_path, content: normalizeAddToolDiff(content) },
      ];
    }
    return undefined;
  }

  // Add tool — treat as creating a new file
  if (data.name === 'Add') {
    const addResult = WriteToolInputSchema.safeParse(parsedInput);
    if (addResult.success) {
      const { file_path, content } = addResult.data;
      return [{ kind: 'add', path: file_path, content: normalizeAddToolDiff(content) }];
    }

    // Add tool with diff / path format (legacy)
    const diffResult = ToolCallDiffInputSchema.safeParse(parsedInput);
    if (diffResult.success) {
      const path = diffResult.data.path ?? '';
      return [{ kind: 'add', path, content: normalizeAddToolDiff(diffResult.data.diff) }];
    }
    return undefined;
  }

  return undefined;
}

function applyPatchOperationKey(op: ApplyPatchOperation): string {
  if (op.kind === 'add') return `add:${op.path}:${op.content.length}`;
  if (op.kind === 'delete') return `delete:${op.path}`;
  return `update:${op.path}:${op.moveTo ?? ''}:${op.diff.length}`;
}

function buildApplyPatchFileSummary(path: string, body: string): DiffFileSummary {
  let added = 0;
  let deleted = 0;
  const lines = body.split('\n');

  lines.forEach((line) => {
    if (line.startsWith('+') && !line.startsWith('+++ ')) added += 1;
    if (line.startsWith('-') && !line.startsWith('--- ')) deleted += 1;
  });

  return { path, added, deleted, lines };
}

type ApplyPatchOperationCardProps = {
  operation: ApplyPatchOperation;
  iconClassName: string;
  status: ToolCallData['status'];
  codeViewWorkspace?: CodeViewWorkspaceContext;
};

function ApplyPatchOperationCard({
  operation,
  iconClassName,
  status,
  codeViewWorkspace,
}: ApplyPatchOperationCardProps) {
  const { t } = useTranslation();
  const openCodeView = useOpenCodeView();

  const label =
    operation.kind === 'add'
      ? operation.variant || 'Add'
      : operation.kind === 'delete'
        ? 'Delete'
        : 'Edit';

  const body =
    operation.kind === 'add'
      ? operation.content
      : operation.kind === 'update'
        ? operation.diff
        : null;

  const moveTo = operation.kind === 'update' ? operation.moveTo : undefined;
  const codeViewPath = moveTo ?? operation.path;

  const openDiff = () => {
    if (body === null) return;
    const file = buildApplyPatchFileSummary(codeViewPath, body);
    openCodeView({
      title: t('message.diffEditedFile', { count: 1 }),
      files: [file],
      added: file.added,
      deleted: file.deleted,
      ...codeViewWorkspace,
    });
  };

  const handleHeaderKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (body === null) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openDiff();
    }
  };

  return (
    <Box direction="Column" gap="200">
      <div
        className={css.ToolCallHeader({ interactive: body !== null })}
        onClick={body !== null ? openDiff : undefined}
        onKeyDown={handleHeaderKeyDown}
        role={body !== null ? 'button' : undefined}
        tabIndex={body !== null ? 0 : undefined}
        aria-label={
          body !== null ? t('message.diffEditedOneFile', { path: codeViewPath }) : undefined
        }
      >
        <div className={iconClassName}>
          {status === 'inprogress' && (
            <svg viewBox="0 0 8 8" className={css.ToolCallSpinnerSvg}>
              <circle className={css.ToolCallSpinnerArc} cx="4" cy="4" r="3" />
            </svg>
          )}
        </div>
        <Text size="T300" truncate>
          <span style={{ fontWeight: 500 }}>{label}</span>
          <span className={body !== null ? css.ApplyPatchTitleLink : undefined}>
            {' '}
            {body !== null ? getBaseName(operation.path) : operation.path}
          </span>
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
    </Box>
  );
}

function getTodosForRender(data: ToolCallData): TodoItem[] | undefined {
  if (data.name?.toLowerCase() !== 'todowrite') return undefined;

  const isCompleted = data.status === 'completed';
  if (isCompleted) {
    const parsedOutput = tryParseJson(data.output);
    const todoList = TodoListSchema.safeParse(parsedOutput);
    if (todoList.success) return todoList.data;
  }

  if (isCompleted || data.status === 'inprogress') {
    const parsedInput = tryParseJson(data.input);
    const todoPayload = TodoPayloadSchema.safeParse(parsedInput);
    if (todoPayload.success) return todoPayload.data.todos;
  }

  return undefined;
}

type ToolCallCardProps = {
  data: ToolCallData;
  codeViewWorkspace?: CodeViewWorkspaceContext;
  style?: CSSProperties;
};
export function ToolCallCard({ data, codeViewWorkspace, style }: ToolCallCardProps) {
  const { t } = useTranslation();
  const [messageLayout] = useSetting(settingsAtom, 'messageLayout');

  const [bodyExpanded, setBodyExpanded] = useState(false);
  const iconClassName = classNames(
    css.ToolCallHeaderIcon,
    data.status === 'completed' && css.ToolCallHeaderIconCompleted,
    data.status === 'approval-responded' && css.ToolCallHeaderIconCompleted,
    data.status === 'failed' && css.ToolCallHeaderIconFailed,
    (data.status === 'inprogress' || data.status === 'approval-requested') &&
      css.ToolCallHeaderIconInprogress,
    {
      [css.ToolCallHeaderIconOffset]: messageLayout === MessageLayout.Modern,
    },
  );

  const prettierInput = useMemo(() => tryJsonPrettier(data.input), [data.input]);
  const prettierOutput = useMemo(
    () => tryJsonPrettier(data.output ?? data.error),
    [data.output, data.error],
  );
  const todos = useMemo(() => getTodosForRender(data), [data]);
  const patchOperations = useMemo(
    () => getApplyPatchForRender(data) ?? getToolCallDiffForRender(data),
    [data],
  );
  const showToolDetails = data.name !== 'ExitPlanMode';

  const prettierToolName = useMemo(
    () =>
      data.name.charAt(0).toUpperCase() +
      data.name.slice(1).replace(/_([a-z])?/g, (_, c) => ` ${c ? c.toUpperCase() : ''}`),
    [data.name],
  );

  const toolTitle = useMemo(() => {
    if (data.title) return data.title;

    switch (prettierToolName) {
      case 'EnterPlanMode':
      case 'ExitPlanMode':
        return '';
    }

    if (typeof data.input === 'string') {
      try {
        const input = JSON.parse(data.input);
        let title = '';
        switch (prettierToolName) {
          case 'Agent':
            if (typeof input.description === 'string') {
              title = input.description;
            }
            break;
          case 'Bash':
            if (typeof input.description === 'string') {
              title = input.description;
            } else if (typeof input.command === 'string') {
              title = input.command;
            }
            break;
          case 'Glob':
          case 'Grep':
            if (typeof input.pattern === 'string') {
              title = input.pattern;
            }
            break;
          case 'Read':
          case 'Write':
          case 'Edit':
            if (typeof input.file_path === 'string') {
              title = input.file_path;
            }
            break;
          case 'Skill':
            if (typeof input.skill === 'string') {
              title = input.skill;
            }
            break;
        }
        return title.trim() || data.input;
      } catch {
        return data.input.length > 72 ? `${data.input.slice(0, 72)}...` : data.input;
      }
    }
  }, [data.title, data.input, prettierToolName]);

  if (todos) {
    return (
      <Box style={style} direction="Column" gap="200">
        <div className={css.ToolCallHeader()}>
          <div className={iconClassName} />
          <Text size="T300" truncate>
            <span style={{ fontWeight: 500 }}>{t('toolCall.updateTodos')}</span>
          </Text>
        </div>
        <ul className={css.TodoList}>
          {todos.map((todo) => {
            const checked = todo.status === 'completed';
            return (
              <li
                key={`${todo.content}-${todo.priority ?? 'none'}-${todo.status}`}
                className={css.TodoItem}
              >
                <Icon
                  src={
                    checked
                      ? DisabledCheckboxIcon
                      : todo.status === 'in_progress'
                        ? SquareAsteriskIcon
                        : DisabledCheckboxIcon
                  }
                  filled={checked}
                  size="50"
                  style={{ opacity: checked ? 0.45 : 0.75, marginTop: toRem(2) }}
                />
                <Text
                  size="T200"
                  priority="300"
                  className={checked ? css.TodoTextCompleted : css.TodoText}
                >
                  {todo.content}
                </Text>
              </li>
            );
          })}
        </ul>
      </Box>
    );
  }

  if (patchOperations) {
    return (
      <Box style={style} direction="Column" gap="300">
        {patchOperations.map((op) => (
          <ApplyPatchOperationCard
            key={applyPatchOperationKey(op)}
            operation={op}
            iconClassName={iconClassName}
            status={data.status}
            codeViewWorkspace={codeViewWorkspace}
          />
        ))}
      </Box>
    );
  }

  return (
    <Box style={style} direction="Column" gap="200">
      <div
        className={css.ToolCallHeader({ interactive: showToolDetails })}
        onClick={showToolDetails ? () => setBodyExpanded((v) => !v) : undefined}
        onKeyDown={(e) => {
          if (!showToolDetails) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setBodyExpanded((v) => !v);
          }
        }}
        role={showToolDetails ? 'button' : undefined}
        tabIndex={showToolDetails ? 0 : undefined}
      >
        <div className={iconClassName}>
          {data.status === 'inprogress' && (
            <svg viewBox="0 0 8 8" className={css.ToolCallSpinnerSvg}>
              <circle className={css.ToolCallSpinnerArc} cx="4" cy="4" r="3" />
            </svg>
          )}
        </div>
        <Text size="T300" truncate>
          <span style={{ fontWeight: 500 }}>{prettierToolName}</span>
          {toolTitle ? (
            <span style={{ color: elevoColor.Text.Secondary }}>{` ${toolTitle}`}</span>
          ) : null}
        </Text>
      </div>
      {showToolDetails && bodyExpanded && (
        <div className={css.ToolCallBody}>
          <div className={css.InlineRow}>
            <Text size="T200" className={css.InlineLabel}>
              IN
            </Text>
            <pre className={css.InlineContent} title={prettierInput}>
              {prettierInput}
            </pre>
          </div>
          {(data.status === 'completed' || data.status === 'failed') &&
            (data.output !== undefined || data.error !== undefined) && (
              <>
                <div className={css.InlineDivider} />
                <div className={css.InlineRowTop}>
                  <Text size="T200" className={css.InlineLabel}>
                    OUT
                  </Text>
                  <pre className={css.OutputContent}>{prettierOutput}</pre>
                </div>
              </>
            )}
        </div>
      )}
    </Box>
  );
}
