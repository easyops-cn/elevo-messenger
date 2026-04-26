import React, { useCallback, useEffect } from 'react';
import { Box } from 'folds';
import { useParams } from 'react-router-dom';
import { isKeyHotkey } from 'is-hotkey';
import { useAtomValue, useSetAtom } from 'jotai';
import { RoomView } from './RoomView';
import { RoomSidePanel } from './RoomSidePanel';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { PowerLevelsContextProvider, usePowerLevels } from '../../hooks/usePowerLevels';
import { useRoom } from '../../hooks/useRoom';
import { useKeyDown } from '../../hooks/useKeyDown';
import { markAsRead } from '../../utils/notifications';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoomMembers } from '../../hooks/useRoomMembers';
import { CallView } from '../call/CallView';
import { RoomViewHeader } from './RoomViewHeader';
import { callChatAtom } from '../../state/callEmbed';
import { CallChatView } from './CallChatView';
import { PageMain } from '../../components/page';
import { threadChatAtom } from '../../state/threadChat';
import { ThreadChatView } from './ThreadChatView';

export function Room() {
  const { eventId } = useParams();
  const room = useRoom();
  const mx = useMatrixClient();

  const [showSidePanel] = useSetting(settingsAtom, 'showRoomSidePanel');
  const [hideActivity] = useSetting(settingsAtom, 'hideActivity');
  const screenSize = useScreenSizeContext();
  const powerLevels = usePowerLevels(room);
  const members = useRoomMembers(mx, room.roomId);
  const chat = useAtomValue(callChatAtom);
  const threadChat = useAtomValue(threadChatAtom);
  const setThreadChat = useSetAtom(threadChatAtom);

  useKeyDown(
    window,
    useCallback(
      (evt) => {
        if (isKeyHotkey('escape', evt)) {
          markAsRead(mx, room.roomId, hideActivity);
        }
      },
      [mx, room.roomId, hideActivity]
    )
  );

  const callView = room.isCallRoom();

  const showThreadPanel = !callView && threadChat.open;
  const showMainRoomView = !showThreadPanel || screenSize === ScreenSize.Desktop;

  useEffect(() => {
    setThreadChat({ open: false, threadRootId: undefined });
  }, [room.roomId, setThreadChat]);

  return (
    <PowerLevelsContextProvider value={powerLevels}>
      <Box grow="Yes">
        <PageMain>
          {callView && (screenSize === ScreenSize.Desktop || !chat) && (
            <Box grow="Yes" direction="Column">
              <RoomViewHeader callView />
              <Box grow="Yes">
                <CallView />
              </Box>
            </Box>
          )}
          {!callView && showMainRoomView && (
            <Box grow="Yes" direction="Column">
              <RoomViewHeader />
              <Box grow="Yes">
                <RoomView eventId={eventId} />
              </Box>
            </Box>
          )}
        </PageMain>
        {showThreadPanel && <ThreadChatView />}
        {callView && chat && (
          <CallChatView />
        )}
        {!callView && screenSize === ScreenSize.Desktop && showSidePanel && !showThreadPanel && (
          <RoomSidePanel key={room.roomId} room={room} members={members} />
        )}
      </Box>
    </PowerLevelsContextProvider>
  );
}
