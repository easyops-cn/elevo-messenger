import React, { CSSProperties, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod/v4';
import { Box, Chip, Icon, Icons, Text, color, config, toRem } from 'folds';
import type { RoomMessageEventContent } from 'matrix-js-sdk/lib/types';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useRoom } from '../../../hooks/useRoom';

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
  questionId: z.string(),
  sessionId: z.string(),
  questions: z.array(AskUserQuestionItemSchema).min(1),
});

type AskUserQuestionData = z.infer<typeof AskUserQuestionSchema>;

const AskUserAnsweredSchema = z.object({
  questionId: z.string(),
  sessionId: z.string(),
  answers: z.record(z.string(), z.array(z.string())),
});

type AskUserAnsweredData = z.infer<typeof AskUserAnsweredSchema>;

// Parsers

export function parseAskUserQuestion(content: Record<string, unknown>): AskUserQuestionData | undefined {
  const result = AskUserQuestionSchema.safeParse(content['vip.elevo.ask_user_question']);
  return result.success ? result.data : undefined;
}

export function parseAskUserAnswered(content: Record<string, unknown>): AskUserAnsweredData | undefined {
  const result = AskUserAnsweredSchema.safeParse(content['vip.elevo.ask_user_answered']);
  return result.success ? result.data : undefined;
}

// Styles

type QuestionSelections = Record<number, string[]>;

const cardContainerStyles: CSSProperties = {
  backgroundColor: color.SurfaceVariant.Container,
  border: `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`,
  borderRadius: config.radii.R400,
  maxWidth: toRem(600),
  overflow: 'hidden',
};

const cardHeaderStyles: CSSProperties = {
  padding: `${config.space.S200} ${config.space.S300}`,
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
  backgroundColor: color.SurfaceVariant.Container,
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
  userSelect: 'none',
};

const questionBlockStyles: CSSProperties = {
  padding: `${config.space.S200} ${config.space.S300}`,
  borderTop: `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`,
};

const optionItemBase: CSSProperties = {
  padding: `${config.space.S100} ${config.space.S200}`,
  borderRadius: config.radii.R300,
  cursor: 'pointer',
  border: `${config.borderWidth.B300} solid transparent`,
  transition: 'background-color 0.15s ease, border-color 0.15s ease',
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
};

const optionItemDisabled: CSSProperties = {
  ...optionItemBase,
  cursor: 'default',
};

const optionItemSelected: CSSProperties = {
  ...optionItemBase,
  backgroundColor: color.Primary.Container,
  borderColor: color.Primary.Main,
};

// Components

export function AskUserAnsweredCard({ data, style }: { data: AskUserAnsweredData; style?: CSSProperties }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);

  return (
    <Box style={style} direction="Column" gap="100">
      <div
        style={cardHeaderStyles}
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
        <Icon src={Icons.Check} size="300" style={{ color: color.Success.Main }} />
        <Text size="T300" priority="400">
          {t('askUserQuestion.answeredTitle')}
        </Text>
        <Icon src={expanded ? Icons.ChevronBottom : Icons.ChevronRight} size="200" />
      </div>
      {expanded && (
        <div style={cardContainerStyles}>
          {Object.entries(data.answers).map(([question, answers]) => (
            <div key={question} style={questionBlockStyles}>
              <Text size="T300" priority="400" style={{ marginBottom: config.space.S100 }}>
                {question}
              </Text>
              <Box direction="Column" gap="100">
                {answers.map((answer) => (
                  <Chip key={answer} variant="Surface" outlined radii="Pill">
                    <Text size="T200">{answer}</Text>
                  </Chip>
                ))}
              </Box>
            </div>
          ))}
        </div>
      )}
    </Box>
  );
}

export function AskUserQuestionCard({ data, style }: { data: AskUserQuestionData; style?: CSSProperties }) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const room = useRoom();

  const [submitted, setSubmitted] = useState(false);
  const [selections, setSelections] = useState<QuestionSelections>({});
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const canSubmit = useMemo(() => {
    if (submitted) return false;
    for (let i = 0; i < data.questions.length; i += 1) {
      const sel = selections[i] ?? [];
      if (sel.length === 0) return false;
      if (sel.some((s) => s === 'Other:') && !(otherTexts[String(i)]?.trim())) return false;
    }
    return true;
  }, [data.questions.length, selections, otherTexts, submitted]);

  const handleOptionToggle = useCallback(
    (qIndex: number, label: string, isOther: boolean) => {
      if (submitted) return;
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
          return { ...prev, [qIndex]: [label] };
        }

        if (current.includes(label)) {
          return { ...prev, [qIndex]: current.filter((s) => s !== label) };
        }
        return { ...prev, [qIndex]: [...current, label] };
      });
    },
    [data.questions, submitted],
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
        'vip.elevo.ask_user_question_answers': answers,
      } as unknown as RoomMessageEventContent);
      setSubmitted(true);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to submit question answers:', err);
    } finally {
      setSubmitting(false);
    }
  }, [submitting, canSubmit, data.questions, selections, otherTexts, mx, room.roomId]);

  const optionStyle = (isSelected: boolean): CSSProperties =>
    submitted ? optionItemDisabled : isSelected ? optionItemSelected : optionItemBase;

  return (
    <Box style={style} direction="Column" gap="100">
      <div
        style={{
          ...cardHeaderStyles,
          borderBottom: submitted
            ? `${config.borderWidth.B300} solid ${color.Success.Main}`
            : `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`,
        }}
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
        <Icon
          src={Icons.Message}
          size="300"
          style={{ color: submitted ? color.Success.Main : color.Secondary.Main }}
        />
        <Text size="T300" priority="400">
          {t('askUserQuestion.title')}
        </Text>
        {submitted && (
          <Icon src={Icons.Check} size="200" style={{ color: color.Success.Main }} />
        )}
        <Icon src={expanded ? Icons.ChevronBottom : Icons.ChevronRight} size="200" />
      </div>
      {expanded && (
        <div style={cardContainerStyles}>
          {data.questions.map((q, qIndex) => {
            const currentSel = selections[qIndex] ?? [];
            const hasOtherSelected = currentSel.includes('Other:');

            return (
              <div key={q.question} style={questionBlockStyles}>
                {q.header && (
                  <Text size="T200" priority="300" style={{ marginBottom: config.space.S100 }}>
                    {q.header}
                  </Text>
                )}
                <Text size="T300" priority="400" style={{ marginBottom: config.space.S200 }}>
                  {q.question}
                </Text>
                <Box direction="Column" gap="100">
                  {q.options.map((opt) => {
                    const isSelected = currentSel.includes(opt.label);
                    return (
                      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
                      <div
                        key={opt.label}
                        style={optionStyle(isSelected)}
                        onClick={() => handleOptionToggle(qIndex, opt.label, false)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleOptionToggle(qIndex, opt.label, false);
                          }
                        }}
                        role={q.multiSelect ? 'checkbox' : 'radio'}
                        aria-checked={isSelected}
                        tabIndex={submitted ? -1 : 0}
                      >
                        <Icon
                          src={isSelected ? Icons.Check : q.multiSelect ? Icons.Plus : Icons.PlusCircle}
                          size="200"
                          style={{ color: isSelected ? color.Primary.Main : undefined, flexShrink: 0 }}
                        />
                        <Box grow="Yes" direction="Column" gap="0">
                          <Text size="T200" priority="400">
                            {opt.label}
                          </Text>
                          {opt.description && (
                            <Text size="T200" priority="300">
                              {opt.description}
                            </Text>
                          )}
                        </Box>
                      </div>
                    );
                  })}
                  <div style={optionStyle(hasOtherSelected)}>
                    <Icon
                      src={hasOtherSelected ? Icons.Check : q.multiSelect ? Icons.Plus : Icons.PlusCircle}
                      size="200"
                      style={{ color: hasOtherSelected ? color.Primary.Main : undefined, flexShrink: 0 }}
                    />
                    <Box grow="Yes" direction="Column" gap="100">
                      <Text
                        size="T200"
                        priority="400"
                        style={{ cursor: submitted ? 'default' : 'pointer' }}
                        onClick={() => handleOptionToggle(qIndex, 'Other:', true)}
                      >
                        {t('askUserQuestion.other')}
                      </Text>
                      {hasOtherSelected && (
                        <input
                          type="text"
                          value={otherTexts[String(qIndex)] ?? ''}
                          onChange={(e) => setOtherTexts((prev) => ({ ...prev, [String(qIndex)]: e.target.value }))}
                          placeholder={t('askUserQuestion.otherPlaceholder')}
                          disabled={submitted}
                          style={{
                            width: '100%',
                            padding: config.space.S100,
                            border: `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`,
                            borderRadius: config.radii.R300,
                            backgroundColor: color.SurfaceVariant.Container,
                            color: 'inherit',
                            fontSize: 'inherit',
                            fontFamily: 'inherit',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      )}
                    </Box>
                  </div>
                </Box>
              </div>
            );
          })}
          <div
            style={{
              padding: `${config.space.S200} ${config.space.S300}`,
              borderTop: `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`,
              display: 'flex',
              alignItems: 'center',
              gap: config.space.S200,
            }}
          >
            {submitted ? (
              <>
                <Icon src={Icons.Check} size="200" style={{ color: color.Success.Main }} />
                <Text size="T200" priority="300" style={{ color: color.Success.Main }}>
                  {t('askUserQuestion.submitted')}
                </Text>
              </>
            ) : (
              <Chip
                as="button"
                variant="Primary"
                size="400"
                radii="300"
                disabled={!canSubmit || submitting}
                onClick={handleSubmit}
              >
                <Text size="B300">
                  {submitting ? t('askUserQuestion.submitting') : t('askUserQuestion.submit')}
                </Text>
              </Chip>
            )}
          </div>
        </div>
      )}
    </Box>
  );
}
