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

function getTodosForRender(data: ToolCallData): TodoItem[] | undefined {
  if (data.name !== 'todowrite') return undefined;

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

type ToolCallCardProps = { data: ToolCallData; style?: CSSProperties; eventId?: string };
export function ToolCallCard({ data, style, eventId }: ToolCallCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const iconColor = data.status === 'completed' ? color.Success.Main : data.status === 'failed' ? color.Critical.Main : color.Secondary.Main;

  const prettierInput = useMemo(() => tryJsonPrettier(data.input), [data.input]);
  const prettierOutput = useMemo(() => tryJsonPrettier(data.output), [data.output]);
  const todos = useMemo(() => getTodosForRender(data), [data]);
  const question = useMemo(() => getQuestionForRender(data), [data]);

  const prettierToolName = useMemo(() =>
    data.name.charAt(0).toUpperCase() + data.name.slice(1).replace(/_([a-z])?/g, (_, c) => (` ${c ? c.toUpperCase() : ''}`)),
    [data.name]
  );

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
        answerEventType="vip.elevo.question_answers"
        answerIdField="question_event_id"
        answerIdValue={eventId}
      />
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
        <Text size="L400" priority="300">
          {data.title ? (
            <>
              {prettierToolName}
              <Text size="T200" as="span">
                {` ${data.title}`}
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
