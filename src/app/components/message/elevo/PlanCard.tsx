import React, { CSSProperties, ReactNode, useMemo } from 'react';
import { Box, Chip, Header, Icon, Text } from 'folds';
import { useTranslation } from 'react-i18next';
import { MText } from '../MsgTypeRenderers';
import { copyToClipboard } from '../../../utils/dom';
import { useTimeoutToggle } from '../../../hooks/useTimeoutToggle';
import { CopyIcon } from '../../../icons/CopyIcon';
import { CheckIcon } from '../../../icons/CheckIcon';
import * as css from './PlanCard.css';

type RenderBodyProps = {
  body: string;
  customBody?: string;
};

type PlanCardProps = {
  content: Record<string, unknown>;
  renderBody: (props: RenderBodyProps) => ReactNode;
  renderUrlsPreview?: (urls: string[]) => ReactNode;
  style?: CSSProperties;
};

export function hasPlan(content: Record<string, unknown>): boolean {
  return !!content['vip.elevo.plan'];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPlanStreaming(content: Record<string, unknown>): boolean {
  const plan = content['vip.elevo.plan'];
  if (isRecord(plan) && plan.streaming === true) return true;

  const sse = content['vip.elevo.sse'];
  return isRecord(sse) && sse.streaming === true;
}

export function PlanCard({ content, renderBody, renderUrlsPreview, style }: PlanCardProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useTimeoutToggle();
  const streaming = isPlanStreaming(content);

  const planContent = useMemo(() => {
    const nextContent = { ...content };
    delete nextContent['vip.elevo.plan'];
    return nextContent;
  }, [content]);

  const copyText = typeof planContent.body === 'string' ? planContent.body : '';

  const handleCopy = () => {
    if (!copyText) return;
    copyToClipboard(copyText);
    setCopied();
  };

  return (
    <div className={css.PlanCard} style={style}>
      <Header variant="Surface" size="400" className={css.PlanCardHeader}>
        <Box grow="Yes">
          <Text size="L400" truncate>
            {streaming ? t('planCard.writingPlan') : t('planCard.plan')}
          </Text>
        </Box>
        <Box shrink="No">
          <Chip
            variant="SurfaceVariant"
            fill="None"
            radii="Pill"
            onClick={handleCopy}
            aria-label={copied ? t('codeBlock.copied') : t('common.copy')}
            title={copied ? t('codeBlock.copied') : t('common.copy')}
          >
            <Icon size="50" src={copied ? CheckIcon : CopyIcon} />
          </Chip>
        </Box>
      </Header>
      <div className={css.PlanCardContent}>
        <MText
          content={planContent}
          renderBody={renderBody}
          renderUrlsPreview={renderUrlsPreview}
        />
      </div>
    </div>
  );
}
