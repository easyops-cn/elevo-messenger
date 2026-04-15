import React, { CSSProperties, ReactNode, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod/v4';
import { Box, Chip, Icon, Icons, Text, color, config, toRem } from 'folds';
import { IContent } from 'matrix-js-sdk';
import { invoke } from '@tauri-apps/api/core';
import { JUMBO_EMOJI_REG, URL_REG } from '../../utils/regex';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoom } from '../../hooks/useRoom';
import { isDesktopTauri } from '../../plugins/useTauriOpener';
import { trimReplyFromBody } from '../../utils/room';
import { MessageTextBody } from './layout';
import {
  MessageBadEncryptedContent,
  MessageBrokenContent,
  MessageDeletedContent,
  MessageEditedContent,
  MessageUnsupportedContent,
} from './content';
import {
  IAudioContent,
  IAudioInfo,
  IEncryptedFile,
  IFileContent,
  IFileInfo,
  IImageContent,
  IImageInfo,
  IThumbnailContent,
  IVideoContent,
  IVideoInfo,
  MATRIX_SPOILER_PROPERTY_NAME,
  MATRIX_SPOILER_REASON_PROPERTY_NAME,
} from '../../../types/matrix/common';
import { FALLBACK_MIMETYPE, getBlobSafeMimeType } from '../../utils/mimeTypes';
import { parseGeoUri, scaleYDimension } from '../../utils/common';
import { Attachment, AttachmentBox, AttachmentContent, AttachmentHeader } from './attachment';
import { FileHeader, FileDownloadButton } from './FileHeader';
import { VoiceMessage } from './content/VoiceMessage';
import type { RoomMessageEventContent } from 'matrix-js-sdk/lib/types';

export function MBadEncrypted() {
  return (
    <Text>
      <MessageBadEncryptedContent />
    </Text>
  );
}

type RedactedContentProps = {
  reason?: string;
};
export function RedactedContent({ reason }: RedactedContentProps) {
  return (
    <Text>
      <MessageDeletedContent reason={reason} />
    </Text>
  );
}

export function UnsupportedContent() {
  return (
    <Text>
      <MessageUnsupportedContent />
    </Text>
  );
}

export function BrokenContent() {
  return (
    <Text>
      <MessageBrokenContent />
    </Text>
  );
}

const ToolCallSchema = z.object({
  name: z.string(),
  title: z.string().optional(),
  input: z.unknown(),
  output: z.unknown().optional(),
  status: z.enum(['inprogress', 'completed']),
});

type ToolCallData = z.infer<typeof ToolCallSchema>;

const OidcLoginSchema = z.object({
  provider: z.string(),
  url: z.string().optional(),
  done: z.boolean().optional(),
  userId: z.string().optional(),
});

type OidcLoginData = z.infer<typeof OidcLoginSchema>;

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

function parseToolCall(content: Record<string, unknown>): ToolCallData | undefined {
  const result = ToolCallSchema.safeParse(content['vip.elevo.tool_call']);
  return result.success ? result.data : undefined;
}

type RenderBodyProps = {
  body: string;
  customBody?: string;
};
type MTextProps = {
  edited?: boolean;
  content: Record<string, unknown>;
  renderBody: (props: RenderBodyProps) => ReactNode;
  renderUrlsPreview?: (urls: string[]) => ReactNode;
  style?: CSSProperties;
};

function parseOidcLogin(content: Record<string, unknown>): OidcLoginData | undefined {
  const result = OidcLoginSchema.safeParse(content['vip.elevo.oidc_login']);
  if (!result.success) return undefined;
  const { done, url } = result.data;
  if (done === true || url) return result.data;
  return undefined;
}

function parseAskUserQuestion(content: Record<string, unknown>): AskUserQuestionData | undefined {
  const result = AskUserQuestionSchema.safeParse(content['vip.elevo.ask_user_question']);
  return result.success ? result.data : undefined;
}

function parseAskUserAnswered(content: Record<string, unknown>): AskUserAnsweredData | undefined {
  const result = AskUserAnsweredSchema.safeParse(content['vip.elevo.ask_user_answered']);
  return result.success ? result.data : undefined;
}

const toolCallHeaderStyles: CSSProperties = {
  backgroundColor: color.SurfaceVariant.Container,
  color: color.SurfaceVariant.OnContainer,
  border: `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`,
  borderRadius: config.radii.R300,
  padding: `${config.space.S100} ${config.space.S200}`,
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
  width: 'fit-content',
};

const toolCallBodyStyles: CSSProperties = {
  backgroundColor: color.SurfaceVariant.Container,
  border: `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`,
  borderRadius: config.radii.R300,
  padding: `${config.space.S200} ${config.space.S300}`,
  maxWidth: toRem(600),
};

type ToolCallCardProps = { data: ToolCallData; style?: CSSProperties };
function ToolCallCard({ data, style }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const iconColor = data.status === 'completed' ? color.Success.Main : color.Secondary.Main;
  const formatValue = (val: unknown) =>
    typeof val === 'string' ? val : JSON.stringify(val, null, 2);
  const preStyles: CSSProperties = {
    fontFamily: 'monospace',
    fontSize: toRem(12),
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    margin: 0,
  };
  const dividerStyles: CSSProperties = {
    borderTop: `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`,
    margin: `${config.space.S200} 0`,
  };

  return (
    <Box style={style} direction="Column" gap="100">
      <div
        style={toolCallHeaderStyles}
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
        <Icon src={Icons.Terminal} size="300" style={{ color: iconColor }} />
        <Text size="T300" priority="400">
          {data.title || data.name}
        </Text>
        <Icon src={expanded ? Icons.ChevronBottom : Icons.ChevronRight} size="200" />
      </div>
      {expanded && (
        <div style={toolCallBodyStyles}>
          <Text size="T200" priority="300" style={{ fontWeight: 500, marginBottom: config.space.S100 }}>
            Input
          </Text>
          <pre style={preStyles}>{formatValue(data.input)}</pre>
          {data.output !== undefined && (
            <>
              <div style={dividerStyles} />
              <Text size="T200" priority="300" style={{ fontWeight: 500, marginBottom: config.space.S100 }}>
                Output
              </Text>
              <pre style={preStyles}>{formatValue(data.output)}</pre>
            </>
          )}
        </div>
      )}
    </Box>
  );
}

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

function AskUserAnsweredCard({ data, style }: { data: AskUserAnsweredData; style?: CSSProperties }) {
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

function AskUserQuestionCard({ data, style }: { data: AskUserQuestionData; style?: CSSProperties }) {
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

const oidcLinkStyles: CSSProperties = {
  backgroundColor: color.SurfaceVariant.Container,
  color: color.SurfaceVariant.OnContainer,
  border: `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`,
  borderRadius: config.radii.R300,
  padding: config.space.S300,
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
  textDecoration: 'none',
  cursor: 'default',
  transition: 'background-color 0.15s ease',
  maxWidth: toRem(400),
};

export function MText({ edited, content, renderBody, renderUrlsPreview, style }: MTextProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const { body, formatted_body: customBody } = content;

  if (typeof body !== 'string') return <BrokenContent />;

  const oidcLogin = parseOidcLogin(content);
  if (oidcLogin && (!oidcLogin.userId || oidcLogin.userId === mx.getUserId())) {
    const cardContent = (
      <>
        <Icon src={Icons.ShieldUser} size="300" />
        <Box grow="Yes" direction="Column" gap="100">
          <Text size="T300" priority="400">
            <b>{t('oidcLogin.title', { provider: oidcLogin.provider })}</b>
          </Text>
          <Text size="T200" priority="300">
            {t(oidcLogin.done ? 'oidcLogin.doneDescription' : 'oidcLogin.description', {
              provider: oidcLogin.provider,
            })}
          </Text>
        </Box>
        <Icon
          src={oidcLogin.done ? Icons.Check : Icons.ArrowRight}
          size="200"
          style={oidcLogin.done ? { color: color.Success.Main } : undefined}
        />
      </>
    );

    const handleOidcClick = () => {
      if (isDesktopTauri && oidcLogin.url) {
        invoke('open_oauth_window', { authUrl: oidcLogin.url, label: 'oauth-elevo-bridge' }).catch((err) => {
          // eslint-disable-next-line no-console
          console.error('Failed to open OAuth window, falling back to browser:', err);
          window.open(oidcLogin.url, '_blank', 'noopener,noreferrer');
        });
      }
    };

    const renderOidcCard = () => {
      if (oidcLogin.done) {
        return <div style={oidcLinkStyles}>{cardContent}</div>;
      }
      if (isDesktopTauri) {
        return (
          <div
            role="button"
            tabIndex={0}
            style={{ ...oidcLinkStyles, cursor: 'pointer' }}
            onClick={handleOidcClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOidcClick();
              }
            }}
          >
            {cardContent}
          </div>
        );
      }
      return (
        <a
          href={oidcLogin.url}
          target="_blank"
          rel="noreferrer noopener"
          style={{ ...oidcLinkStyles, cursor: 'pointer' }}
        >
          {cardContent}
        </a>
      );
    };

    return <Box style={style}>{renderOidcCard()}</Box>;
  }

  const askUserQuestion = parseAskUserQuestion(content);
  if (askUserQuestion) {
    return <AskUserQuestionCard data={askUserQuestion} style={style} />;
  }

  const askUserAnswered = parseAskUserAnswered(content);
  if (askUserAnswered) {
    return <AskUserAnsweredCard data={askUserAnswered} style={style} />;
  }

  const toolCall = parseToolCall(content);
  if (toolCall) {
    return <ToolCallCard data={toolCall} style={style} />;
  }

  const trimmedBody = trimReplyFromBody(body);
  const urlsMatch = renderUrlsPreview && trimmedBody.match(URL_REG);
  const urls = urlsMatch ? [...new Set(urlsMatch)] : undefined;

  return (
    <>
      <MessageTextBody
        preWrap={typeof customBody !== 'string'}
        jumboEmoji={JUMBO_EMOJI_REG.test(trimmedBody)}
        style={style}
      >
        {renderBody({
          body: trimmedBody,
          customBody: typeof customBody === 'string' ? customBody : undefined,
        })}
        {edited && <MessageEditedContent />}
      </MessageTextBody>
      {renderUrlsPreview && urls && urls.length > 0 && renderUrlsPreview(urls)}
    </>
  );
}

type MEmoteProps = {
  displayName: string;
  edited?: boolean;
  content: Record<string, unknown>;
  renderBody: (props: RenderBodyProps) => ReactNode;
  renderUrlsPreview?: (urls: string[]) => ReactNode;
};
export function MEmote({
  displayName,
  edited,
  content,
  renderBody,
  renderUrlsPreview,
}: MEmoteProps) {
  const { body, formatted_body: customBody } = content;

  if (typeof body !== 'string') return <BrokenContent />;
  const trimmedBody = trimReplyFromBody(body);
  const urlsMatch = renderUrlsPreview && trimmedBody.match(URL_REG);
  const urls = urlsMatch ? [...new Set(urlsMatch)] : undefined;

  return (
    <>
      <MessageTextBody
        emote
        preWrap={typeof customBody !== 'string'}
        jumboEmoji={JUMBO_EMOJI_REG.test(trimmedBody)}
      >
        <b>{`${displayName} `}</b>
        {renderBody({
          body: trimmedBody,
          customBody: typeof customBody === 'string' ? customBody : undefined,
        })}
        {edited && <MessageEditedContent />}
      </MessageTextBody>
      {renderUrlsPreview && urls && urls.length > 0 && renderUrlsPreview(urls)}
    </>
  );
}

type MNoticeProps = {
  edited?: boolean;
  content: Record<string, unknown>;
  renderBody: (props: RenderBodyProps) => ReactNode;
  renderUrlsPreview?: (urls: string[]) => ReactNode;
};
export function MNotice({ edited, content, renderBody, renderUrlsPreview }: MNoticeProps) {
  const { body, formatted_body: customBody } = content;

  if (typeof body !== 'string') return <BrokenContent />;
  const trimmedBody = trimReplyFromBody(body);
  const urlsMatch = renderUrlsPreview && trimmedBody.match(URL_REG);
  const urls = urlsMatch ? [...new Set(urlsMatch)] : undefined;

  return (
    <>
      <MessageTextBody
        notice
        preWrap={typeof customBody !== 'string'}
        jumboEmoji={JUMBO_EMOJI_REG.test(trimmedBody)}
      >
        {renderBody({
          body: trimmedBody,
          customBody: typeof customBody === 'string' ? customBody : undefined,
        })}
        {edited && <MessageEditedContent />}
      </MessageTextBody>
      {renderUrlsPreview && urls && urls.length > 0 && renderUrlsPreview(urls)}
    </>
  );
}

type RenderImageContentProps = {
  body: string;
  filename?: string;
  info?: IImageInfo & IThumbnailContent;
  mimeType?: string;
  url: string;
  encInfo?: IEncryptedFile;
  markedAsSpoiler?: boolean;
  spoilerReason?: string;
};
type MImageProps = {
  content: IImageContent;
  renderImageContent: (props: RenderImageContentProps) => ReactNode;
  outlined?: boolean;
};
export function MImage({ content, renderImageContent, outlined }: MImageProps) {
  const imgInfo = content?.info;
  const mxcUrl = content.file?.url ?? content.url;
  if (typeof mxcUrl !== 'string') {
    return <BrokenContent />;
  }
  const height = scaleYDimension(imgInfo?.w || 400, 400, imgInfo?.h || 400);

  return (
    <Attachment outlined={outlined}>
      <AttachmentBox
        style={{
          height: toRem(height < 48 ? 48 : height),
        }}
      >
        {renderImageContent({
          body: content.body || 'Image',
          info: imgInfo,
          mimeType: imgInfo?.mimetype,
          url: mxcUrl,
          encInfo: content.file,
          markedAsSpoiler: content[MATRIX_SPOILER_PROPERTY_NAME],
          spoilerReason: content[MATRIX_SPOILER_REASON_PROPERTY_NAME],
        })}
      </AttachmentBox>
    </Attachment>
  );
}

type RenderVideoContentProps = {
  body: string;
  info: IVideoInfo & IThumbnailContent;
  mimeType: string;
  url: string;
  encInfo?: IEncryptedFile;
  markedAsSpoiler?: boolean;
  spoilerReason?: string;
};
type MVideoProps = {
  content: IVideoContent;
  renderAsFile: () => ReactNode;
  renderVideoContent: (props: RenderVideoContentProps) => ReactNode;
  outlined?: boolean;
};
export function MVideo({ content, renderAsFile, renderVideoContent, outlined }: MVideoProps) {
  const videoInfo = content?.info;
  const mxcUrl = content.file?.url ?? content.url;
  const safeMimeType = getBlobSafeMimeType(videoInfo?.mimetype ?? '');

  if (!videoInfo || !safeMimeType.startsWith('video') || typeof mxcUrl !== 'string') {
    if (mxcUrl) {
      return renderAsFile();
    }
    return <BrokenContent />;
  }

  const height = scaleYDimension(videoInfo.w || 400, 400, videoInfo.h || 400);

  const filename = content.filename ?? content.body ?? 'Video';

  return (
    <Attachment outlined={outlined}>
      <AttachmentHeader>
        <FileHeader
          body={filename}
          mimeType={safeMimeType}
          after={
            <FileDownloadButton
              filename={filename}
              url={mxcUrl}
              mimeType={safeMimeType}
              encInfo={content.file}
            />
          }
        />
      </AttachmentHeader>
      <AttachmentBox
        style={{
          height: toRem(height < 48 ? 48 : height),
        }}
      >
        {renderVideoContent({
          body: content.body || 'Video',
          info: videoInfo,
          mimeType: safeMimeType,
          url: mxcUrl,
          encInfo: content.file,
          markedAsSpoiler: content[MATRIX_SPOILER_PROPERTY_NAME],
          spoilerReason: content[MATRIX_SPOILER_REASON_PROPERTY_NAME],
        })}
      </AttachmentBox>
    </Attachment>
  );
}

type RenderAudioContentProps = {
  info: IAudioInfo;
  mimeType: string;
  url: string;
  encInfo?: IEncryptedFile;
};
type MAudioProps = {
  content: IAudioContent;
  renderAsFile: () => ReactNode;
  renderAudioContent: (props: RenderAudioContentProps) => ReactNode;
  outlined?: boolean;
};
export function MAudio({ content, renderAsFile, renderAudioContent, outlined }: MAudioProps) {
  const audioInfo = content?.info;
  const mxcUrl = content.file?.url ?? content.url;
  const safeMimeType = getBlobSafeMimeType(audioInfo?.mimetype ?? '');

  if (!audioInfo || !safeMimeType.startsWith('audio') || typeof mxcUrl !== 'string') {
    if (mxcUrl) {
      return renderAsFile();
    }
    return <BrokenContent />;
  }

  const msc1767Audio = content['org.matrix.msc1767.audio'];
  const waveform = msc1767Audio?.waveform;
  if (Array.isArray(waveform) && waveform.length > 0) {
    return (
      <Box
        style={{
          padding: config.space.S300,
          backgroundColor: color.SurfaceVariant.Container,
          color: color.SurfaceVariant.OnContainer,
          borderRadius: config.radii.R400,
          ...(outlined
            ? {
                boxShadow: `inset 0 0 0 ${config.borderWidth.B300} ${color.SurfaceVariant.ContainerLine}`,
              }
            : {}),
        }}
      >
        <VoiceMessage
          mimeType={safeMimeType}
          url={mxcUrl}
          info={audioInfo}
          encInfo={content.file}
          waveform={waveform}
        />
      </Box>
    );
  }

  const filename = content.filename ?? content.body ?? 'Audio';
  return (
    <Attachment outlined={outlined}>
      <AttachmentHeader>
        <FileHeader
          body={filename}
          mimeType={safeMimeType}
          after={
            <FileDownloadButton
              filename={filename}
              url={mxcUrl}
              mimeType={safeMimeType}
              encInfo={content.file}
            />
          }
        />
      </AttachmentHeader>
      <AttachmentBox>
        <AttachmentContent>
          {renderAudioContent({
            info: audioInfo,
            mimeType: safeMimeType,
            url: mxcUrl,
            encInfo: content.file,
          })}
        </AttachmentContent>
      </AttachmentBox>
    </Attachment>
  );
}

type RenderFileContentProps = {
  body: string;
  info: IFileInfo & IThumbnailContent;
  mimeType: string;
  url: string;
  encInfo?: IEncryptedFile;
};
type MFileProps = {
  content: IFileContent;
  renderFileContent: (props: RenderFileContentProps) => ReactNode;
  outlined?: boolean;
};
export function MFile({ content, renderFileContent, outlined }: MFileProps) {
  const fileInfo = content?.info;
  const mxcUrl = content.file?.url ?? content.url;

  if (typeof mxcUrl !== 'string') {
    return <BrokenContent />;
  }

  return (
    <Attachment outlined={outlined}>
      <AttachmentHeader>
        <FileHeader
          body={content.filename ?? content.body ?? 'Unnamed File'}
          mimeType={fileInfo?.mimetype ?? FALLBACK_MIMETYPE}
        />
      </AttachmentHeader>
      <AttachmentBox>
        <AttachmentContent>
          {renderFileContent({
            body: content.filename ?? content.body ?? 'File',
            info: fileInfo ?? {},
            mimeType: fileInfo?.mimetype ?? FALLBACK_MIMETYPE,
            url: mxcUrl,
            encInfo: content.file,
          })}
        </AttachmentContent>
      </AttachmentBox>
    </Attachment>
  );
}

type MLocationProps = {
  content: IContent;
};
export function MLocation({ content }: MLocationProps) {
  const geoUri = content.geo_uri;
  if (typeof geoUri !== 'string') return <BrokenContent />;
  const location = parseGeoUri(geoUri);
  if (!location) return <BrokenContent />;

  return (
    <Box direction="Column" alignItems="Start" gap="100">
      <Text size="T400">{geoUri}</Text>
      <Chip
        as="a"
        size="400"
        href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}`}
        target="_blank"
        rel="noreferrer noopener"
        variant="Primary"
        radii="Pill"
        before={<Icon src={Icons.External} size="50" />}
      >
        <Text size="B300">Open Location</Text>
      </Chip>
    </Box>
  );
}

type MStickerProps = {
  content: IImageContent;
  renderImageContent: (props: RenderImageContentProps) => ReactNode;
};
export function MSticker({ content, renderImageContent }: MStickerProps) {
  const imgInfo = content?.info;
  const mxcUrl = content.file?.url ?? content.url;
  if (typeof mxcUrl !== 'string') {
    return <MessageBrokenContent />;
  }
  const height = scaleYDimension(imgInfo?.w || 152, 152, imgInfo?.h || 152);

  return (
    <AttachmentBox
      style={{
        height: toRem(height < 48 ? 48 : height),
        width: toRem(152),
      }}
    >
      {renderImageContent({
        body: content.body || 'Sticker',
        info: imgInfo,
        mimeType: imgInfo?.mimetype,
        url: mxcUrl,
        encInfo: content.file,
      })}
    </AttachmentBox>
  );
}
