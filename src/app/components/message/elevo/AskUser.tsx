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
  ContinueButton,
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
import { getMemberDisplayName, getMentionContent } from '../../../utils/room';
import { getMxIdLocalPart } from '../../../utils/matrix';
import { MessageEvent } from '../../../../types/matrix/room';
import { useRoomThread } from '../../../features/room/RoomThreadContext';
import { sanitizeText } from '../../../utils/sanitize';
import { getMatrixToUser } from '../../../plugins/matrix-to';
import { isComposing } from '../../../hooks/useComposingCheck';
import { parseToolCall } from './ToolCallCard';

// Schemas & Types

const AskUserQuestionOptionSchema = z.object({
  label: z.string(),
  description: z.string().optional(),
});

const AskUserChoiceQuestionItemSchema = z.object({
  id: z.string(),
  type: z.literal('choice'),
  question: z.string(),
  header: z.string(),
  multiSelect: z.boolean().optional(),
  options: z.array(AskUserQuestionOptionSchema),
});

const AskUserFormFieldSchema = z.object({
  name: z.string(),
  label: z.string(),
  type: z.enum(['text', 'number', 'select', 'textarea', 'email', 'password']),
  required: z.boolean().optional(),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  description: z.string().optional(),
});

const AskUserFormQuestionItemSchema = z.object({
  id: z.string(),
  type: z.literal('form'),
  question: z.string(),
  header: z.string(),
  fields: z.array(AskUserFormFieldSchema),
});

const AskUserQuestionItemSchema = z.union([
  AskUserChoiceQuestionItemSchema,
  AskUserFormQuestionItemSchema,
]);

type AskUserQuestionItem = z.infer<typeof AskUserQuestionItemSchema>;
export type AskUserFormQuestionItem = z.infer<typeof AskUserFormQuestionItemSchema>;
type AskUserQuestionCardItem = AskUserQuestionItem | AskUserFormQuestionItem;

const AskUserQuestionSchema = z.object({
  questions: z.array(AskUserQuestionItemSchema).min(1),
  answers: z
    .record(
      z.string(),
      z.union([
        z.object({ answers: z.array(z.string()) }),
        z.object({ fields: z.record(z.string(), z.string()) }),
      ]),
    )
    .optional(),
});

export type AskUserQuestionData = z.infer<typeof AskUserQuestionSchema>;

export type AskUserQuestionAnswers = Record<
  string,
  { answers: string[] } | { fields: Record<string, string> }
>;

export function isUserAnswerEvent(mEvent: MatrixEvent) {
  const content = mEvent.getContent();
  return (
    mEvent.getType() === MessageEvent.RoomMessage &&
    content.msgtype === MsgType.Text &&
    !!content['vip.elevo.ask_user_question_answers']
  );
}

// Parsers

export function parseAskUser(content: Record<string, unknown>): AskUserQuestionData | undefined {
  const askUserContent = content['vip.elevo.ask_user'];
  if (!askUserContent) return undefined;
  const result = AskUserQuestionSchema.safeParse(askUserContent);
  if (result.success) {
    const toolCall = parseToolCall(content);
    if (toolCall && toolCall.status === 'failed') {
      // If the tool call has failed, it means the question is no longer valid.
      return undefined;
    }
    return result.data;
  }

  console.error('Failed to parse ask user content:', result.error);
}

// Types

type QuestionSelections = Record<number, string[]>;
type FormAnswers = Record<number, Record<string, string>>;

const OTHER_OPTION_VALUE = 'Other:';

function isFormQuestion(question: AskUserQuestionCardItem): question is AskUserFormQuestionItem {
  return question.type === 'form';
}

function getChoiceMultiSelect(question: AskUserQuestionCardItem): boolean {
  return !isFormQuestion(question) && question.multiSelect === true;
}

function getAnswerText(answer: AskUserQuestionAnswers[string]): string {
  if ('answers' in answer) return answer.answers.join(', ');
  return Object.entries(answer.fields)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
}

// Components

type AskUserSelectOption = {
  label: string;
  description?: string;
};

function AskUserSelect({
  options,
  selectedValues,
  multiSelect,
  disabled,
  isAssignedUser,
  otherText,
  otherLabel,
  otherPlaceholder,
  showOtherOption,
  labelledBy,
  onToggle,
  onOtherTextChange,
  onOtherInputEnter,
}: {
  options: AskUserSelectOption[];
  selectedValues: string[];
  multiSelect: boolean;
  disabled?: boolean;
  isAssignedUser: boolean;
  otherText: string;
  otherLabel: string;
  otherPlaceholder: string;
  showOtherOption: boolean;
  labelledBy?: string;
  onToggle: (label: string, isOther: boolean) => void;
  onOtherTextChange: (value: string) => void;
  onOtherInputEnter?: () => void;
}) {
  const hasOtherSelected = selectedValues.includes(OTHER_OPTION_VALUE);
  const optionRole = multiSelect ? 'checkbox' : 'radio';
  const iconSrc = multiSelect
    ? disabled
      ? DisabledCheckboxIcon
      : CheckboxIcon
    : disabled
      ? DisabledRadioIcon
      : RadioIcon;

  const renderOption = (option: AskUserSelectOption, isOther = false) => {
    const isSelected = isOther ? hasOtherSelected : selectedValues.includes(option.label);
    return (
      <div
        key={option.label}
        className={OptionItem({
          selected: isAssignedUser && !disabled && isSelected,
          disabled,
        })}
        onClick={() => onToggle(option.label, isOther)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle(option.label, isOther);
          }
        }}
        role={optionRole}
        aria-checked={isSelected}
        tabIndex={!disabled ? 0 : -1}
      >
        <Icon src={iconSrc} filled={isSelected} size="50" className={OptionIcon} />
        <Box grow="Yes" direction="Column" gap={isOther ? '100' : '0'}>
          <Text size="T300" priority="400">
            {option.label}
          </Text>
          {option.description && (
            <Text size="T300" priority="300">
              {option.description}
            </Text>
          )}
          {isOther && hasOtherSelected && (
            <input
              type="text"
              value={otherText}
              onChange={(e) => onOtherTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isComposing(e)) return;
                  onOtherInputEnter?.();
                  return;
                }
                if (e.key === ' ') {
                  e.stopPropagation();
                }
              }}
              onClick={(e) => e.stopPropagation()}
              placeholder={otherPlaceholder}
              disabled={disabled}
              className={OtherInput}
              autoFocus
            />
          )}
        </Box>
      </div>
    );
  };

  return (
    <Box
      direction="Column"
      gap="100"
      role={multiSelect ? 'group' : 'radiogroup'}
      aria-labelledby={labelledBy}
    >
      {options.map((option) => renderOption(option))}
      {showOtherOption && renderOption({ label: otherLabel }, true)}
    </Box>
  );
}

export function QuestionAnsweredCard({
  answers,
  questions,
  style,
}: {
  answers: AskUserQuestionAnswers;
  questions?: AskUserQuestionItem[];
  style?: CSSProperties;
}) {
  const { t } = useTranslation();
  const questionById = useMemo(
    () => new Map((questions ?? []).map((question) => [question.id, question.question])),
    [questions],
  );

  return (
    <Box style={style} direction="Column" gap="100">
      <div className={CardContainer}>
        <div className={CardHeader}>
          <Text size="T300" priority="400" style={{ fontWeight: 600 }}>
            {t('askUserQuestion.answeredTitle')}
          </Text>
        </div>
        <div className={CardBody}>
          {Object.entries(answers).map(([questionId, list]) => (
            <div key={questionId} className={AnsweredItem}>
              <Text size="T300" priority="300">
                {t('askUserQuestion.questionLabel')}
                {questionById.get(questionId) ?? questionId}
              </Text>
              <Text size="T300" priority="500" style={{ marginTop: config.space.S100 }}>
                {t('askUserQuestion.answerLabel')}
                {getAnswerText(list)}
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
  eventId,
  threadRootId,
  agentMode,
  initialHumanSender,
  questionSenderId,
  showOtherOption = true,
}: {
  data: AskUserQuestionData;
  style?: CSSProperties;
  readOnly?: boolean;
  onSubmit?: () => void;
  eventId?: string;
  threadRootId?: string | null;
  agentMode?: string;
  initialHumanSender?: string;
  questionSenderId?: string;
  showOtherOption?: boolean;
}) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const room = useRoom();
  const thread = useRoomThread();
  const formIdPrefix = useId();
  const answerThreadRootId = thread?.id ?? threadRootId;

  const [localSubmitted, setLocalSubmitted] = useState(false);
  const [selections, setSelections] = useState<QuestionSelections>({});
  const [formAnswers, setFormAnswers] = useState<FormAnswers>({});
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>({});
  const [formOtherTexts, setFormOtherTexts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const submitted = !!data.answers || localSubmitted;

  const assignedUserId = initialHumanSender;
  const isAssignedUser = !!assignedUserId && mx.getUserId() === assignedUserId;
  const isDisabled = !isAssignedUser || submitted || readOnly;
  const assignedDisplayName = assignedUserId
    ? (getMemberDisplayName(room, assignedUserId) ??
      getMxIdLocalPart(assignedUserId) ??
      assignedUserId)
    : undefined;

  const answerId = eventId;

  const isQuestionAnswered = useCallback(
    (i: number) => {
      const q = data.questions[i];
      if (isFormQuestion(q)) {
        for (let j = 0; j < q.fields.length; j += 1) {
          const field = q.fields[j];
          if (field.required && !formAnswers[i]?.[field.name]?.trim()) return false;
          if (
            showOtherOption &&
            field.type === 'select' &&
            formAnswers[i]?.[field.name] === OTHER_OPTION_VALUE &&
            !formOtherTexts[`${i}:${field.name}`]?.trim()
          ) {
            return false;
          }
        }
        return true;
      }
      const sel = selections[i] ?? [];
      if (sel.length === 0) return false;
      if (
        showOtherOption &&
        sel.some((s) => s === OTHER_OPTION_VALUE) &&
        !otherTexts[String(i)]?.trim()
      )
        return false;
      return true;
    },
    [data.questions, formAnswers, formOtherTexts, selections, otherTexts, showOtherOption],
  );

  const canSubmit = useMemo(() => {
    if (!answerId) return false;
    if (submitted) return false;
    for (let i = 0; i < data.questions.length; i += 1) {
      if (!isQuestionAnswered(i)) return false;
    }
    return true;
  }, [answerId, data.questions, isQuestionAnswered, submitted]);

  const isLastTab = activeTab === data.questions.length - 1;
  const currentAnswered = isQuestionAnswered(activeTab);

  const handleOptionToggle = useCallback(
    (qIndex: number, label: string, isOther: boolean) => {
      if (isDisabled) return;
      const q = data.questions[qIndex];
      if (isFormQuestion(q)) return;

      setSelections((prev) => {
        const current = prev[qIndex] ?? [];

        if (isOther) {
          if (current.some((s) => s === OTHER_OPTION_VALUE)) {
            return { ...prev, [qIndex]: current.filter((s) => s !== OTHER_OPTION_VALUE) };
          }
          if (!getChoiceMultiSelect(q)) {
            return { ...prev, [qIndex]: [OTHER_OPTION_VALUE] };
          }
          return { ...prev, [qIndex]: [...current, OTHER_OPTION_VALUE] };
        }

        if (!getChoiceMultiSelect(q)) {
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
    [data.questions, isDisabled],
  );

  const handleFormOptionToggle = useCallback(
    (qIndex: number, fieldName: string, label: string, isOther: boolean) => {
      if (isDisabled) return;
      setFormAnswers((prev) => ({
        ...prev,
        [qIndex]: {
          ...(prev[qIndex] ?? {}),
          [fieldName]: isOther ? OTHER_OPTION_VALUE : label,
        },
      }));
    },
    [isDisabled],
  );

  const handleSubmit = useCallback(async () => {
    if (submitting || !canSubmit) return;

    const answers: AskUserQuestionAnswers = {};
    for (let i = 0; i < data.questions.length; i += 1) {
      const q = data.questions[i];
      if (isFormQuestion(q)) {
        const formAnswer = { ...(formAnswers[i] ?? {}) };
        if (showOtherOption) {
          q.fields.forEach((field) => {
            if (field.type === 'select' && formAnswer[field.name] === OTHER_OPTION_VALUE) {
              formAnswer[field.name] = formOtherTexts[`${i}:${field.name}`]?.trim() || '';
            }
          });
        }
        answers[q.id] = { fields: formAnswer };
      } else {
        const sel = (selections[i] ?? []).map((s) => {
          if (s === OTHER_OPTION_VALUE) return otherTexts[String(i)]?.trim() || '';
          return s;
        });
        answers[q.id] = { answers: sel };
      }
    }

    setSubmitting(true);
    try {
      const answerBody = `${agentMode === 'plan' ? '/plan ' : ''}${Object.entries(answers)
        .map(([questionId, ans]) => `${questionId}: ${getAnswerText(ans)}`)
        .join('\n')}`;
      const body = questionSenderId ? `@${questionSenderId} ${answerBody}` : answerBody;
      const content = {
        msgtype: 'm.text',
        body,
        ...(questionSenderId
          ? {
              format: 'org.matrix.custom.html',
              formatted_body: `<a href="${encodeURI(getMatrixToUser(questionSenderId))}">@${sanitizeText(
                questionSenderId,
              )}</a> ${sanitizeText(answerBody)}`,
            }
          : {}),
        ...(questionSenderId ? { 'm.mentions': getMentionContent([questionSenderId], false) } : {}),
        'vip.elevo.ask_user_question_answers': {
          question_event_id: answerId,
          answers,
        },
      } as unknown as RoomMessageEventContent;

      if (answerThreadRootId) {
        await mx.sendMessage(room.roomId, answerThreadRootId, content);
      } else {
        await mx.sendMessage(room.roomId, content);
      }
      setLocalSubmitted(true);
      onSubmit?.();
    } catch (err) {
      console.error('Failed to submit question answers:', err);
    } finally {
      setSubmitting(false);
    }
  }, [
    submitting,
    canSubmit,
    data,
    formAnswers,
    formOtherTexts,
    selections,
    otherTexts,
    mx,
    agentMode,
    room.roomId,
    answerThreadRootId,
    onSubmit,
    answerId,
    questionSenderId,
    showOtherOption,
  ]);

  const handleCurrentQuestionEnter = useCallback(() => {
    if (isDisabled || submitting || submitted) return;
    if (!isQuestionAnswered(activeTab)) return;
    if (activeTab < data.questions.length - 1) {
      setActiveTab(activeTab + 1);
      return;
    }
    if (canSubmit) {
      handleSubmit();
    }
  }, [
    activeTab,
    canSubmit,
    data.questions.length,
    handleSubmit,
    isDisabled,
    isQuestionAnswered,
    submitting,
    submitted,
  ]);

  const currentQuestion = data.questions[activeTab];
  const currentSel = selections[activeTab] ?? [];

  return (
    <Box style={style} direction="Column" gap="0">
      <div className={CardContainer}>
        <div className={CardBody}>
          <div className={QuestionTabsBar}>
            {data.questions.map((q, qIndex) => (
              <button
                key={q.id}
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
                      <AskUserSelect
                        options={(field.options ?? []).map((option) => ({ label: option }))}
                        selectedValues={value ? [value] : []}
                        multiSelect={false}
                        disabled={isDisabled}
                        isAssignedUser={isAssignedUser}
                        otherText={formOtherTexts[`${activeTab}:${field.name}`] ?? ''}
                        otherLabel={t('askUserQuestion.other')}
                        otherPlaceholder={
                          field.placeholder ?? t('askUserQuestion.otherPlaceholder')
                        }
                        showOtherOption={showOtherOption}
                        labelledBy={fieldId}
                        onToggle={(label, isOther) =>
                          handleFormOptionToggle(activeTab, field.name, label, isOther)
                        }
                        onOtherTextChange={(nextValue) =>
                          setFormOtherTexts((prev) => ({
                            ...prev,
                            [`${activeTab}:${field.name}`]: nextValue,
                          }))
                        }
                        onOtherInputEnter={handleCurrentQuestionEnter}
                      />
                    ) : field.type === 'textarea' ? (
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
                    ) : (
                      <input
                        id={fieldId}
                        type={field.type}
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
                        required={field.required}
                        disabled={isDisabled}
                        className={FormInput}
                      />
                    )}
                  </div>
                );
              })}
            </Box>
          ) : (
            <AskUserSelect
              options={currentQuestion.options}
              selectedValues={currentSel}
              multiSelect={getChoiceMultiSelect(currentQuestion)}
              disabled={isDisabled}
              isAssignedUser={isAssignedUser}
              otherText={otherTexts[String(activeTab)] ?? ''}
              otherLabel={t('askUserQuestion.other')}
              otherPlaceholder={t('askUserQuestion.otherPlaceholder')}
              showOtherOption={showOtherOption}
              onToggle={(label, isOther) => handleOptionToggle(activeTab, label, isOther)}
              onOtherTextChange={(nextValue) =>
                setOtherTexts((prev) => ({ ...prev, [String(activeTab)]: nextValue }))
              }
              onOtherInputEnter={handleCurrentQuestionEnter}
            />
          )}
        </div>
        <div className={QuestionCardFooter}>
          {submitted ? (
            <>
              <Icon src={Icons.Check} size="200" className={SubmittedIcon} />
              <Text size="T300" priority="300" className={SubmittedText}>
                {t('askUserQuestion.submitted')}
              </Text>
            </>
          ) : (
            <>
              {isLastTab ? (
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
              ) : (
                <button
                  type="button"
                  className={ContinueButton({
                    disabled: !currentAnswered || isDisabled,
                  })}
                  disabled={!currentAnswered || isDisabled}
                  onClick={() => setActiveTab(activeTab + 1)}
                >
                  {t('askUserQuestion.continue')}
                </button>
              )}
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
