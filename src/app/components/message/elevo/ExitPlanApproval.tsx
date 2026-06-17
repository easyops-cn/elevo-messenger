import React, { CSSProperties, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Text, config } from 'folds';
import { MsgType, type MatrixEvent } from 'matrix-js-sdk';
import type { RoomMessageEventContent } from 'matrix-js-sdk/lib/types';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useRoom } from '../../../hooks/useRoom';
import { useRoomThread } from '../../../features/room/RoomThreadContext';
import { sanitizeText } from '../../../utils/sanitize';
import { getMentionContent } from '../../../utils/room';
import { getMatrixToUser } from '../../../plugins/matrix-to';
import { AssignedHint } from './AskUser.css';
import type { ToolCallData } from './ToolCallCard';
import { MessageEvent } from '../../../../types/matrix/room';

const TOOL_APPROVAL_KEY = 'vip.elevo.tool_approval';

export function isToolApprovalEvent(mEvent: MatrixEvent) {
  const content = mEvent.getContent();
  return (
    mEvent.getType() === MessageEvent.RoomMessage &&
    content.msgtype === MsgType.Text &&
    !!content[TOOL_APPROVAL_KEY]
  );
}

export function hasToolApproval(content: Record<string, unknown>) {
  return !!content[TOOL_APPROVAL_KEY];
}

type ExitPlanApprovalProps = {
  toolCall: ToolCallData;
  eventId?: string;
  initialHumanSender?: string;
  toolSenderId?: string;
  style?: CSSProperties;
};

export function ExitPlanApprovalCard({
  toolCall,
  eventId,
  initialHumanSender,
  toolSenderId,
  style,
}: ExitPlanApprovalProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const room = useRoom();
  const thread = useRoomThread();
  const [submitting, setSubmitting] = useState<'approve' | 'reject' | undefined>();
  const [submitted, setSubmitted] = useState(false);

  const userId = mx.getUserId();
  const isAssignedUser = !initialHumanSender || initialHumanSender === userId;
  const canRespond =
    toolCall.state === 'approval-requested' &&
    !!toolCall.approval?.id &&
    !!eventId &&
    isAssignedUser &&
    !submitted;

  const sendApproval = useCallback(
    async (approved: boolean) => {
      if (!canRespond || !eventId || !toolCall.approval?.id) return;
      const kind = approved ? 'approve' : 'reject';
      setSubmitting(kind);
      const answerBody = approved
        ? t('exitPlanApproval.approvedPlan')
        : t('exitPlanApproval.rejectedPlan');
      const body = toolSenderId ? `@${toolSenderId} ${answerBody}` : answerBody;
      const content = {
        msgtype: MsgType.Text,
        body,
        ...(toolSenderId
          ? {
              format: 'org.matrix.custom.html',
              formatted_body: `<a href="${encodeURI(getMatrixToUser(toolSenderId))}">@${sanitizeText(
                toolSenderId,
              )}</a> ${sanitizeText(answerBody)}`,
              'm.mentions': getMentionContent([toolSenderId], false),
            }
          : {}),
        [TOOL_APPROVAL_KEY]: {
          tool_event_id: eventId,
          tool_call_id: toolCall.toolCallId,
          approve_id: toolCall.approval.id,
          approved,
          ...(approved ? {} : { reason: t('exitPlanApproval.rejectedByUser') }),
        },
      } as unknown as RoomMessageEventContent;

      try {
        if (thread) {
          await mx.sendMessage(room.roomId, thread.id, content);
        } else {
          await mx.sendMessage(room.roomId, content);
        }
        setSubmitted(true);
      } catch (err) {
        console.error('Failed to submit plan approval:', err);
      } finally {
        setSubmitting(undefined);
      }
    },
    [canRespond, eventId, mx, room.roomId, t, thread, toolCall, toolSenderId],
  );

  if (toolCall.state !== 'approval-requested') return null;

  return (
    <Box direction="Column" gap="100" style={style}>
      <Box alignItems="Center" gap="200">
        {toolCall.state === 'approval-requested' && (
          <>
            <Button
              type="button"
              variant="Primary"
              fill="Solid"
              size="300"
              radii="300"
              disabled={!canRespond || !!submitting}
              onClick={() => sendApproval(true)}
            >
              {t('exitPlanApproval.approve')}
            </Button>
            <Button
              type="button"
              variant="Secondary"
              fill="Soft"
              size="300"
              radii="300"
              disabled={!canRespond || !!submitting}
              onClick={() => sendApproval(false)}
            >
              {t('exitPlanApproval.reject')}
            </Button>
          </>
        )}
      </Box>
      {!isAssignedUser && toolCall.state === 'approval-requested' && (
        <Text size="T200" priority="300" className={AssignedHint}>
          {t('exitPlanApproval.assignedOnly')}
        </Text>
      )}
      {submitted && (
        <Text size="T200" priority="300" style={{ marginTop: config.space.S100 }}>
          {t('exitPlanApproval.submitted')}
        </Text>
      )}
    </Box>
  );
}
