import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useAtomValue } from 'jotai';
import React, { ReactNode, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoomEvent, RoomEventHandlerMap, type EventTimelineSetHandlerMap } from 'matrix-js-sdk';
import { unreadEqual, unreadInfoToUnread } from '../../state/room/roomToUnread';
import LogoSVG from '../../../../public/res/apple/apple-touch-icon-144x144.png';
import NotificationSound from '../../../../public/sound/notification.ogg';
import InviteSound from '../../../../public/sound/invite.ogg';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { allInvitesAtom } from '../../state/room-list/inviteList';
import { usePreviousValue } from '../../hooks/usePreviousValue';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { getHomeInvitesPath } from '../pathUtils';
import {
  getMemberDisplayName,
  getNotificationType,
  getUnreadInfo,
  isNotificationEvent,
} from '../../utils/room';
import { NotificationType, UnreadInfo } from '../../../types/matrix/room';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../utils/matrix';
import { useSelectedRoom } from '../../hooks/router/useSelectedRoom';
import { useInboxNotificationsSelected } from '../../hooks/router/useInbox';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useSdkMessageListener, isDesktopTauri, type SdkMessagePayload } from '../../plugins/useTauriOpener';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import {
  sendSystemNotification,
  type SystemNotificationHandle,
} from '../../utils/notification';

function SystemEmojiFeature() {
  const [twitterEmoji] = useSetting(settingsAtom, 'twitterEmoji');

  if (twitterEmoji) {
    document.documentElement.style.setProperty('--font-emoji', 'Twemoji');
  } else {
    document.documentElement.style.setProperty('--font-emoji', 'Twemoji_DISABLED');
  }

  return null;
}

function PageZoomFeature() {
  const [pageZoom] = useSetting(settingsAtom, 'pageZoom');

  if (pageZoom === 100) {
    document.documentElement.style.removeProperty('font-size');
  } else {
    document.documentElement.style.setProperty('font-size', `calc(1em * ${pageZoom / 100})`);
  }

  return null;
}

function InviteNotifications() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const invites = useAtomValue(allInvitesAtom);
  const perviousInviteLen = usePreviousValue(invites.length, 0);
  const mx = useMatrixClient();

  const navigate = useNavigate();
  const [showNotifications] = useSetting(settingsAtom, 'showNotifications');
  const [notificationSound] = useSetting(settingsAtom, 'isNotificationSounds');

  const notify = useCallback(
    async (count: number) => {
      await sendSystemNotification({
        title: 'Invitation',
        icon: LogoSVG,
        badge: LogoSVG,
        body: `You have ${count} new invitation request.`,
        silent: true,
        onClick: () => {
          if (!window.closed) navigate(getHomeInvitesPath());
        },
      });
    },
    [navigate]
  );

  const playSound = useCallback(() => {
    const audioElement = audioRef.current;
    audioElement?.play();
  }, []);

  useEffect(() => {
    if (invites.length > perviousInviteLen && mx.getSyncState() === 'SYNCING') {
      if (showNotifications) {
        notify(invites.length - perviousInviteLen).catch(() => {
          // Ignore transient notification send errors.
        });
      }

      if (notificationSound) {
        playSound();
      }
    }
  }, [mx, invites, perviousInviteLen, showNotifications, notificationSound, notify, playSound]);

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <audio ref={audioRef} style={{ display: 'none' }}>
      <source src={InviteSound} type="audio/ogg" />
    </audio>
  );
}

function MessageNotifications() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const notifyRef = useRef<SystemNotificationHandle>();
  const unreadCacheRef = useRef<Map<string, UnreadInfo>>(new Map());
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const [showNotifications] = useSetting(settingsAtom, 'showNotifications');
  const [notificationSound] = useSetting(settingsAtom, 'isNotificationSounds');

  const { navigateRoom } = useRoomNavigate();
  const notificationSelected = useInboxNotificationsSelected();
  const selectedRoomId = useSelectedRoom();

  const notify = useCallback(
    async ({
      roomName,
      roomAvatar,
      username,
      roomId,
      eventId
    }: {
      roomName: string;
      roomAvatar?: string;
      username: string;
      roomId: string;
      eventId: string;
    }) => {
      notifyRef.current?.close();
      notifyRef.current = await sendSystemNotification({
        title: roomName,
        icon: roomAvatar,
        badge: roomAvatar,
        body: `New message from ${username}`,
        silent: true,
        onClick: () => {
          if (!window.closed) {
            window.focus();
            navigateRoom(roomId, eventId);
          }
          notifyRef.current = undefined;
        },
      });
    },
    [navigateRoom]
  );

  const playSound = useCallback(() => {
    const audioElement = audioRef.current;
    audioElement?.play();
  }, []);

  useEffect(() => {
    const handleTimelineEvent: RoomEventHandlerMap[RoomEvent.Timeline] = (
      mEvent,
      room,
      toStartOfTimeline,
      removed,
      data
    ) => {
      if (mx.getSyncState() !== 'SYNCING') return;
      if (document.hasFocus() && (selectedRoomId === room?.roomId || notificationSelected)) return;
      if (
        !room ||
        !data.liveEvent ||
        room.isSpaceRoom() ||
        !isNotificationEvent(mEvent) ||
        mEvent.threadRootId ||
        getNotificationType(mx, room.roomId) === NotificationType.Mute
      ) {
        return;
      }

      const sender = mEvent.getSender();
      const eventId = mEvent.getId();
      if (!sender || !eventId || mEvent.getSender() === mx.getUserId()) return;
      const unreadInfo = getUnreadInfo(room);
      const cachedUnreadInfo = unreadCacheRef.current.get(room.roomId);
      unreadCacheRef.current.set(room.roomId, unreadInfo);

      if (unreadInfo.total === 0) return;
      if (
        cachedUnreadInfo &&
        unreadEqual(unreadInfoToUnread(cachedUnreadInfo), unreadInfoToUnread(unreadInfo))
      ) {
        return;
      }

      if (showNotifications) {
        const avatarMxc =
          room.getAvatarFallbackMember()?.getMxcAvatarUrl() ?? room.getMxcAvatarUrl();
        notify({
          roomName: room.name ?? 'Unknown',
          roomAvatar: avatarMxc
            ? mxcUrlToHttp(mx, avatarMxc, useAuthentication, 96, 96, 'crop') ?? undefined
            : undefined,
          username: getMemberDisplayName(room, sender) ?? getMxIdLocalPart(sender) ?? sender,
          roomId: room.roomId,
          eventId,
        }).catch(() => {
          // Ignore transient notification send errors.
        });
      }

      if (notificationSound) {
        playSound();
      }
    };
    mx.on(RoomEvent.Timeline, handleTimelineEvent);
    return () => {
      mx.removeListener(RoomEvent.Timeline, handleTimelineEvent);
    };
  }, [
    mx,
    notificationSound,
    notificationSelected,
    showNotifications,
    playSound,
    notify,
    selectedRoomId,
    useAuthentication,
  ]);

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <audio ref={audioRef} style={{ display: 'none' }}>
      <source src={NotificationSound} type="audio/ogg" />
    </audio>
  );
}

type ClientNonUIFeaturesProps = {
  children: ReactNode;
};

function ClientToolSdkHandler() {
  const mx = useMatrixClient();

  // Track registered tools per webview label: Map<label, Map<toolName, { roomId, data }>>
  const registeredToolsRef = useRef<Map<string, Map<string, { roomId: string; data: unknown }>>>(new Map());

  useSdkMessageListener('client_tool_register', (payload: SdkMessagePayload) => {
    const { source, roomId, data } = payload;
    const toolName = (data as { name: string }).name;

    // Track the registered tool
    if (!registeredToolsRef.current.has(source)) {
      registeredToolsRef.current.set(source, new Map());
    }
    registeredToolsRef.current.get(source)?.set(toolName, { roomId, data });

    mx.sendEvent(roomId, 'vip.elevo.client_tool.register' as any, data)
      // eslint-disable-next-line no-console
      .catch(console.error);
  });

  useSdkMessageListener('client_tool_unregister', (payload: SdkMessagePayload) => {
    const { source, roomId, data } = payload;
    const toolName = (data as { name: string }).name;

    // Remove from tracking
    registeredToolsRef.current.get(source)?.delete(toolName);

    mx.sendEvent(roomId, 'vip.elevo.client_tool.unregister' as any, data)
      // eslint-disable-next-line no-console
      .catch(console.error);
  });

  useSdkMessageListener('client_tool_output', (payload: SdkMessagePayload) => {
    mx.sendEvent(payload.roomId, 'vip.elevo.client_tool.output' as any, payload.data)
      // eslint-disable-next-line no-console
      .catch(console.error);
  });

  // When a webview is closed, unregister all its tools
  useEffect(() => {
    if (!isDesktopTauri) return undefined;

    let cancelled = false;
    const unlistenPromise = listen<{ label: string }>('webview-closed', async (event) => {
      if (cancelled) return;
      const { label } = event.payload;
      const tools = registeredToolsRef.current.get(label);
      if (!tools) return;

      // Send unregister events for all tools, then clear tracking
      Array.from(tools.entries()).forEach(([toolName, { roomId }]) => {
        mx.sendEvent(roomId, 'vip.elevo.client_tool.unregister' as any, { name: toolName })
          // eslint-disable-next-line no-console
          .catch(console.error);
      });
      registeredToolsRef.current.delete(label);
    });

    return () => {
      cancelled = true;
      unlistenPromise.then((unlisten) => {
        if (cancelled) unlisten();
      });
    };
  }, [mx]);

  useEffect(() => {
    const handleTimelineEvent: EventTimelineSetHandlerMap[RoomEvent.Timeline] = (
      mEvent,
      eventRoom,
      _toStart,
      _removed,
      data
    ) => {
      if (!eventRoom?.roomId || !data.liveEvent) return;
      if (mEvent.getType() === 'vip.elevo.client_tool.execute') {
        const content = mEvent.getContent();

        // eslint-disable-next-line no-console
        console.log('[elevo] client_tool.execute event:', content);

        invoke('send_to_all_webviews', {
          roomId: eventRoom.roomId,
          channel: 'client_tool_execute',
          data: content,
        }).catch((err) => {
          // eslint-disable-next-line no-console
          console.error('Failed to send message to webview:', err);
        });
      }
    };

    mx.on(RoomEvent.Timeline, handleTimelineEvent);
    return () => {
      mx.removeListener(RoomEvent.Timeline, handleTimelineEvent);
    };
  }, [mx]);

  return null;
}

export function ClientNonUIFeatures({ children }: ClientNonUIFeaturesProps) {
  return (
    <>
      <SystemEmojiFeature />
      <PageZoomFeature />
      {/* <FaviconUpdater /> */}
      <InviteNotifications />
      <MessageNotifications />
      <ClientToolSdkHandler />
      {children}
    </>
  );
}
