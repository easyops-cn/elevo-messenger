import React, { MouseEventHandler, forwardRef, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Text,
  Overlay,
  OverlayCenter,
  OverlayBackdrop,
  IconButton,
  Icon,
  Icons,
  Tooltip,
  TooltipProvider,
  Menu,
  MenuItem,
  toRem,
  config,
  Line,
  PopOut,
  RectCords,
  Badge,
  Spinner,
} from 'folds';
import { useNavigate } from 'react-router-dom';
import { Room } from 'matrix-js-sdk';
import { useAtom } from 'jotai';
import { useStateEvent } from '../../hooks/useStateEvent';
import { PageHeader } from '../../components/page';
import { UseStateProvider } from '../../components/UseStateProvider';
import { RoomTopicViewer } from '../../components/room-topic-viewer';
import { StateEvent } from '../../../types/matrix/room';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useIsDirectRoom, useRoom } from '../../hooks/useRoom';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { useSpaceOptionally } from '../../hooks/useSpace';
import { getHomeSearchPath, withSearchParam } from '../../pages/pathUtils';
import { getCanonicalAliasOrRoomId, isRoomAlias } from '../../utils/matrix';
import { _SearchPathSearchParams } from '../../pages/paths';
import * as css from './RoomViewHeader.css';
import { useRoomUnread } from '../../state/hooks/unread';
import { usePowerLevelsContext } from '../../hooks/usePowerLevels';
import { markAsRead } from '../../utils/notifications';
import { roomToUnreadAtom } from '../../state/room/roomToUnread';
import { copyToClipboard } from '../../utils/dom';
import { LeaveRoomPrompt } from '../../components/leave-room-prompt';
import { useRoomName, useRoomTopic } from '../../hooks/useRoomMeta';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { stopPropagation } from '../../utils/keyboard';
import { getMatrixToRoom } from '../../plugins/matrix-to';
import { getViaServers } from '../../plugins/via-servers';
import { BackRouteHandler } from '../../components/BackRouteHandler';
import { useRoomPinnedEvents } from '../../hooks/useRoomPinnedEvents';
import { RoomPinMenu } from './room-pin-menu';
import { useOpenRoomSettings } from '../../state/hooks/roomSettings';
import { RoomNotificationModeSwitcher } from '../../components/RoomNotificationSwitcher';
import {
  getRoomNotificationMode,
  getRoomNotificationModeIcon,
  useRoomsNotificationPreferencesContext,
} from '../../hooks/useRoomsNotificationPreferences';
import { JumpToTime } from './jump-to-time';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { useRoomPermissions } from '../../hooks/useRoomPermissions';
import { InviteUserPrompt } from '../../components/invite-user-prompt';
import { ContainerColor } from '../../styles/ContainerColor.css';
import { RoomSettingsPage } from '../../state/roomSettings';
import { useElevoConfig } from '../../hooks/useElevoConfig';
import { ELEVO_WORKSPACES_STATE_KEY, WorkspaceItem } from './WorkspacesModal';
import { openWorkspacePanel, openTasksPanel, isDesktopTauri } from '../../plugins/useTauriOpener';
import { ListTodoIcon } from '../../icons/ListTodoIcon';
import { PanelLeftIcon } from '../../icons/PanelLeftIcon';
import { EllipsisVerticalIcon } from '../../icons/EllipsisVerticalIcon';
import { LayoutGridIcon } from '../../icons/LayoutGridIcon';
import { PinIcon } from '../../icons/PinIcon';
import { SearchIcon } from '../../icons/SearchIcon';
import { UsersIcon } from '../../icons/UsersIcon';
import { callChatAtom } from '../../state/callEmbed';

type RoomMenuProps = {
  room: Room;
  requestClose: () => void;
};
const RoomMenu = forwardRef<HTMLDivElement, RoomMenuProps>(({ room, requestClose }, ref) => {
  const mx = useMatrixClient();
  const { t } = useTranslation();
  const [hideActivity] = useSetting(settingsAtom, 'hideActivity');
  const unread = useRoomUnread(room.roomId, roomToUnreadAtom);
  const powerLevels = usePowerLevelsContext();
  const creators = useRoomCreators(room);

  const permissions = useRoomPermissions(creators, powerLevels);
  const canInvite = permissions.action('invite', mx.getSafeUserId());
  const notificationPreferences = useRoomsNotificationPreferencesContext();
  const notificationMode = getRoomNotificationMode(notificationPreferences, room.roomId);
  const { navigateRoom } = useRoomNavigate();

  const [invitePrompt, setInvitePrompt] = useState(false);

  const handleMarkAsRead = () => {
    markAsRead(mx, room.roomId, hideActivity);
    requestClose();
  };

  const handleInvite = () => {
    setInvitePrompt(true);
  };

  const handleCopyLink = () => {
    const roomIdOrAlias = getCanonicalAliasOrRoomId(mx, room.roomId);
    const viaServers = isRoomAlias(roomIdOrAlias) ? undefined : getViaServers(room);
    copyToClipboard(getMatrixToRoom(roomIdOrAlias, viaServers));
    requestClose();
  };

  const openSettings = useOpenRoomSettings();
  const parentSpace = useSpaceOptionally();
  const handleOpenSettings = () => {
    openSettings(room.roomId, parentSpace?.roomId);
    requestClose();
  };

  return (
    <Menu ref={ref} style={{ maxWidth: toRem(160), width: '100vw' }}>
      {invitePrompt && (
        <InviteUserPrompt
          room={room}
          requestClose={() => {
            setInvitePrompt(false);
            requestClose();
          }}
        />
      )}
      <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
        <MenuItem
          onClick={handleMarkAsRead}
          size="300"
          after={<Icon size="100" src={Icons.CheckTwice} />}
          radii="300"
          disabled={!unread}
        >
          <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
            {t('room.markAsRead')}
          </Text>
        </MenuItem>
        <RoomNotificationModeSwitcher roomId={room.roomId} value={notificationMode}>
          {(handleOpen, opened, changing) => (
            <MenuItem
              size="300"
              after={
                changing ? (
                  <Spinner size="100" variant="Secondary" />
                ) : (
                  <Icon size="100" src={getRoomNotificationModeIcon(notificationMode)} />
                )
              }
              radii="300"
              aria-pressed={opened}
              onClick={handleOpen}
            >
              <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
                {t('room.notifications')}
              </Text>
            </MenuItem>
          )}
        </RoomNotificationModeSwitcher>
      </Box>
      <Line variant="Surface" size="300" />
      <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
        <MenuItem
          onClick={handleInvite}
          variant="Primary"
          fill="None"
          size="300"
          after={<Icon size="100" src={Icons.UserPlus} />}
          radii="300"
          aria-pressed={invitePrompt}
          disabled={!canInvite}
        >
          <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
            {t('room.invite')}
          </Text>
        </MenuItem>
        <MenuItem
          onClick={handleCopyLink}
          size="300"
          after={<Icon size="100" src={Icons.Link} />}
          radii="300"
        >
          <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
            {t('room.copyLink')}
          </Text>
        </MenuItem>
        <MenuItem
          onClick={handleOpenSettings}
          size="300"
          after={<Icon size="100" src={Icons.Setting} />}
          radii="300"
        >
          <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
            {t('room.roomSettings')}
          </Text>
        </MenuItem>
        <UseStateProvider initial={false}>
          {(promptJump, setPromptJump) => (
            <>
              <MenuItem
                onClick={() => setPromptJump(true)}
                size="300"
                after={<Icon size="100" src={Icons.RecentClock} />}
                radii="300"
                aria-pressed={promptJump}
              >
                <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
                  {t('room.jumpToTime')}
                </Text>
              </MenuItem>
              {promptJump && (
                <JumpToTime
                  onSubmit={(eventId) => {
                    setPromptJump(false);
                    navigateRoom(room.roomId, eventId);
                    requestClose();
                  }}
                  onCancel={() => setPromptJump(false)}
                />
              )}
            </>
          )}
        </UseStateProvider>
      </Box>
      <Line variant="Surface" size="300" />
      <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
        <UseStateProvider initial={false}>
          {(promptLeave, setPromptLeave) => (
            <>
              <MenuItem
                onClick={() => setPromptLeave(true)}
                variant="Critical"
                fill="None"
                size="300"
                after={<Icon size="100" src={Icons.ArrowGoLeft} />}
                radii="300"
                aria-pressed={promptLeave}
              >
                <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
                  {t('room.leaveRoom')}
                </Text>
              </MenuItem>
              {promptLeave && (
                <LeaveRoomPrompt
                  roomId={room.roomId}
                  onDone={requestClose}
                  onCancel={() => setPromptLeave(false)}
                />
              )}
            </>
          )}
        </UseStateProvider>
      </Box>
    </Menu>
  );
});

export function RoomViewHeader({ callView }: { callView?: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const screenSize = useScreenSizeContext();
  const room = useRoom();
  const [menuAnchor, setMenuAnchor] = useState<RectCords>();
  const [pinMenuAnchor, setPinMenuAnchor] = useState<RectCords>();
  const elevoConfig = useElevoConfig();
  const direct = useIsDirectRoom();

  const workspacesStateEvent = useStateEvent(room, ELEVO_WORKSPACES_STATE_KEY as any);
  const linkedWorkspaces: WorkspaceItem[] =
    (workspacesStateEvent?.getContent() as { workspaces?: WorkspaceItem[] } | undefined)
      ?.workspaces ?? [];
  const linkedWorkspaceIds: string[] = linkedWorkspaces.map((w) => w.id);
  const workspaceExplorerUrl =
    elevoConfig.workspaces?.explorerUrl && linkedWorkspaceIds.length > 0
      ? `${elevoConfig.workspaces.explorerUrl}?ids=${linkedWorkspaceIds.join(',')}`
      : null;

  const firstWorkspace = linkedWorkspaces[0];
  const firstTenant = (elevoConfig.workspaces?.tenants ?? []).find(
    (tenant) => tenant.id === firstWorkspace?.owner_tenant_id
  );
  const tasksUrlTemplate = firstTenant
    ? isDesktopTauri
      ? firstTenant.tasks_template_url
      : firstTenant.tasks_web_template_url
    : null;
  const tasksUrl =
    tasksUrlTemplate && firstWorkspace
      ? tasksUrlTemplate.replace('{{source_path}}', firstWorkspace.source_path)
      : null;

  const pinnedEvents = useRoomPinnedEvents(room);
  const encryptionEvent = useStateEvent(room, StateEvent.RoomEncryption);
  const encryptedRoom = !!encryptionEvent;
  const name = useRoomName(room);
  const topic = useRoomTopic(room);

  const [peopleDrawer, setPeopleDrawer] = useSetting(settingsAtom, 'isPeopleDrawer');

  const [showCallChat, setShowCallChat] = useAtom(callChatAtom);

  const handleSearchClick = () => {
    const searchParams: _SearchPathSearchParams = {
      rooms: room.roomId,
    };
    const path = getHomeSearchPath();
    navigate(withSearchParam(path, searchParams));
  };

  const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setMenuAnchor(evt.currentTarget.getBoundingClientRect());
  };

  const handleOpenPinMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setPinMenuAnchor(evt.currentTarget.getBoundingClientRect());
  };

  const openSettings = useOpenRoomSettings();
  const parentSpace = useSpaceOptionally();
  const handleMemberToggle = () => {
    openSettings(room.roomId, parentSpace?.roomId, RoomSettingsPage.MembersPage);
  };
  const handlePanelToggle = () => {
    if (callView) {
      setShowCallChat((prev) => !prev);
      return;
    }
    setPeopleDrawer(!peopleDrawer);
  };

  return (
    <PageHeader
      className={ContainerColor({ variant: 'Surface' })}
      balance={screenSize === ScreenSize.Mobile}
    >
      <Box grow="Yes" gap="300">
        {screenSize === ScreenSize.Mobile && (
          <BackRouteHandler>
            {(onBack) => (
              <Box shrink="No" alignItems="Center">
                <IconButton size="300" fill="None" onClick={onBack}>
                  <Icon size="100" src={Icons.ArrowLeft} />
                </IconButton>
              </Box>
            )}
          </BackRouteHandler>
        )}
        <Box grow="Yes" alignItems="Center" gap="300">
          <Box direction="Column">
            <Text size="H5" truncate>
              {`${direct ? '' : '# '}${name}`}
            </Text>
            {topic && (
              <UseStateProvider initial={false}>
                {(viewTopic, setViewTopic) => (
                  <>
                    <Overlay open={viewTopic} backdrop={<OverlayBackdrop />}>
                      <OverlayCenter>
                        <FocusTrap
                          focusTrapOptions={{
                            initialFocus: false,
                            clickOutsideDeactivates: true,
                            onDeactivate: () => setViewTopic(false),
                            escapeDeactivates: stopPropagation,
                          }}
                        >
                          <RoomTopicViewer
                            name={name}
                            topic={topic}
                            requestClose={() => setViewTopic(false)}
                          />
                        </FocusTrap>
                      </OverlayCenter>
                    </Overlay>
                    <Text
                      as="button"
                      type="button"
                      onClick={() => setViewTopic(true)}
                      className={css.HeaderTopic}
                      size="T200"
                      priority="300"
                      truncate
                    >
                      {topic}
                    </Text>
                  </>
                )}
              </UseStateProvider>
            )}
          </Box>
        </Box>

        <Box shrink="No" gap="100" alignItems="Center">
          {!encryptedRoom && (
            <TooltipProvider
              position="Bottom"
              offset={4}
              tooltip={
                <Tooltip>
                  <Text>{t('common.search')}</Text>
                </Tooltip>
              }
            >
              {(triggerRef) => (
                <IconButton size="300" fill="None" ref={triggerRef} onClick={handleSearchClick}>
                  <Icon size="100" src={SearchIcon} />
                </IconButton>
              )}
            </TooltipProvider>
          )}
          <TooltipProvider
            position="Bottom"
            offset={4}
            tooltip={
              <Tooltip>
                <Text>{t('room.pinnedMessages')}</Text>
              </Tooltip>
            }
          >
            {(triggerRef) => (
              <IconButton
                size="300"
                fill="None"
                style={{ position: 'relative' }}
                onClick={handleOpenPinMenu}
                ref={triggerRef}
                aria-pressed={!!pinMenuAnchor}
              >
                {pinnedEvents.length > 0 && (
                  <Badge
                    style={{
                      position: 'absolute',
                      left: toRem(3),
                      top: toRem(3),
                    }}
                    variant="Secondary"
                    size="300"
                    fill="Solid"
                    radii="Pill"
                  >
                    <Text as="span" size="L400">
                      {pinnedEvents.length}
                    </Text>
                  </Badge>
                )}
                <Icon size="100" src={PinIcon} filled={!!pinMenuAnchor} />
              </IconButton>
            )}
          </TooltipProvider>
          <PopOut
            anchor={pinMenuAnchor}
            position="Bottom"
            content={
              <FocusTrap
                focusTrapOptions={{
                  initialFocus: false,
                  returnFocusOnDeactivate: false,
                  onDeactivate: () => setPinMenuAnchor(undefined),
                  clickOutsideDeactivates: true,
                  isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
                  isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
                  escapeDeactivates: stopPropagation,
                }}
              >
                <RoomPinMenu room={room} requestClose={() => setPinMenuAnchor(undefined)} />
              </FocusTrap>
            }
          />

          {tasksUrl && (
            <TooltipProvider
              position="Bottom"
              offset={4}
              tooltip={
                <Tooltip>
                  <Text>{t('room.tasks')}</Text>
                </Tooltip>
              }
            >
              {(triggerRef) => (
                <IconButton
                  size="300"
                  fill="None"
                  ref={triggerRef}
                  onClick={() => openTasksPanel(tasksUrl, room.roomId)}
                >
                  <Icon size="100" src={ListTodoIcon} />
                </IconButton>
              )}
            </TooltipProvider>
          )}

          {workspaceExplorerUrl && (
            <TooltipProvider
              position="Bottom"
              offset={4}
              tooltip={
                <Tooltip>
                  <Text>{t('room.workspaces')}</Text>
                </Tooltip>
              }
            >
              {(triggerRef) => (
                <IconButton
                  size="300"
                  fill="None"
                  ref={triggerRef}
                  onClick={() => openWorkspacePanel(workspaceExplorerUrl, room.roomId)}
                >
                  <Icon size="100" src={LayoutGridIcon} />
                </IconButton>
              )}
            </TooltipProvider>
          )}

          {callView && <TooltipProvider
            position="Bottom"
            offset={4}
            tooltip={
              <Tooltip>
                <Text>{t('common.members')}</Text>
              </Tooltip>
            }
          >
            {(triggerRef) => (
              <IconButton size="300" fill="None" ref={triggerRef} onClick={handleMemberToggle}>
                <Icon size="100" src={UsersIcon} />
              </IconButton>
            )}
          </TooltipProvider>}

          <TooltipProvider
            position="Bottom"
            align="End"
            offset={4}
            tooltip={
              <Tooltip>
                <Text>{t('room.moreOptions')}</Text>
              </Tooltip>
            }
          >
            {(triggerRef) => (
              <IconButton
                size="300"
                fill="None"
                onClick={handleOpenMenu}
                ref={triggerRef}
                aria-pressed={!!menuAnchor}
              >
                <Icon size="100" src={EllipsisVerticalIcon} filled={!!menuAnchor} />
              </IconButton>
            )}
          </TooltipProvider>
          <PopOut
            anchor={menuAnchor}
            position="Bottom"
            align="End"
            content={
              <FocusTrap
                focusTrapOptions={{
                  initialFocus: false,
                  returnFocusOnDeactivate: false,
                  onDeactivate: () => setMenuAnchor(undefined),
                  clickOutsideDeactivates: true,
                  isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
                  isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
                  escapeDeactivates: stopPropagation,
                }}
              >
                <RoomMenu room={room} requestClose={() => setMenuAnchor(undefined)} />
              </FocusTrap>
            }
          />

          {screenSize === ScreenSize.Desktop && (
            <>
              <Line direction="Vertical" size="300" style={{
                height: toRem(16),
                margin: `0 ${toRem(6)}`,
              }} />
              <TooltipProvider
                position="Bottom"
                offset={4}
                tooltip={
                  <Tooltip>
                    {callView ? (
                      <Text>{showCallChat ? 'Close Chat' : 'Open Chat'}</Text>
                    ) : (
                      <Text>{peopleDrawer ? t('room.hideSidePanel') : t('room.showSidePanel')}</Text>
                    )}
                  </Tooltip>
                }
              >
                {(triggerRef) => (
                  <IconButton size="300" fill="None" ref={triggerRef} onClick={handlePanelToggle}>
                    <Icon size="100" src={PanelLeftIcon} />
                  </IconButton>
                )}
              </TooltipProvider>
            </>
          )}
        </Box>
      </Box>
    </PageHeader>
  );
}
