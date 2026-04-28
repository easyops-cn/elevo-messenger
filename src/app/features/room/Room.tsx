import React, { useCallback } from 'react';
import { Box } from 'folds';
import { useParams } from 'react-router-dom';
import { isKeyHotkey } from 'is-hotkey';
import { useAtomValue } from 'jotai';
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
import { CallView } from '../call/CallView';
import { RoomViewHeader } from './RoomViewHeader';
import { callChatAtom } from '../../state/callEmbed';
import { CallChatView } from './CallChatView';
import { PageMain } from '../../components/page';
import { useThreadChat } from '../../state/threadChat';
import { ThreadChatView } from './ThreadChatView';

export function Room() {
  const { eventId } = useParams();
  const room = useRoom();
  const mx = useMatrixClient();

  const [showSidePanel] = useSetting(settingsAtom, 'showRoomSidePanel');
  const [hideActivity] = useSetting(settingsAtom, 'hideActivity');
  const screenSize = useScreenSizeContext();
  const powerLevels = usePowerLevels(room);
  const chat = useAtomValue(callChatAtom);
  const [threadChat] = useThreadChat(room.roomId);

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

  const showCallView = callView && (screenSize === ScreenSize.Desktop || !chat);
  const showRoomView = !callView && showMainRoomView;

  return (
    <PowerLevelsContextProvider value={powerLevels}>
      <Box grow="Yes">
        {(showCallView || showRoomView) && <PageMain>
          {showCallView && (
            <Box grow="Yes" direction="Column">
              <RoomViewHeader callView />
              <Box grow="Yes">
                <CallView />
              </Box>
            </Box>
          )}
          {showRoomView && (
            <Box grow="Yes" direction="Column">
              <RoomViewHeader />
              <Box grow="Yes">
                <RoomView eventId={eventId} />
              </Box>
            </Box>
          )}
        </PageMain>}
        {showThreadPanel && <ThreadChatView />}
        {callView && chat && (
          <CallChatView />
        )}
        {!callView && screenSize === ScreenSize.Desktop && showSidePanel && !showThreadPanel && (
          <RoomSidePanel key={room.roomId} room={room} />
        )}
      </Box>
    </PowerLevelsContextProvider>
  );
}
