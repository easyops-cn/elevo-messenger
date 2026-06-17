import React, { CSSProperties, useCallback, useState } from 'react';
import { Box, Text, config } from 'folds';
import { MsgType } from 'matrix-js-sdk';
import type { RoomMessageEventContent } from 'matrix-js-sdk/lib/types';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useRoom } from '../../../hooks/useRoom';
import { useRoomThread } from '../../../features/room/RoomThreadContext';
import { sanitizeText } from '../../../utils/sanitize';
import { getMentionContent } from '../../../utils/room';
import { getMatrixToUser } from '../../../plugins/matrix-to';
import { SubmitButton, ContinueButton, AssignedHint } from './AskUser.css';
import type { ToolCallData } from './ToolCallCard';

const TOOL_APPROVAL_KEY = 'vip.elevo.tool_approval';

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
      const answerBody = approved ? 'Approved plan' : 'Rejected plan';
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
          ...(approved ? {} : { reason: 'Rejected by user' }),
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
    [canRespond, eventId, mx, room.roomId, thread, toolCall, toolSenderId],
  );

  if (toolCall.state !== 'approval-requested') return null;

  return (
    <Box direction="Column" gap="100" style={style}>
      <Box alignItems="Center" gap="200">
        {toolCall.state === 'approval-requested' && (
          <>
            <button
              type="button"
              className={SubmitButton({ disabled: !canRespond || submitting === 'approve' })}
              disabled={!canRespond || !!submitting}
              onClick={() => sendApproval(true)}
            >
              Approve
            </button>
            <button
              type="button"
              className={ContinueButton({ disabled: !canRespond || submitting === 'reject' })}
              disabled={!canRespond || !!submitting}
              onClick={() => sendApproval(false)}
            >
              Reject
            </button>
          </>
        )}
      </Box>
      {!isAssignedUser && toolCall.state === 'approval-requested' && (
        <Text size="T200" priority="300" className={AssignedHint}>
          Only the requesting user can respond.
        </Text>
      )}
      {submitted && (
        <Text size="T200" priority="300" style={{ marginTop: config.space.S100 }}>
          Response submitted.
        </Text>
      )}
    </Box>
  );
}
