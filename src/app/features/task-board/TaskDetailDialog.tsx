import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Icon,
  IconButton,
  Icons,
  Modal,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Scroll,
  Spinner,
  Text,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { useTranslation } from 'react-i18next';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { stopPropagation } from '../../utils/keyboard';
import { fetchWorkspaceTaskDetail } from './api';
import { useTaskBoard } from './TaskBoardContext';
import { InlineError, useErrorMessage } from './InlineError';
import { PRESET_DOCS, type PresetDoc, type TaskDetail, type TaskSummary } from './types';
import * as css from './TaskBoard.css';

type TaskDetailDialogProps = {
  task: TaskSummary;
  requestClose: () => void;
};

function formatDateTime(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <Box className={css.MetaItem} direction="Column" gap="100">
      <Text size="T200" priority="300">
        {label}
      </Text>
      <Text size="T300" truncate title={value || undefined}>
        {value || '-'}
      </Text>
    </Box>
  );
}

function MarkdownDoc({ content }: { content: string }) {
  const html = useMemo(() => {
    const parsed = marked.parse(content, { gfm: true, breaks: true }) as string;
    return DOMPurify.sanitize(typeof parsed === 'string' ? parsed : '');
  }, [content]);
  return <div className={css.Markdown} dangerouslySetInnerHTML={{ __html: html }} />;
}

function DocSection({
  title,
  content,
  defaultExpanded,
}: {
  title: string;
  content: TaskDetail['docs'][PresetDoc];
  defaultExpanded: boolean;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(defaultExpanded);

  const body = (() => {
    if (typeof content === 'string') return <MarkdownDoc content={content} />;
    if (content && typeof content === 'object' && 'error' in content) {
      return (
        <Text size="T300" priority="300">
          {t('taskBoard.docUnreadable', { error: content.error })}
        </Text>
      );
    }
    return null;
  })();

  return (
    <Box className={css.DocSection} direction="Column">
      <Box
        as="button"
        type="button"
        className={css.DocHeader}
        alignItems="Center"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        <Icon
          className={`${css.DocChevron}${expanded ? '' : ` ${css.DocChevronCollapsed}`}`}
          size="100"
          src={Icons.ChevronBottom}
        />
        <Text size="H6">{title}</Text>
      </Box>
      {expanded && <Box className={css.DocBody}>{body}</Box>}
    </Box>
  );
}

export function TaskDetailDialog({ task, requestClose }: TaskDetailDialogProps) {
  const { t } = useTranslation();
  const { baseUrl, workspaceId } = useTaskBoard();
  const toMessage = useErrorMessage();

  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    fetchWorkspaceTaskDetail(baseUrl, workspaceId, task.slug)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [baseUrl, workspaceId, task.slug]);

  const docs = detail?.docs;
  const visibleDocs = useMemo(
    () => (docs ? PRESET_DOCS.filter((key) => docs[key] != null) : []),
    [docs],
  );
  const lastVisible = visibleDocs[visibleDocs.length - 1];

  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: requestClose,
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Modal className={css.DialogContent} size="500">
            <Box className={css.DialogHeader} gap="200">
              <Box grow="Yes" direction="Column" gap="100">
                <Text className={css.ClampTwo} size="H4" title={task.title}>
                  {task.title}
                </Text>
                {task.summary && (
                  <Text className={css.ClampThree} size="T300" priority="300">
                    {task.summary}
                  </Text>
                )}
              </Box>
              <IconButton
                size="300"
                radii="300"
                onClick={requestClose}
                aria-label={t('common.close')}
              >
                <Icon src={Icons.Cross} />
              </IconButton>
            </Box>
            <Scroll size="300" hideTrack visibility="Hover">
              <Box className={css.DialogBody} direction="Column">
                <Box className={css.MetaGrid}>
                  <MetaItem label={t('taskBoard.status')} value={task.status} />
                  <MetaItem label={t('taskBoard.assignee')} value={task.assignee ?? ''} />
                  <MetaItem label={t('taskBoard.author')} value={task.author} />
                  <MetaItem label={t('taskBoard.slug')} value={task.slug} />
                  <MetaItem
                    label={t('taskBoard.createdAt')}
                    value={formatDateTime(task.createdAt)}
                  />
                  <MetaItem
                    label={t('taskBoard.updatedAt')}
                    value={formatDateTime(task.updatedAt)}
                  />
                </Box>

                {loading && (
                  <Box className={css.Centered} justifyContent="Center" alignItems="Center">
                    <Spinner />
                  </Box>
                )}

                {!loading && error != null && <InlineError message={toMessage(error)} />}

                {!loading && error == null && detail && visibleDocs.length === 0 && (
                  <Box justifyContent="Center" style={{ padding: '24px 0' }}>
                    <Text size="T300" priority="300">
                      {t('taskBoard.noDocuments')}
                    </Text>
                  </Box>
                )}

                {!loading &&
                  error == null &&
                  docs &&
                  visibleDocs.map((key) => (
                    <DocSection
                      key={key}
                      title={t(`taskBoard.doc.${key}`)}
                      content={docs[key]}
                      defaultExpanded={key === lastVisible}
                    />
                  ))}
              </Box>
            </Scroll>
          </Modal>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}
