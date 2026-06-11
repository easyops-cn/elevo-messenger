import React, { useMemo, useRef, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import { Room, RoomMember } from 'matrix-js-sdk';
import { RoomMessageEventContent } from 'matrix-js-sdk/lib/types';
import { useTranslation } from 'react-i18next';
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Icon,
  Icons,
  Input,
  Line,
  MenuItem,
  Modal,
  Overlay,
  OverlayCenter,
  Scroll,
  Text,
  TextArea,
  config,
  toRem,
} from 'folds';

import * as css from './CreateTaskModal.css';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoomMembers } from '../../hooks/useRoomMembers';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { getMemberDisplayName, getMentionContent } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import { sanitizeText } from '../../utils/sanitize';
import { UserAvatar } from '../../components/user-avatar';

type CreateTaskModalProps = {
  room: Room;
  requestClose: () => void;
};

const lastAssigneeKey = (roomId: string): string => `elevo.taskAssignee.${roomId}`;

const getLastAssignee = (roomId: string): string | null => {
  try {
    return localStorage.getItem(lastAssigneeKey(roomId));
  } catch {
    return null;
  }
};

const setLastAssignee = (roomId: string, userId: string): void => {
  try {
    localStorage.setItem(lastAssigneeKey(roomId), userId);
  } catch {
    // ignore storage failures (private mode / quota)
  }
};

const memberName = (room: Room, userId: string): string =>
  getMemberDisplayName(room, userId) ?? getMxIdLocalPart(userId) ?? userId;

export function CreateTaskModal({ room, requestClose }: CreateTaskModalProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const members = useRoomMembers(mx, room.roomId);
  const useAuthentication = useMediaAuthentication();

  const requestRef = useRef<HTMLTextAreaElement>(null);

  // Members sorted by display name, deduped by userId.
  const sortedMembers = useMemo(() => {
    const list = members.filter((m) => m.membership === 'join' || m.membership === 'invite');
    return [...list].sort((a, b) =>
      memberName(room, a.userId).localeCompare(memberName(room, b.userId)),
    );
  }, [members, room]);

  // Restore the last-used assignee for this room. If that user is no longer a
  // member, the `assignee` lookup below resolves to undefined and the trigger
  // falls back to the placeholder.
  const [assigneeId, setAssigneeId] = useState<string | null>(() => getLastAssignee(room.roomId));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [withPlan, setWithPlan] = useState(false);
  const [request, setRequest] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const assignee: RoomMember | undefined = useMemo(
    () => sortedMembers.find((m) => m.userId === assigneeId),
    [sortedMembers, assigneeId],
  );

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedMembers;
    return sortedMembers.filter(
      (m) =>
        memberName(room, m.userId).toLowerCase().includes(q) || m.userId.toLowerCase().includes(q),
    );
  }, [sortedMembers, query, room]);

  const avatarUrl = (member: RoomMember): string | undefined => {
    const mxc = member.getMxcAvatarUrl();
    return mxc
      ? (mx.mxcUrlToHttp(mxc, 100, 100, 'crop', undefined, false, useAuthentication) ?? undefined)
      : undefined;
  };

  const canSubmit = !!assignee && request.trim().length > 0 && !submitting;

  const handleSubmit = () => {
    if (!assignee || !request.trim() || submitting) return;
    setSubmitting(true);

    const name = memberName(room, assignee.userId);
    const planSuffix = withPlan ? '并写好计划' : '';
    const requestText = request.trim();

    // Plain `body` keeps a readable `@name` prefix; the real mention is carried
    // by `m.mentions`, and the bot's /thread detection strips any leading
    // `@...` prefix before matching the command.
    const body = `@${name} /thread 创建任务${planSuffix}：\n${requestText}`;

    const safeName = sanitizeText(name);
    const safeRequest = sanitizeText(requestText).replace(/\n/g, '<br/>');
    const mentionAnchor = `<a href="${encodeURI(
      `https://matrix.to/#/${assignee.userId}`,
    )}">${safeName}</a>`;
    const formattedBody = `${mentionAnchor} /thread 创建任务${planSuffix}：<br/>${safeRequest}`;

    const content = {
      msgtype: 'm.text',
      body,
      format: 'org.matrix.custom.html',
      formatted_body: formattedBody,
      'm.mentions': getMentionContent([assignee.userId], false),
    } as unknown as RoomMessageEventContent;

    mx.sendMessage(room.roomId, null, content);
    setLastAssignee(room.roomId, assignee.userId);
    requestClose();
  };

  return (
    <Overlay open>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: () => requestRef.current,
            returnFocusOnDeactivate: false,
            allowOutsideClick: true,
            clickOutsideDeactivates: true,
            onDeactivate: requestClose,
            escapeDeactivates: (evt) => {
              evt.stopPropagation();
              return true;
            },
          }}
        >
          <Modal size="400" style={{ maxHeight: toRem(560), borderRadius: config.radii.R500 }}>
            <Box
              shrink="No"
              direction="Column"
              gap="100"
              style={{ padding: config.space.S400, paddingBottom: config.space.S200 }}
            >
              <Text size="H4">{t('taskBoard.createTask.title')}</Text>
            </Box>

            <Scroll size="300" hideTrack>
              <Box
                direction="Column"
                gap="400"
                style={{ padding: `0 ${config.space.S400} ${config.space.S400}` }}
              >
                {/* Assignee */}
                <Box direction="Column">
                  <Text className={css.FieldLabel} size="L400">
                    {t('taskBoard.createTask.assignee')}
                  </Text>
                  {!pickerOpen ? (
                    <Box
                      as="button"
                      type="button"
                      className={css.AssigneeTrigger}
                      onClick={() => {
                        setQuery('');
                        setPickerOpen(true);
                      }}
                    >
                      {assignee ? (
                        <>
                          <Avatar size="200" radii="Pill">
                            <UserAvatar
                              userId={assignee.userId}
                              src={avatarUrl(assignee)}
                              alt={memberName(room, assignee.userId)}
                              renderFallback={() => <Icon size="50" src={Icons.User} filled />}
                            />
                          </Avatar>
                          <Box grow="Yes" style={{ minWidth: 0 }}>
                            <Text size="T300" truncate>
                              {memberName(room, assignee.userId)}
                            </Text>
                          </Box>
                        </>
                      ) : (
                        <Box grow="Yes" style={{ minWidth: 0 }}>
                          <Text className={css.Placeholder} size="T300" truncate>
                            {t('taskBoard.createTask.assigneePlaceholder')}
                          </Text>
                        </Box>
                      )}
                      <Icon size="100" src={Icons.ChevronBottom} />
                    </Box>
                  ) : (
                    <Box direction="Column" gap="200">
                      <Input
                        size="400"
                        variant="Background"
                        radii="400"
                        outlined
                        autoFocus
                        before={<Icon size="100" src={Icons.Search} />}
                        placeholder={t('taskBoard.createTask.searchMembers')}
                        value={query}
                        onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
                      />
                      <div className={css.MemberList}>
                        {filteredMembers.map((member) => (
                          <MenuItem
                            key={member.userId}
                            variant="Surface"
                            radii="400"
                            size="300"
                            aria-pressed={member.userId === assigneeId}
                            onClick={() => {
                              setAssigneeId(member.userId);
                              setPickerOpen(false);
                            }}
                            before={
                              <Avatar size="200" radii="Pill">
                                <UserAvatar
                                  userId={member.userId}
                                  src={avatarUrl(member)}
                                  alt={memberName(room, member.userId)}
                                  renderFallback={() => <Icon size="50" src={Icons.User} filled />}
                                />
                              </Avatar>
                            }
                          >
                            <Box grow="Yes" style={{ minWidth: 0 }}>
                              <Text size="T300" truncate>
                                {memberName(room, member.userId)}
                              </Text>
                            </Box>
                          </MenuItem>
                        ))}
                      </div>
                    </Box>
                  )}
                </Box>

                {/* Requirement */}
                <Box direction="Column">
                  <Text className={css.FieldLabel} size="L400">
                    {t('taskBoard.createTask.request')}
                  </Text>
                  <TextArea
                    ref={requestRef}
                    className={css.TextAreaField}
                    variant="Background"
                    radii="400"
                    resize="Vertical"
                    rows={4}
                    placeholder={t('taskBoard.createTask.requestPlaceholder')}
                    value={request}
                    onChange={(e) => setRequest((e.target as HTMLTextAreaElement).value)}
                    readOnly={submitting}
                  />
                </Box>

                {/* With plan */}
                <Box
                  alignItems="Center"
                  gap="200"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setWithPlan((v) => !v)}
                >
                  <Checkbox size="100" variant="Primary" checked={withPlan} readOnly />
                  <Text size="T300">{t('taskBoard.createTask.withPlan')}</Text>
                </Box>
              </Box>
            </Scroll>

            <Line size="300" />
            <Box shrink="No" gap="200" justifyContent="End" style={{ padding: config.space.S300 }}>
              <Button size="300" variant="Secondary" fill="Soft" radii="300" onClick={requestClose}>
                <Text size="B300">{t('taskBoard.createTask.cancel')}</Text>
              </Button>
              <Button
                size="300"
                variant="Primary"
                radii="300"
                disabled={!canSubmit}
                onClick={handleSubmit}
              >
                <Text size="B300">{t('taskBoard.createTask.submit')}</Text>
              </Button>
            </Box>
          </Modal>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}
