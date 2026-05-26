import React, { CSSProperties, ReactNode, useMemo } from 'react';
import { MText } from '../MsgTypeRenderers';
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

export function PlanCard({ content, renderBody, renderUrlsPreview, style }: PlanCardProps) {
  const planContent = useMemo(() => {
    const nextContent = { ...content };
    delete nextContent['vip.elevo.plan'];
    return nextContent;
  }, [content]);

  return (
    <div className={css.PlanCard} style={style}>
      <MText content={planContent} renderBody={renderBody} renderUrlsPreview={renderUrlsPreview} />
    </div>
  );
}
