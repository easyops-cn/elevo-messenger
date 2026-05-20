import React, { CSSProperties, useCallback, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod/v4';
import { Box, Icon, Icons, Text, config } from 'folds';
import { MsgType, type MatrixEvent } from 'matrix-js-sdk';
import type { RoomMessageEventContent } from 'matrix-js-sdk/lib/types';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useRoom } from '../../../hooks/useRoom';
import { CheckboxIcon } from '../../../icons/CheckboxIcon';
import { RadioIcon } from '../../../icons/RadioIcon';
import {
  CardContainer,
  CardHeader,
  CardBody,
  QuestionTabsBar,
  QuestionTab,
  OptionItem,
  OptionIcon,
  SubmitButton,
  OtherInput,
  SubmittedIcon,
  SubmittedText,
  AssignedHint,
  AnsweredItem,
  QuestionCardFooter,
  FormField,
  FormInput,
  FormTextarea,
} from './AskUser.css';
import { DisabledRadioIcon } from '../../../icons/DisabledRadioIcon';
import { DisabledCheckboxIcon } from '../../../icons/DisabledCheckboxIcon';
import { getMemberDisplayName } from '../../../utils/room';
import { getMxIdLocalPart } from '../../../utils/matrix';
import { MessageEvent } from '../../../../types/matrix/room';

// Schemas & Types

const AskUserQuestionOptionSchema = z.object({
  label: z.string(),
  description: z.string().optional(),
});

const AskUserQuestionItemSchema = z.object({
  type: z.literal('choice').optional(),
  question: z.string(),
  header: z.string(),
  multiSelect: z.boolean(),
  options: z.array(AskUserQuestionOptionSchema),
});

const AskUserFormFieldSchema = z.object({
  name: z.string(),
  label: z.string(),
  type: z.enum(['textarea', 'select']),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  description: z.string().optional(),
});

const AskUserFormQuestionItemSchema = z.object({
  type: z.literal('form'),
  question: z.string(),
  header: z.string(),
  fields: z.array(AskUserFormFieldSchema),
});

type AskUserQuestionItem = z.infer<typeof AskUserQuestionItemSchema>;
export type AskUserFormQuestionItem = z.infer<typeof AskUserFormQuestionItemSchema>;
type AskUserQuestionCardItem = AskUserQuestionItem | AskUserFormQuestionItem;

const AskUserQuestionSchema = z.object({
  userId: z.string().optional(),
  question_id: z.string(),
  questions: z.array(AskUserQuestionItemSchema).min(1),
});

export type AskUserQuestionData = z.infer<typeof AskUserQuestionSchema>;
export type AskUserQuestionCardData = Omit<AskUserQuestionData, 'question_id' | 'questions'> & {
  question_id?: string;
  questions: AskUserQuestionCardItem[];
};

const QuestionAnsweredSchemaOfElevoWorker = z.object({
  provider: z.literal('elevo-worker').optional(),
  question_id: z.string(),
  answers: z.record(z.string(), z.union([z.array(z.string()), z.string()])),
});

type QuestionAnsweredDataOfElevoWorker = z.infer<typeof QuestionAnsweredSchemaOfElevoWorker>;

const QuestionAnsweredSchemaOfOpenAgent = z.object({
  provider: z.literal('open-agent'),
  question_event_id: z.string(),
  answers: z.record(z.string(), z.union([z.array(z.string()), z.string()])),
});

type QuestionAnsweredDataOfOpenAgent = z.infer<typeof QuestionAnsweredSchemaOfOpenAgent>;
type QuestionAnsweredData = QuestionAnsweredDataOfElevoWorker | QuestionAnsweredDataOfOpenAgent;

export function isUserAnswerEvent(mEvent: MatrixEvent) {
  const content = mEvent.getContent();
  return (
    mEvent.getType() === MessageEvent.RoomMessage &&
    content.msgtype === MsgType.Text &&
    !!content['vip.elevo.ask_user_question_answers']
  );
}

// Parsers

export function parseAskUserQuestion(
  content: Record<string, unknown>
): AskUserQuestionData | undefined {
  const questionContent = content['vip.elevo.ask_user_question'];
  if (!questionContent) return undefined;
  const result = AskUserQuestionSchema.safeParse(questionContent);
  if (result.success) {
    return result.data;
  }
  // eslint-disable-next-line no-console
  console.error('Failed to parse ask user question content:', result.error);
}

export function parseQuestionAnsweredOfElevoWorker(
  content: Record<string, unknown>
): QuestionAnsweredDataOfElevoWorker | undefined {
  const answeredContent = content['vip.elevo.question_answered'];
  if (!answeredContent) return undefined;
  const result = QuestionAnsweredSchemaOfElevoWorker.safeParse(answeredContent);
  if (result.success) {
    return result.data;
  }
  // eslint-disable-next-line no-console
  console.error('Failed to parse question answered content:', result.error);
}

export function parseQuestionAnsweredOfOpenAgent(
  content: Record<string, unknown>
): QuestionAnsweredDataOfOpenAgent | undefined {
  const answeredContent = content['vip.elevo.question_answered'];
  if (!answeredContent) return undefined;
  const result = QuestionAnsweredSchemaOfOpenAgent.safeParse(answeredContent);
  if (result.success) {
    return result.data;
  }
  // eslint-disable-next-line no-console
  console.error('Failed to parse question answers content:', result.error);
}

// Types

type QuestionSelections = Record<number, string[]>;
type FormAnswers = Record<number, Record<string, string>>;

function isFormQuestion(question: AskUserQuestionCardItem): question is AskUserFormQuestionItem {
  return question.type === 'form';
}

// Components

export function QuestionAnsweredCard({
  data,
  style,
}: {
  data: QuestionAnsweredData;
  style?: CSSProperties;
}) {
  const { t } = useTranslation();

  return (
    <Box style={style} direction="Column" gap="100">
      <div className={CardContainer}>
        <div className={CardHeader}>
          <Text size="T300" priority="400" style={{ fontWeight: 600 }}>
            {t('askUserQuestion.answeredTitle')}
          </Text>
        </div>
        <div className={CardBody}>
          {Object.entries(data.answers).map(([question, answers]) => (
            <div key={question} className={AnsweredItem}>
              <Text size="T300" priority="300">
                {t('askUserQuestion.questionLabel')}
                {question}
              </Text>
              <Text size="T300" priority="500" style={{ marginTop: config.space.S100 }}>
                {t('askUserQuestion.answerLabel')}
                {Array.isArray(answers) ? answers.join(', ') : answers}
              </Text>
            </div>
          ))}
        </div>
      </div>
    </Box>
  );
}

export function AskUserQuestionCard({
  data,
  style,
  readOnly,
  onSubmit,
  provider = 'elevo-worker',
  eventId,
  agentMode,
  initialHumanSender,
  submitted: submittedProp,
}: {
  data: AskUserQuestionCardData;
  style?: CSSProperties;
  readOnly?: boolean;
  onSubmit?: () => void;
  provider?: 'elevo-worker' | 'open-agent';
  eventId?: string;
  agentMode?: string;
  initialHumanSender?: string;
  submitted?: boolean;
}) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const room = useRoom();
  const formIdPrefix = useId();

  const [localSubmitted, setLocalSubmitted] = useState(false);
  const [selections, setSelections] = useState<QuestionSelections>({});
  const [formAnswers, setFormAnswers] = useState<FormAnswers>({});
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const submitted = submittedProp ?? localSubmitted;
  const isWaitingForServerAnswer = submittedProp === false && localSubmitted;
  const isLocallyAnswered = submittedProp !== undefined ? localSubmitted : submitted;

  const assignedUserId = data.userId ?? initialHumanSender;
  const isAssignedUser = !!assignedUserId && mx.getUserId() === assignedUserId;
  const isDisabled = !isAssignedUser || isLocallyAnswered || submitted || readOnly;
  const assignedDisplayName = assignedUserId
    ? getMemberDisplayName(room, assignedUserId) ??
      getMxIdLocalPart(assignedUserId) ??
      assignedUserId
    : undefined;

  const answerIdField = provider === 'open-agent' ? 'question_event_id' : 'question_id';
  const answerId = provider === 'open-agent' ? eventId : data.question_id;

  const canSubmit = useMemo(() => {
    if (!answerId) return false;
    if (submitted) return false;
    if (isLocallyAnswered) return false;
    for (let i = 0; i < data.questions.length; i += 1) {
      const q = data.questions[i];
      if (isFormQuestion(q)) {
        let hasEmptyField = false;
        for (let j = 0; j < q.fields.length; j += 1) {
          const field = q.fields[j];
          if (!formAnswers[i]?.[field.name]?.trim()) hasEmptyField = true;
        }
        if (hasEmptyField) return false;
      } else {
        const sel = selections[i] ?? [];
        if (sel.length === 0) return false;
        if (sel.some((s) => s === 'Other:') && !otherTexts[String(i)]?.trim()) return false;
      }
    }
    return true;
  }, [answerId, data.questions, formAnswers, selections, otherTexts, isLocallyAnswered, submitted]);

  const handleOptionToggle = useCallback(
    (qIndex: number, label: string, isOther: boolean) => {
      if (isDisabled) return;
      const q = data.questions[qIndex];
      if (isFormQuestion(q)) return;

      setSelections((prev) => {
        const current = prev[qIndex] ?? [];

        if (isOther) {
          if (current.some((s) => s === 'Other:')) {
            return { ...prev, [qIndex]: current.filter((s) => s !== 'Other:') };
          }
          if (!q.multiSelect) {
            return { ...prev, [qIndex]: ['Other:'] };
          }
          return { ...prev, [qIndex]: [...current, 'Other:'] };
        }

        if (!q.multiSelect) {
          // 单选时自动跳转到下一题
          if (qIndex < data.questions.length - 1) {
            setActiveTab(qIndex + 1);
          }
          return { ...prev, [qIndex]: [label] };
        }

        if (current.includes(label)) {
          return { ...prev, [qIndex]: current.filter((s) => s !== label) };
        }
        return { ...prev, [qIndex]: [...current, label] };
      });
    },
    [data.questions, isDisabled]
  );

  const handleSubmit = useCallback(async () => {
    if (submitting || !canSubmit) return;

    const answers: Record<string, string[] | string> = {};
    for (let i = 0; i < data.questions.length; i += 1) {
      const q = data.questions[i];
      if (isFormQuestion(q)) {
        answers[q.question] = JSON.stringify(formAnswers[i] ?? {});
      } else {
        const sel = (selections[i] ?? []).map((s) => {
          if (s === 'Other:') return otherTexts[String(i)]?.trim() || '';
          return s;
        });
        answers[q.question] = sel;
      }
    }

    setSubmitting(true);
    try {
      const body = `${agentMode === 'plan' ? '/plan ' : ''}${Object.entries(answers)
        .map(([q, ans]) => `${q}: ${Array.isArray(ans) ? ans.join(', ') : ans}`)
        .join('\n')}`;
      await mx.sendMessage(room.roomId, {
        msgtype: 'm.text',
        body,
        'vip.elevo.ask_user_question_answers': {
          provider,
          [answerIdField]: answerId,
          answers,
        },
      } as unknown as RoomMessageEventContent);
      setLocalSubmitted(true);
      onSubmit?.();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to submit question answers:', err);
    } finally {
      setSubmitting(false);
    }
  }, [
    submitting,
    canSubmit,
    data,
    formAnswers,
    selections,
    otherTexts,
    mx,
    provider,
    agentMode,
    room.roomId,
    onSubmit,
    answerIdField,
    answerId,
  ]);

  const currentQuestion = data.questions[activeTab];
  const currentSel = selections[activeTab] ?? [];
  const hasOtherSelected = currentSel.includes('Other:');

  return (
    <Box style={style} direction="Column" gap="0">
      <div className={CardContainer}>
        <div className={CardBody}>
          <div className={QuestionTabsBar}>
            {data.questions.map((q, qIndex) => (
              <button
                key={q.question}
                type="button"
                className={QuestionTab({ active: activeTab === qIndex })}
                onClick={() => setActiveTab(qIndex)}
              >
                <Text as="span" size="B400">
                  {q.header ||
                    t('askUserQuestion.questionTab', {
                      index: qIndex + 1,
                      total: data.questions.length,
                    })}
                </Text>
              </button>
            ))}
          </div>
          <Text size="T300" priority="400" style={{ marginBottom: config.space.S200 }}>
            {currentQuestion.question}
          </Text>
          {isFormQuestion(currentQuestion) ? (
            <Box direction="Column" gap="300">
              {currentQuestion.fields.map((field) => {
                const value = formAnswers[activeTab]?.[field.name] ?? '';
                const fieldId = `${formIdPrefix}-${activeTab}-${field.name}`;
                return (
                  <div key={field.name} className={FormField}>
                    <Text as="label" htmlFor={fieldId} size="T300" priority="400">
                      {field.label}
                    </Text>
                    {field.description && (
                      <Text size="T200" priority="300">
                        {field.description}
                      </Text>
                    )}
                    {field.type === 'select' ? (
                      <select
                        id={fieldId}
                        value={value}
                        onChange={(e) =>
                          setFormAnswers((prev) => ({
                            ...prev,
                            [activeTab]: {
                              ...(prev[activeTab] ?? {}),
                              [field.name]: e.target.value,
                            },
                          }))
                        }
                        disabled={isDisabled}
                        className={FormInput}
                      >
                        <option value="" disabled>
                          {field.placeholder ?? t('askUserQuestion.selectPlaceholder')}
                        </option>
                        {(field.options ?? []).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <textarea
                        id={fieldId}
                        value={value}
                        onChange={(e) =>
                          setFormAnswers((prev) => ({
                            ...prev,
                            [activeTab]: {
                              ...(prev[activeTab] ?? {}),
                              [field.name]: e.target.value,
                            },
                          }))
                        }
                        placeholder={field.placeholder}
                        disabled={isDisabled}
                        className={FormTextarea}
                      />
                    )}
                  </div>
                );
              })}
            </Box>
          ) : (
            <Box direction="Column" gap="100">
              {currentQuestion.options.map((opt) => {
                const isSelected = currentSel.includes(opt.label);
                return (
                  // eslint-disable-next-line jsx-a11y/no-static-element-interactions
                  <div
                    key={opt.label}
                    className={OptionItem({
                      selected: isAssignedUser && !isDisabled && isSelected,
                      disabled: isDisabled,
                    })}
                    onClick={() => handleOptionToggle(activeTab, opt.label, false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOptionToggle(activeTab, opt.label, false);
                      }
                    }}
                    role={currentQuestion.multiSelect ? 'checkbox' : 'radio'}
                    aria-checked={isSelected}
                    tabIndex={!isDisabled ? 0 : -1}
                  >
                    <Icon
                      src={
                        currentQuestion.multiSelect
                          ? isDisabled
                            ? DisabledCheckboxIcon
                            : CheckboxIcon
                          : isDisabled
                          ? DisabledRadioIcon
                          : RadioIcon
                      }
                      filled={isSelected}
                      size="50"
                      className={OptionIcon}
                    />
                    <Box grow="Yes" direction="Column" gap="0">
                      <Text size="T300" priority="400">
                        {opt.label}
                      </Text>
                      {opt.description && (
                        <Text size="T300" priority="300">
                          {opt.description}
                        </Text>
                      )}
                    </Box>
                  </div>
                );
              })}
              {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
              <div
                className={OptionItem({
                  selected: isAssignedUser && !isDisabled && hasOtherSelected,
                  disabled: isDisabled,
                })}
                onClick={() => handleOptionToggle(activeTab, 'Other:', true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOptionToggle(activeTab, 'Other:', true);
                  }
                }}
                role={currentQuestion.multiSelect ? 'checkbox' : 'radio'}
                aria-checked={hasOtherSelected}
                tabIndex={isAssignedUser && !submitted && !readOnly ? 0 : -1}
              >
                <Icon
                  src={
                    currentQuestion.multiSelect
                      ? isDisabled
                        ? DisabledCheckboxIcon
                        : CheckboxIcon
                      : isDisabled
                      ? DisabledRadioIcon
                      : RadioIcon
                  }
                  filled={hasOtherSelected}
                  size="50"
                  className={OptionIcon}
                />
                <Box grow="Yes" direction="Column" gap="100">
                  <Text size="T300" priority="400">
                    {t('askUserQuestion.other')}
                  </Text>
                  {hasOtherSelected && (
                    <input
                      type="text"
                      value={otherTexts[String(activeTab)] ?? ''}
                      onChange={(e) =>
                        setOtherTexts((prev) => ({ ...prev, [String(activeTab)]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      placeholder={t('askUserQuestion.otherPlaceholder')}
                      disabled={isDisabled}
                      className={OtherInput}
                      // eslint-disable-next-line jsx-a11y/no-autofocus
                      autoFocus
                    />
                  )}
                </Box>
              </div>
            </Box>
          )}
        </div>
        <div className={QuestionCardFooter}>
          {submitted || isWaitingForServerAnswer ? (
            <>
              {submitted && <Icon src={Icons.Check} size="200" className={SubmittedIcon} />}
              <Text size="T300" priority="300" className={SubmittedText}>
                {submitted ? t('askUserQuestion.submitted') : t('askUserQuestion.waitingForServer')}
              </Text>
            </>
          ) : (
            <>
              <button
                type="button"
                className={SubmitButton({
                  disabled: !canSubmit || submitting || isDisabled,
                })}
                disabled={!canSubmit || submitting || isDisabled}
                onClick={handleSubmit}
              >
                {submitting ? t('askUserQuestion.submitting') : t('askUserQuestion.submit')}
              </button>
              {!isAssignedUser && assignedDisplayName && (
                <Text size="T200" priority="300" className={AssignedHint}>
                  {t('askUserQuestion.assignedTo', { name: assignedDisplayName })}
                </Text>
              )}
            </>
          )}
        </div>
      </div>
    </Box>
  );
}
