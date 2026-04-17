import React, { CSSProperties, useCallback, useMemo, useState } from 'react';
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
  question: z.string(),
  header: z.string(),
  multiSelect: z.boolean(),
  options: z.array(AskUserQuestionOptionSchema),
});

const AskUserQuestionSchema = z.object({
  userId: z.string().optional(),
  question_id: z.string(),
  questions: z.array(AskUserQuestionItemSchema).min(1),
});

type AskUserQuestionData = z.infer<typeof AskUserQuestionSchema>;

const QuestionAnsweredSchema = z.object({
  question_id: z.string(),
  answers: z.record(z.string(), z.array(z.string())),
});

type QuestionAnsweredData = z.infer<typeof QuestionAnsweredSchema>;

export function isUserAnswerEvent(mEvent: MatrixEvent) {
  return (
    mEvent.getType() === MessageEvent.RoomMessage &&
    mEvent.getContent().msgtype === MsgType.Text &&
    !!mEvent.getContent()['vip.elevo.ask_user_question_answers']
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

export function parseQuestionAnswered(
  content: Record<string, unknown>
): QuestionAnsweredData | undefined {
  const answeredContent = content['vip.elevo.question_answered'];
  if (!answeredContent) return undefined;
  const result = QuestionAnsweredSchema.safeParse(answeredContent);
  if (result.success) {
    return result.data;
  }
  // eslint-disable-next-line no-console
  console.error('Failed to parse question answered content:', result.error);
}

// Types

type QuestionSelections = Record<number, string[]>;

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
                {answers.join(', ')}
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
}: {
  data: AskUserQuestionData;
  style?: CSSProperties;
  readOnly?: boolean;
}) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const room = useRoom();

  const [submitted, setSubmitted] = useState(false);
  const [selections, setSelections] = useState<QuestionSelections>({});
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const isAssignedUser = !data.userId || mx.getUserId() === data.userId;
  const isDisabled = !isAssignedUser || submitted || readOnly;
  const assignedDisplayName = data.userId
    ? getMemberDisplayName(room, data.userId) ?? getMxIdLocalPart(data.userId) ?? data.userId
    : undefined;

  const canSubmit = useMemo(() => {
    if (submitted) return false;
    for (let i = 0; i < data.questions.length; i += 1) {
      const sel = selections[i] ?? [];
      if (sel.length === 0) return false;
      if (sel.some((s) => s === 'Other:') && !otherTexts[String(i)]?.trim()) return false;
    }
    return true;
  }, [data.questions.length, selections, otherTexts, submitted]);

  const handleOptionToggle = useCallback(
    (qIndex: number, label: string, isOther: boolean) => {
      if (isDisabled) return;
      const q = data.questions[qIndex];

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

    const answers: Record<string, string[]> = {};
    for (let i = 0; i < data.questions.length; i += 1) {
      const q = data.questions[i];
      const sel = (selections[i] ?? []).map((s) => {
        if (s === 'Other:') return otherTexts[String(i)]?.trim() || '';
        return s;
      });
      answers[q.question] = sel;
    }

    setSubmitting(true);
    try {
      const bodyLines = Object.entries(answers).map(([q, ans]) => `${q}: ${ans.join(', ')}`);
      await mx.sendMessage(room.roomId, {
        msgtype: 'm.text',
        body: bodyLines.join('\n'),
        'vip.elevo.ask_user_question_answers': {
          question_id: data.question_id,
          answers,
        },
      } as unknown as RoomMessageEventContent);
      setSubmitted(true);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to submit question answers:', err);
    } finally {
      setSubmitting(false);
    }
  }, [submitting, canSubmit, data, selections, otherTexts, mx, room.roomId]);

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
