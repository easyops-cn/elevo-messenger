import React, { useEffect, useMemo, useRef, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import { Room, RoomMember } from 'matrix-js-sdk';
import { RoomMessageEventContent } from 'matrix-js-sdk/lib/types';
import { useTranslation } from 'react-i18next';
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Dialog,
  Header,
  Icon,
  IconButton,
  Icons,
  Input,
  Menu,
  MenuItem,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Scroll,
  Text,
  TextArea,
  config,
} from 'folds';

import * as css from './CreateTaskModal.css';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoomMembers } from '../../hooks/useRoomMembers';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { getMemberDisplayName, getMentionContent } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import { sanitizeText } from '../../utils/sanitize';
import { stopPropagation } from '../../utils/keyboard';
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
  // member, the `assignee` lookup below resolves to undefined and the field
  // falls back to empty.
  const [assigneeId, setAssigneeId] = useState<string | null>(() => getLastAssignee(room.roomId));
  // Free-text shown in the assignee search input.
  const [query, setQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [withPlan, setWithPlan] = useState(false);
  const [request, setRequest] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const assignee: RoomMember | undefined = useMemo(
    () => sortedMembers.find((m) => m.userId === assigneeId),
    [sortedMembers, assigneeId],
  );

  // Seed the input with the restored assignee's name once members load.
  useEffect(() => {
    if (assignee) setQuery(memberName(room, assignee.userId));
    // Only run when the resolved assignee identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignee?.userId]);

  // When the field text exactly matches the selected member, show the full
  // list; otherwise filter by the typed query (display name or user id).
  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selectedName = assignee ? memberName(room, assignee.userId).toLowerCase() : null;
    if (!q || q === selectedName) return sortedMembers;
    return sortedMembers.filter(
      (m) =>
        memberName(room, m.userId).toLowerCase().includes(q) || m.userId.toLowerCase().includes(q),
    );
  }, [sortedMembers, query, assignee, room]);

  const avatarUrl = (member: RoomMember): string | undefined => {
    const mxc = member.getMxcAvatarUrl();
    return mxc
      ? (mx.mxcUrlToHttp(mxc, 100, 100, 'crop', undefined, false, useAuthentication) ?? undefined)
      : undefined;
  };

  const selectMember = (member: RoomMember) => {
    setAssigneeId(member.userId);
    setQuery(memberName(room, member.userId));
    setPickerOpen(false);
  };

  const canSubmit = !!assignee && request.trim().length > 0 && !submitting;

  const handleSubmit = () => {
    if (!assignee || !request.trim() || submitting) return;
    setSubmitting(true);

    const name = memberName(room, assignee.userId);
    const planSuffix = withPlan ? '并写好计划' : '';
    const requestText = request.trim();

    // Plain `body` uses the stable user id prefix; the real mention is carried
    // by `m.mentions`, and the bot's /thread detection strips any leading
    // `@...` prefix before matching the command.
    const body = `${assignee.userId} /thread 创建任务${planSuffix}：\n${requestText}`;

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
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: () => requestRef.current,
            returnFocusOnDeactivate: false,
            allowOutsideClick: true,
            clickOutsideDeactivates: true,
            onDeactivate: requestClose,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Dialog variant="Surface">
            <Header size="500" style={{ padding: `0 ${config.space.S200} 0 ${config.space.S400}` }}>
              <Box grow="Yes">
                <Text size="H4" truncate>
                  {t('taskBoard.createTask.title')}
                </Text>
              </Box>
              <Box shrink="No">
                <IconButton size="300" radii="300" onClick={requestClose}>
                  <Icon src={Icons.Cross} />
                </IconButton>
              </Box>
            </Header>

            <Box direction="Column" gap="400" style={{ padding: config.space.S400 }}>
              {/* Assignee */}
              <Box direction="Column" gap="100">
                <Text size="L400">{t('taskBoard.createTask.assignee')}</Text>
                <div style={{ position: 'relative' }}>
                  <Input
                    size="500"
                    variant="Background"
                    autoComplete="off"
                    before={
                      assignee ? (
                        <Avatar size="200" radii="Pill">
                          <UserAvatar
                            userId={assignee.userId}
                            src={avatarUrl(assignee)}
                            alt={memberName(room, assignee.userId)}
                            renderFallback={() => <Icon size="50" src={Icons.User} filled />}
                          />
                        </Avatar>
                      ) : (
                        <Icon size="100" src={Icons.User} />
                      )
                    }
                    placeholder={t('taskBoard.createTask.assigneePlaceholder')}
                    value={query}
                    onFocus={() => setPickerOpen(true)}
                    onChange={(e) => {
                      setQuery((e.target as HTMLInputElement).value);
                      setAssigneeId(null);
                      setPickerOpen(true);
                    }}
                  />
                  {pickerOpen && filteredMembers.length > 0 && (
                    <FocusTrap
                      focusTrapOptions={{
                        initialFocus: false,
                        onDeactivate: () => setPickerOpen(false),
                        returnFocusOnDeactivate: false,
                        clickOutsideDeactivates: true,
                        allowOutsideClick: true,
                        escapeDeactivates: stopPropagation,
                      }}
                    >
                      <Box style={{ position: 'relative' }}>
                        <Menu style={{ position: 'absolute', top: 0, zIndex: 1, width: '100%' }}>
                          <Scroll hideTrack size="300" className={css.MemberList}>
                            <Box direction="Column" style={{ padding: config.space.S100 }}>
                              {filteredMembers.map((member) => (
                                <MenuItem
                                  key={member.userId}
                                  type="button"
                                  variant="Surface"
                                  radii="300"
                                  size="300"
                                  aria-pressed={member.userId === assigneeId}
                                  onClick={() => selectMember(member)}
                                  before={
                                    <Avatar size="200" radii="Pill">
                                      <UserAvatar
                                        userId={member.userId}
                                        src={avatarUrl(member)}
                                        alt={memberName(room, member.userId)}
                                        renderFallback={() => (
                                          <Icon size="50" src={Icons.User} filled />
                                        )}
                                      />
                                    </Avatar>
                                  }
                                  after={
                                    <Text size="T200" priority="300" truncate>
                                      {getMxIdLocalPart(member.userId) ?? member.userId}
                                    </Text>
                                  }
                                >
                                  <Box grow="Yes" style={{ minWidth: 0 }}>
                                    <Text size="T300" truncate>
                                      {memberName(room, member.userId)}
                                    </Text>
                                  </Box>
                                </MenuItem>
                              ))}
                            </Box>
                          </Scroll>
                        </Menu>
                      </Box>
                    </FocusTrap>
                  )}
                </div>
              </Box>

              {/* Requirement */}
              <Box direction="Column" gap="100">
                <Text size="L400">{t('taskBoard.createTask.request')}</Text>
                <TextArea
                  ref={requestRef}
                  className={css.TextAreaField}
                  variant="Background"
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

              <Box gap="200" justifyContent="End">
                <Button
                  size="300"
                  variant="Secondary"
                  fill="Soft"
                  radii="300"
                  onClick={requestClose}
                >
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
            </Box>
          </Dialog>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}
