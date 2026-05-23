import React, { useCallback, MouseEventHandler } from 'react';
import { Avatar, Box, Chip, Icon, Icons, Text, config } from 'folds';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { RoomProvider } from '../../../hooks/useRoom';
import { AskUserQuestionCard } from '../../../components/message/elevo/AskUser';
import { SequenceCard } from '../../../components/sequence-card';
import { UserAvatar } from '../../../components/user-avatar';
import { AvatarBase, ModernLayout, Time, Username, UsernameBold } from '../../../components/message';
import { getMemberAvatarMxc, getMemberDisplayName } from '../../../utils/room';
import { mxcUrlToHttp, getMxIdLocalPart } from '../../../utils/matrix';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import type { TodoItem } from './useTodosApi';

type TodoItemCardProps = {
  item: TodoItem;
  hour24Clock: boolean;
  dateFormatString: string;
  onSubmit: (roomId: string, eventId: string) => void;
  onOpen: (roomId: string, eventId: string) => void;
};

export function TodoItemCard({ item, hour24Clock, dateFormatString, onSubmit, onOpen }: TodoItemCardProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();

  const handleSubmit = useCallback(() => {
    onSubmit(item.room_id, item.question_event_id);
  }, [onSubmit, item.room_id, item.question_event_id]);

  const handleOpenClick: MouseEventHandler = () => {
    onOpen(item.room_id, item.question_event_id);
  };

  const room = mx.getRoom(item.room_id);
  if (!room) {
    return (
      <SequenceCard variant="SurfaceVariant" direction="Column" style={{ padding: config.space.S400 }}>
        <Text size="T300" priority="300">
          Room not available
        </Text>
      </SequenceCard>
    );
  }

  const displayName =
    getMemberDisplayName(room, item.sender) ?? getMxIdLocalPart(item.sender) ?? item.sender;
  const senderAvatarMxc = getMemberAvatarMxc(room, item.sender);

  return (
    <RoomProvider value={room}>
      <SequenceCard
        variant="SurfaceVariant"
        direction="Column"
        style={{ padding: config.space.S400 }}
      >
        <ModernLayout
          inTimeline={false}
          before={
            <AvatarBase>
              <Avatar size="300" radii="Pill">
                <UserAvatar
                  userId={item.sender}
                  src={
                    senderAvatarMxc
                      ? mxcUrlToHttp(mx, senderAvatarMxc, useAuthentication, 48, 48, 'crop') ??
                        undefined
                      : undefined
                  }
                  alt={displayName}
                  renderFallback={() => <Icon size="200" src={Icons.User} filled />}
                />
              </Avatar>
            </AvatarBase>
          }
        >
          <Box gap="300" justifyContent="SpaceBetween" alignItems="Center" grow="Yes">
            <Box gap="200" alignItems="Baseline">
              <Box alignItems="Center" gap="200">
                <Username>
                  <Text as="span" truncate>
                    <UsernameBold>{displayName}</UsernameBold>
                  </Text>
                </Username>
              </Box>
              <Time ts={item.created_at * 1000} hour24Clock={hour24Clock} dateFormatString={dateFormatString} />
            </Box>
            <Chip onClick={handleOpenClick} variant="Secondary" radii="400">
              <Text size="T200">Open</Text>
            </Chip>
          </Box>
          <Box grow="Yes" direction="Column" gap="200">
            <AskUserQuestionCard
              data={item.question}
              eventId={item.question_event_id}
              initialHumanSender={item.assignee}
              onSubmit={handleSubmit}
            />
          </Box>
        </ModernLayout>
      </SequenceCard>
    </RoomProvider>
  );
}
