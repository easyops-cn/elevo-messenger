import {
  Box,
  Button,
  Dialog,
  Header,
  Icon,
  IconButton,
  Icons,
  Input,
  Line,
  Menu,
  MenuItem,
  Modal,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  PopOut,
  RectCords,
  Spinner,
  Text,
  as,
  color,
  config,
  toRem,
} from 'folds';
import React, {
  FormEventHandler,
  MouseEventHandler,
  ReactNode,
  useCallback,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import FocusTrap from 'focus-trap-react';
import { useHover, useFocusWithin } from 'react-aria';
import { MatrixEvent, Room } from 'matrix-js-sdk';
import { Relations } from 'matrix-js-sdk/lib/models/relations';
import classNames from 'classnames';
import { RoomPinnedEventsEventContent } from 'matrix-js-sdk/lib/types';
import {
  AvatarBase,
  BubbleLayout,
  CompactLayout,
  MessageBase,
  ModernLayout,
  Time,
  Username,
} from '../../../components/message';
import {
  canEditEvent,
  getEventEdits,
  getMemberAvatarMxc,
  getMemberDisplayName,
} from '../../../utils/room';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../../utils/matrix';
import { MessageLayout, MessageSpacing } from '../../../state/settings';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useRecentEmoji } from '../../../hooks/useRecentEmoji';
import * as css from './styles.css';
import * as layoutCss from '../../../components/message/layout/layout.css';
import { EventReaders } from '../../../components/event-readers';
import { TextViewer } from '../../../components/text-viewer';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { EmojiBoard } from '../../../components/emoji-board';
import { ReactionViewer } from '../reaction-viewer';
import { MessageEditor } from './MessageEditor';
import { UserAvatar } from '../../../components/user-avatar';
import { copyToClipboard } from '../../../utils/dom';
import { stopPropagation } from '../../../utils/keyboard';
import { getMatrixToRoomEvent } from '../../../plugins/matrix-to';
import { getViaServers } from '../../../plugins/via-servers';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { useRoomPinnedEvents } from '../../../hooks/useRoomPinnedEvents';
import { StateEvent } from '../../../../types/matrix/room';
import { Avatar } from '../../../components/avatar';
import { EllipsisVerticalIcon } from '../../../icons/EllipsisVerticalIcon';
import { SmilePlusIcon } from '../../../icons/SmilePlusIcon';
import { ReplyIcon } from '../../../icons/ReplyIcon';
import { PencilIcon } from '../../../icons/PencilIcon';
import { MessageSquarePlusIcon } from '../../../icons/MessageSquarePlusIcon';
import { CheckCheckIcon } from '../../../icons/CheckCheckIcon';
import { LinkIcon } from '../../../icons/LinkIcon';
import { PinIcon } from '../../../icons/PinIcon';
import { Trash2Icon } from '../../../icons/Trash2Icon';
import { UserIcon } from '../../../icons/UserIcon';
import { SmileIcon } from '../../../icons/SmileIcon';
import { CircleAlertIcon } from '../../../icons/CircleAlertIcon';
import { CodeIcon } from '../../../icons/CodeIcon';

export type ReactionHandler = (keyOrMxc: string, shortcode: string) => void;

type MessageQuickReactionsProps = {
  onReaction: ReactionHandler;
};
export const MessageQuickReactions = as<'div', MessageQuickReactionsProps>(
  ({ onReaction, ...props }, ref) => {
    const mx = useMatrixClient();
    const recentEmojis = useRecentEmoji(mx, 4);

    if (recentEmojis.length === 0) return <span />;
    return (
      <>
        <Box
          style={{ padding: config.space.S200 }}
          alignItems="Center"
          justifyContent="Center"
          gap="200"
          {...props}
          ref={ref}
        >
          {recentEmojis.map((emoji) => (
            <IconButton
              key={emoji.unicode}
              className={css.MessageQuickReaction}
              size="300"
              variant="SurfaceVariant"
              radii="Pill"
              title={emoji.shortcode}
              aria-label={emoji.shortcode}
              onClick={() => onReaction(emoji.unicode, emoji.shortcode)}
            >
              <Text size="T500">{emoji.unicode}</Text>
            </IconButton>
          ))}
        </Box>
        <Line size="300" />
      </>
    );
  }
);

export const MessageAllReactionItem = as<
  'button',
  {
    room: Room;
    relations: Relations;
    onClose?: () => void;
  }
>(({ room, relations, onClose, ...props }, ref) => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  return (
    <>
      <Overlay
        onContextMenu={(evt: any) => {
          evt.stopPropagation();
        }}
        open={open}
        backdrop={<OverlayBackdrop />}
      >
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              returnFocusOnDeactivate: false,
              onDeactivate: () => handleClose(),
              clickOutsideDeactivates: true,
              escapeDeactivates: stopPropagation,
            }}
          >
            <Modal variant="Surface" size="300">
              <ReactionViewer
                room={room}
                relations={relations}
                requestClose={() => setOpen(false)}
              />
            </Modal>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
      <MenuItem
        size="300"
        after={<Icon size="100" src={SmileIcon} />}
        radii="300"
        onClick={() => setOpen(true)}
        {...props}
        ref={ref}
        aria-pressed={open}
      >
        <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
          {t('message.viewReactions')}
        </Text>
      </MenuItem>
    </>
  );
});

export const MessageReadReceiptItem = as<
  'button',
  {
    room: Room;
    eventId: string;
    onClose?: () => void;
  }
>(({ room, eventId, onClose, ...props }, ref) => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  return (
    <>
      <Overlay open={open} backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: handleClose,
              clickOutsideDeactivates: true,
              escapeDeactivates: stopPropagation,
            }}
          >
            <Modal variant="Surface" size="300">
              <EventReaders room={room} eventId={eventId} requestClose={handleClose} />
            </Modal>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
      <MenuItem
        size="300"
        after={<Icon size="100" src={CheckCheckIcon} />}
        radii="300"
        onClick={() => setOpen(true)}
        {...props}
        ref={ref}
        aria-pressed={open}
      >
        <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
          {t('message.readReceipts')}
        </Text>
      </MenuItem>
    </>
  );
});

export const MessageSourceCodeItem = as<
  'button',
  {
    room: Room;
    mEvent: MatrixEvent;
    onClose?: () => void;
  }
>(({ room, mEvent, onClose, ...props }, ref) => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const getContent = (evt: MatrixEvent) =>
    evt.isEncrypted()
      ? {
          [`<== DECRYPTED_EVENT ==>`]: evt.getEffectiveEvent(),
          [`<== ORIGINAL_EVENT ==>`]: evt.event,
        }
      : evt.event;

  const getText = (): string => {
    const evtId = mEvent.getId()!;
    const evtTimeline = room.getTimelineForEvent(evtId);
    const edits =
      evtTimeline &&
      getEventEdits(evtTimeline.getTimelineSet(), evtId, mEvent.getType())?.getRelations();

    if (!edits) return JSON.stringify(getContent(mEvent), null, 2);

    const content: Record<string, unknown> = {
      '<== MAIN_EVENT ==>': getContent(mEvent),
    };

    edits.forEach((editEvt, index) => {
      content[`<== REPLACEMENT_EVENT_${index + 1} ==>`] = getContent(editEvt);
    });

    return JSON.stringify(content, null, 2);
  };

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  return (
    <>
      <Overlay open={open} backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: handleClose,
              clickOutsideDeactivates: true,
              escapeDeactivates: stopPropagation,
            }}
          >
            <Modal variant="Surface" size="500">
              <TextViewer
                name={t('message.sourceCode')}
                langName="json"
                text={getText()}
                requestClose={handleClose}
              />
            </Modal>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
      <MenuItem
        size="300"
        after={<Icon size="100" src={CodeIcon} />}
        radii="300"
        onClick={() => setOpen(true)}
        {...props}
        ref={ref}
        aria-pressed={open}
      >
        <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
          {t('message.viewSource')}
        </Text>
      </MenuItem>
    </>
  );
});

export const MessageCopyLinkItem = as<
  'button',
  {
    room: Room;
    mEvent: MatrixEvent;
    onClose?: () => void;
  }
>(({ room, mEvent, onClose, ...props }, ref) => {
  const { t } = useTranslation();

  const handleCopy = () => {
    const eventId = mEvent.getId();
    if (!eventId) return;
    copyToClipboard(getMatrixToRoomEvent(room.roomId, eventId, getViaServers(room)));
    onClose?.();
  };

  return (
    <MenuItem
      size="300"
      after={<Icon size="100" src={LinkIcon} />}
      radii="300"
      onClick={handleCopy}
      {...props}
      ref={ref}
    >
      <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
        {t('message.copyLink')}
      </Text>
    </MenuItem>
  );
});

export const MessagePinItem = as<
  'button',
  {
    room: Room;
    mEvent: MatrixEvent;
    onClose?: () => void;
  }
>(({ room, mEvent, onClose, ...props }, ref) => {
  const mx = useMatrixClient();
  const { t } = useTranslation();
  const pinnedEvents = useRoomPinnedEvents(room);
  const isPinned = pinnedEvents.includes(mEvent.getId() ?? '');

  const handlePin = () => {
    const eventId = mEvent.getId();
    const pinContent: RoomPinnedEventsEventContent = {
      pinned: Array.from(pinnedEvents).filter((id) => id !== eventId),
    };
    if (!isPinned && eventId) {
      pinContent.pinned.push(eventId);
    }
    mx.sendStateEvent(room.roomId, StateEvent.RoomPinnedEvents as any, pinContent);
    onClose?.();
  };

  return (
    <MenuItem
      size="300"
      after={<Icon size="100" src={PinIcon} />}
      radii="300"
      onClick={handlePin}
      {...props}
      ref={ref}
    >
      <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
        {isPinned ? t('message.unpinMessage') : t('message.pinMessage')}
      </Text>
    </MenuItem>
  );
});

export const MessageDeleteItem = as<
  'button',
  {
    room: Room;
    mEvent: MatrixEvent;
    onClose?: () => void;
  }
>(({ room, mEvent, onClose, ...props }, ref) => {
  const mx = useMatrixClient();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const [deleteState, deleteMessage] = useAsyncCallback(
    useCallback(
      (eventId: string, reason?: string) =>
        mx.redactEvent(room.roomId, eventId, undefined, reason ? { reason } : undefined),
      [mx, room]
    )
  );

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    const eventId = mEvent.getId();
    if (
      !eventId ||
      deleteState.status === AsyncStatus.Loading ||
      deleteState.status === AsyncStatus.Success
    )
      return;
    const target = evt.target as HTMLFormElement | undefined;
    const reasonInput = target?.reasonInput as HTMLInputElement | undefined;
    const reason = reasonInput && reasonInput.value.trim();
    deleteMessage(eventId, reason);
  };

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  return (
    <>
      <Overlay open={open} backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: handleClose,
              clickOutsideDeactivates: true,
              escapeDeactivates: stopPropagation,
            }}
          >
            <Dialog variant="Surface">
              <Header
                style={{
                  padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                  borderBottomWidth: config.borderWidth.B300,
                }}
                variant="Surface"
                size="500"
              >
                <Box grow="Yes">
                  <Text size="H4">{t('message.deleteMessage')}</Text>
                </Box>
                <IconButton size="300" onClick={handleClose} radii="300">
                  <Icon src={Icons.Cross} />
                </IconButton>
              </Header>
              <Box
                as="form"
                onSubmit={handleSubmit}
                style={{ padding: config.space.S400 }}
                direction="Column"
                gap="400"
              >
                <Text priority="400">
                  {t('message.deleteMessageConfirm')}
                </Text>
                <Box direction="Column" gap="100">
                  <Text size="L400">
                    {t('message.reason')}{' '}
                    <Text as="span" size="T200">
                      ({t('message.optional')})
                    </Text>
                  </Text>
                  <Input name="reasonInput" variant="Background" />
                  {deleteState.status === AsyncStatus.Error && (
                    <Text style={{ color: color.Critical.Main }} size="T300">
                      {t('message.failedDelete')}
                    </Text>
                  )}
                </Box>
                <Button
                  type="submit"
                  variant="Critical"
                  before={
                    deleteState.status === AsyncStatus.Loading ? (
                      <Spinner fill="Solid" variant="Critical" size="200" />
                    ) : undefined
                  }
                  aria-disabled={deleteState.status === AsyncStatus.Loading}
                >
                  <Text size="B400">
                    {deleteState.status === AsyncStatus.Loading ? t('message.deleting') : t('message.delete')}
                  </Text>
                </Button>
              </Box>
            </Dialog>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
      <Button
        variant="Critical"
        fill="None"
        size="300"
        after={<Icon size="100" src={Trash2Icon} />}
        radii="300"
        onClick={() => setOpen(true)}
        aria-pressed={open}
        {...props}
        ref={ref}
      >
        <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
          {t('message.delete')}
        </Text>
      </Button>
    </>
  );
});

export const MessageReportItem = as<
  'button',
  {
    room: Room;
    mEvent: MatrixEvent;
    onClose?: () => void;
  }
>(({ room, mEvent, onClose, ...props }, ref) => {
  const mx = useMatrixClient();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const [reportState, reportMessage] = useAsyncCallback(
    useCallback(
      (eventId: string, score: number, reason: string) =>
        mx.reportEvent(room.roomId, eventId, score, reason),
      [mx, room]
    )
  );

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    const eventId = mEvent.getId();
    if (
      !eventId ||
      reportState.status === AsyncStatus.Loading ||
      reportState.status === AsyncStatus.Success
    )
      return;
    const target = evt.target as HTMLFormElement | undefined;
    const reasonInput = target?.reasonInput as HTMLInputElement | undefined;
    const reason = reasonInput && reasonInput.value.trim();
    if (reasonInput) reasonInput.value = '';
    reportMessage(eventId, reason ? -100 : -50, reason || t('message.noReason'));
  };

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  return (
    <>
      <Overlay open={open} backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: handleClose,
              clickOutsideDeactivates: true,
              escapeDeactivates: stopPropagation,
            }}
          >
            <Dialog variant="Surface">
              <Header
                style={{
                  padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                  borderBottomWidth: config.borderWidth.B300,
                }}
                variant="Surface"
                size="500"
              >
                <Box grow="Yes">
                  <Text size="H4">{t('message.reportMessage')}</Text>
                </Box>
                <IconButton size="300" onClick={handleClose} radii="300">
                  <Icon src={Icons.Cross} />
                </IconButton>
              </Header>
              <Box
                as="form"
                onSubmit={handleSubmit}
                style={{ padding: config.space.S400 }}
                direction="Column"
                gap="400"
              >
                <Text priority="400">
                  {t('message.reportMessageDesc')}
                </Text>
                <Box direction="Column" gap="100">
                  <Text size="L400">{t('message.reason')}</Text>
                  <Input name="reasonInput" variant="Background" required />
                  {reportState.status === AsyncStatus.Error && (
                    <Text style={{ color: color.Critical.Main }} size="T300">
                      {t('message.failedReport')}
                    </Text>
                  )}
                  {reportState.status === AsyncStatus.Success && (
                    <Text style={{ color: color.Success.Main }} size="T300">
                      {t('message.reportedMessage')}
                    </Text>
                  )}
                </Box>
                <Button
                  type="submit"
                  variant="Critical"
                  before={
                    reportState.status === AsyncStatus.Loading ? (
                      <Spinner fill="Solid" variant="Critical" size="200" />
                    ) : undefined
                  }
                  aria-disabled={
                    reportState.status === AsyncStatus.Loading ||
                    reportState.status === AsyncStatus.Success
                  }
                >
                  <Text size="B400">
                    {reportState.status === AsyncStatus.Loading ? t('message.reporting') : t('message.report')}
                  </Text>
                </Button>
              </Box>
            </Dialog>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
      <Button
        variant="Critical"
        fill="None"
        size="300"
        after={<Icon size="100" src={CircleAlertIcon} />}
        radii="300"
        onClick={() => setOpen(true)}
        aria-pressed={open}
        {...props}
        ref={ref}
      >
        <Text className={css.MessageMenuItemText} as="span" size="T300" truncate>
          {t('message.report')}
        </Text>
      </Button>
    </>
  );
});

export type MessageProps = {
  room: Room;
  mEvent: MatrixEvent;
  collapse: boolean;
  highlight: boolean;
  edit?: boolean;
  canDelete?: boolean;
  canSendReaction?: boolean;
  canPinEvent?: boolean;
  imagePackRooms?: Room[];
  relations?: Relations;
  messageLayout: MessageLayout;
  messageSpacing: MessageSpacing;
  onUserClick: MouseEventHandler<HTMLButtonElement>;
  onUsernameClick: MouseEventHandler<HTMLButtonElement>;
  onReplyClick: (
    ev: Parameters<MouseEventHandler<HTMLButtonElement>>[0],
    startThread?: boolean
  ) => void;
  onEditId?: (eventId?: string) => void;
  onReactionToggle: (targetEventId: string, key: string, shortcode?: string) => void;
  reply?: ReactNode;
  reactions?: ReactNode;
  hideReadReceipts?: boolean;
  showDeveloperTools?: boolean;
  hour24Clock: boolean;
  dateFormatString: string;
};
export const Message = as<'div', MessageProps>(
  (
    {
      className,
      room,
      mEvent,
      collapse,
      highlight,
      edit,
      canDelete,
      canSendReaction,
      canPinEvent,
      imagePackRooms,
      relations,
      messageLayout,
      messageSpacing,
      onUserClick,
      onUsernameClick,
      onReplyClick,
      onReactionToggle,
      onEditId,
      reply,
      reactions,
      hideReadReceipts,
      showDeveloperTools,
      hour24Clock,
      dateFormatString,
      children,
      ...props
    },
    ref
  ) => {
    const mx = useMatrixClient();
    const { t } = useTranslation();
    const useAuthentication = useMediaAuthentication();
    const senderId = mEvent.getSender() ?? '';
    const isOwn = senderId === mx.getUserId();

    const [hover, setHover] = useState(false);
    const { hoverProps } = useHover({ onHoverChange: setHover });
    const { focusWithinProps } = useFocusWithin({ onFocusWithinChange: setHover });
    const [menuAnchor, setMenuAnchor] = useState<RectCords>();
    const [emojiBoardAnchor, setEmojiBoardAnchor] = useState<RectCords>();

    const senderDisplayName =
      getMemberDisplayName(room, senderId) ?? getMxIdLocalPart(senderId) ?? senderId;
    const senderAvatarMxc = getMemberAvatarMxc(room, senderId);

    const headerJSX = !collapse && (
      <Box
        gap="300"
        direction={messageLayout === MessageLayout.Compact || isOwn ? 'RowReverse' : 'Row'}
        justifyContent={messageLayout === MessageLayout.Compact ? 'SpaceBetween' : 'Start'}
        alignItems={messageLayout !== MessageLayout.Compact ? "Center" : "Baseline"}
        grow="No"
        style={messageLayout !== MessageLayout.Compact ? {
          height: toRem(32),
        } : undefined}
      >
        <Box alignItems="Center" gap="200">
          <Username
            as="button"
            variant="Secondary"
            data-user-id={senderId}
            onContextMenu={onUserClick}
            onClick={onUsernameClick}
          >
            <Text
              as="span"
              size="T300"
              truncate
            >
              {senderDisplayName}
            </Text>
          </Username>
        </Box>
        {(messageLayout === MessageLayout.Compact || hover) && (
          <Time
            ts={mEvent.getTs()}
            compact
            hour24Clock={hour24Clock}
            dateFormatString={dateFormatString}
          />
        )}
      </Box>
    );

    const avatarJSX = !collapse && messageLayout !== MessageLayout.Compact && (
      <AvatarBase
        className={messageLayout === MessageLayout.Bubble ? css.BubbleAvatarBase : undefined}
      >
        <Avatar
          className={css.MessageAvatar}
          as="button"
          size="300"
          radii="Pill"
          data-user-id={senderId}
          onClick={onUserClick}
        >
          <UserAvatar
            userId={senderId}
            src={
              senderAvatarMxc
                ? mxcUrlToHttp(mx, senderAvatarMxc, useAuthentication, 48, 48, 'crop') ?? undefined
                : undefined
            }
            alt={senderDisplayName}
            renderFallback={() => <Icon size="200" src={UserIcon} filled />}
          />
        </Avatar>
      </AvatarBase>
    );

    const msgContentJSX = (
      <Box
        direction="Column"
        alignSelf={isOwn && messageLayout !== MessageLayout.Compact ? 'End' : 'Start'}
        style={{ maxWidth: '100%' }}
      >
        {reply}
        {edit && onEditId ? (
          <MessageEditor
            style={{
              maxWidth: '100%',
              width: '100vw',
            }}
            roomId={room.roomId}
            room={room}
            mEvent={mEvent}
            imagePackRooms={imagePackRooms}
            onCancel={() => onEditId()}
          />
        ) : (
          children
        )}
        {reactions}
      </Box>
    );

    const msgBubbleContentJSX = (
      <Box
        direction="Column"
        className={
          isOwn && messageLayout === MessageLayout.Modern ? layoutCss.ModernOwnContent : undefined
        }
        style={{ maxWidth: '100%' }}
      >
        {edit && onEditId ? (
          <MessageEditor
            style={{
              maxWidth: '100%',
              width: '100vw',
            }}
            roomId={room.roomId}
            room={room}
            mEvent={mEvent}
            imagePackRooms={imagePackRooms}
            onCancel={() => onEditId()}
          />
        ) : (
          children
        )}
      </Box>
    );

    const handleContextMenu: MouseEventHandler<HTMLDivElement> = (evt) => {
      if (evt.altKey || !window.getSelection()?.isCollapsed || edit) return;
      const tag = (evt.target as any).tagName;
      if (typeof tag === 'string' && tag.toLowerCase() === 'a') return;
      evt.preventDefault();
      setMenuAnchor({
        x: evt.clientX,
        y: evt.clientY,
        width: 0,
        height: 0,
      });
    };

    const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
      const target = evt.currentTarget.parentElement?.parentElement ?? evt.currentTarget;
      setMenuAnchor(target.getBoundingClientRect());
    };

    const closeMenu = () => {
      setMenuAnchor(undefined);
    };

    const handleOpenEmojiBoard: MouseEventHandler<HTMLButtonElement> = (evt) => {
      const target = evt.currentTarget.parentElement?.parentElement ?? evt.currentTarget;
      setEmojiBoardAnchor(target.getBoundingClientRect());
    };
    const handleAddReactions: MouseEventHandler<HTMLButtonElement> = () => {
      const rect = menuAnchor;
      closeMenu();
      // open it with timeout because closeMenu
      // FocusTrap will return focus from emojiBoard

      setTimeout(() => {
        setEmojiBoardAnchor(rect);
      }, 100);
    };

    const isThreadedMessage = mEvent.threadRootId !== undefined;

    return (
      <MessageBase
        className={classNames(css.MessageBase, className, {
          [css.MessageBaseBubbleCollapsed]: messageLayout === MessageLayout.Bubble && collapse,
          [css.MessageBaseNonCompact({ isOwn })]: messageLayout !== MessageLayout.Compact,
        })}
        tabIndex={0}
        space={messageSpacing}
        collapse={collapse}
        highlight={highlight}
        selected={!!menuAnchor || !!emojiBoardAnchor}
        own={messageLayout === MessageLayout.Compact ? false : isOwn}
        onContextMenu={handleContextMenu}
        {...props}
        {...hoverProps}
        {...focusWithinProps}
        ref={ref}
      >
        {!edit && (hover || !!menuAnchor || !!emojiBoardAnchor) && (
          <div className={css.MessageOptionsBase} onContextMenu={(e) => e.stopPropagation()}>
            <Menu className={css.MessageOptionsBar} variant="SurfaceVariant">
              <Box gap="100">
                {canSendReaction && (
                  <PopOut
                    position="Bottom"
                    align={emojiBoardAnchor?.width === 0 ? 'Start' : 'End'}
                    offset={emojiBoardAnchor?.width === 0 ? 0 : undefined}
                    anchor={emojiBoardAnchor}
                    content={
                      <EmojiBoard
                        imagePackRooms={imagePackRooms ?? []}
                        returnFocusOnDeactivate={false}
                        allowTextCustomEmoji
                        onEmojiSelect={(key) => {
                          onReactionToggle(mEvent.getId()!, key);
                          setEmojiBoardAnchor(undefined);
                        }}
                        onCustomEmojiSelect={(mxc, shortcode) => {
                          onReactionToggle(mEvent.getId()!, mxc, shortcode);
                          setEmojiBoardAnchor(undefined);
                        }}
                        requestClose={() => {
                          setEmojiBoardAnchor(undefined);
                        }}
                      />
                    }
                  >
                    <IconButton
                      onClick={handleOpenEmojiBoard}
                      variant="SurfaceVariant"
                      size="300"
                      radii="300"
                      aria-pressed={!!emojiBoardAnchor}
                    >
                      <Icon src={SmilePlusIcon} size="100" />
                    </IconButton>
                  </PopOut>
                )}
                <IconButton
                  onClick={onReplyClick}
                  data-event-id={mEvent.getId()}
                  variant="SurfaceVariant"
                  size="300"
                  radii="300"
                >
                  <Icon src={ReplyIcon} size="100" />
                </IconButton>
                {!isThreadedMessage && (
                  <IconButton
                    onClick={(ev) => onReplyClick(ev, true)}
                    data-event-id={mEvent.getId()}
                    variant="SurfaceVariant"
                    size="300"
                    radii="300"
                  >
                    <Icon src={MessageSquarePlusIcon} size="100" />
                  </IconButton>
                )}
                {canEditEvent(mx, mEvent) && onEditId && (
                  <IconButton
                    onClick={() => onEditId(mEvent.getId())}
                    variant="SurfaceVariant"
                    size="300"
                    radii="300"
                  >
                    <Icon src={PencilIcon} size="100" />
                  </IconButton>
                )}
                <PopOut
                  anchor={menuAnchor}
                  position="Bottom"
                  align={menuAnchor?.width === 0 ? 'Start' : 'End'}
                  offset={menuAnchor?.width === 0 ? 0 : undefined}
                  content={
                    <FocusTrap
                      focusTrapOptions={{
                        initialFocus: false,
                        onDeactivate: () => setMenuAnchor(undefined),
                        clickOutsideDeactivates: true,
                        isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
                        isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
                        escapeDeactivates: stopPropagation,
                      }}
                    >
                      <Menu>
                        {canSendReaction && (
                          <MessageQuickReactions
                            onReaction={(key, shortcode) => {
                              onReactionToggle(mEvent.getId()!, key, shortcode);
                              closeMenu();
                            }}
                          />
                        )}
                        <Box direction="Column" gap="100" className={css.MessageMenuGroup}>
                          {canSendReaction && (
                            <MenuItem
                              size="300"
                              after={<Icon size="100" src={SmilePlusIcon} />}
                              radii="300"
                              onClick={handleAddReactions}
                            >
                              <Text
                                className={css.MessageMenuItemText}
                                as="span"
                                size="T300"
                                truncate
                              >
                                {t('message.addReaction')}
                              </Text>
                            </MenuItem>
                          )}
                          {relations && (
                            <MessageAllReactionItem
                              room={room}
                              relations={relations}
                              onClose={closeMenu}
                            />
                          )}
                          <MenuItem
                            size="300"
                            after={<Icon size="100" src={ReplyIcon} />}
                            radii="300"
                            data-event-id={mEvent.getId()}
                            onClick={(evt: any) => {
                              onReplyClick(evt);
                              closeMenu();
                            }}
                          >
                            <Text
                              className={css.MessageMenuItemText}
                              as="span"
                              size="T300"
                              truncate
                            >
                              {t('common.reply')}
                            </Text>
                          </MenuItem>
                          {!isThreadedMessage && (
                            <MenuItem
                              size="300"
                              after={<Icon src={MessageSquarePlusIcon} size="100" />}
                              radii="300"
                              data-event-id={mEvent.getId()}
                              onClick={(evt: any) => {
                                onReplyClick(evt, true);
                                closeMenu();
                              }}
                            >
                              <Text
                                className={css.MessageMenuItemText}
                                as="span"
                                size="T300"
                                truncate
                              >
                                {t('message.replyInThread')}
                              </Text>
                            </MenuItem>
                          )}
                          {canEditEvent(mx, mEvent) && onEditId && (
                            <MenuItem
                              size="300"
                              after={<Icon size="100" src={PencilIcon} />}
                              radii="300"
                              data-event-id={mEvent.getId()}
                              onClick={() => {
                                onEditId(mEvent.getId());
                                closeMenu();
                              }}
                            >
                              <Text
                                className={css.MessageMenuItemText}
                                as="span"
                                size="T300"
                                truncate
                              >
                                {t('message.editMessage')}
                              </Text>
                            </MenuItem>
                          )}
                          {!hideReadReceipts && (
                            <MessageReadReceiptItem
                              room={room}
                              eventId={mEvent.getId() ?? ''}
                              onClose={closeMenu}
                            />
                          )}
                          {showDeveloperTools && (
                            <MessageSourceCodeItem
                              room={room}
                              mEvent={mEvent}
                              onClose={closeMenu}
                            />
                          )}
                          <MessageCopyLinkItem room={room} mEvent={mEvent} onClose={closeMenu} />
                          {canPinEvent && (
                            <MessagePinItem room={room} mEvent={mEvent} onClose={closeMenu} />
                          )}
                        </Box>
                        {((!mEvent.isRedacted() && canDelete) ||
                          mEvent.getSender() !== mx.getUserId()) && (
                          <>
                            <Line size="300" />
                            <Box direction="Column" gap="100" className={css.MessageMenuGroup}>
                              {!mEvent.isRedacted() && canDelete && (
                                <MessageDeleteItem
                                  room={room}
                                  mEvent={mEvent}
                                  onClose={closeMenu}
                                />
                              )}
                              {mEvent.getSender() !== mx.getUserId() && (
                                <MessageReportItem
                                  room={room}
                                  mEvent={mEvent}
                                  onClose={closeMenu}
                                />
                              )}
                            </Box>
                          </>
                        )}
                      </Menu>
                    </FocusTrap>
                  }
                >
                  <IconButton
                    variant="SurfaceVariant"
                    size="300"
                    radii="300"
                    onClick={handleOpenMenu}
                    aria-pressed={!!menuAnchor}
                  >
                    <Icon src={EllipsisVerticalIcon} size="100" />
                  </IconButton>
                </PopOut>
              </Box>
            </Menu>
          </div>
        )}
        {messageLayout === MessageLayout.Compact && (
          <CompactLayout before={headerJSX}>
            {msgContentJSX}
          </CompactLayout>
        )}
        {messageLayout === MessageLayout.Bubble && (
          <BubbleLayout
            isOwn={isOwn}
            before={avatarJSX}
            header={headerJSX}
            beforeContent={reply}
            afterContent={reactions}
          >
            {msgBubbleContentJSX}
          </BubbleLayout>
        )}
        {messageLayout !== MessageLayout.Compact && messageLayout !== MessageLayout.Bubble && (
          <ModernLayout
            isOwn={isOwn}
            before={avatarJSX}
            header={headerJSX}
            beforeContent={reply}
            afterContent={reactions}
          >
            {msgBubbleContentJSX}
          </ModernLayout>
        )}
      </MessageBase>
    );
  }
);

export type EventProps = {
  room: Room;
  mEvent: MatrixEvent;
  highlight: boolean;
  canDelete?: boolean;
  messageSpacing: MessageSpacing;
  hideReadReceipts?: boolean;
  showDeveloperTools?: boolean;
};
export const Event = as<'div', EventProps>(
  (
    {
      className,
      room,
      mEvent,
      highlight,
      canDelete,
      messageSpacing,
      hideReadReceipts,
      showDeveloperTools,
      children,
      ...props
    },
    ref
  ) => {
    const mx = useMatrixClient();
    const [hover, setHover] = useState(false);
    const { hoverProps } = useHover({ onHoverChange: setHover });
    const { focusWithinProps } = useFocusWithin({ onFocusWithinChange: setHover });
    const [menuAnchor, setMenuAnchor] = useState<RectCords>();
    const stateEvent = typeof mEvent.getStateKey() === 'string';

    const handleContextMenu: MouseEventHandler<HTMLDivElement> = (evt) => {
      if (evt.altKey || !window.getSelection()?.isCollapsed) return;
      const tag = (evt.target as any).tagName;
      if (typeof tag === 'string' && tag.toLowerCase() === 'a') return;
      evt.preventDefault();
      setMenuAnchor({
        x: evt.clientX,
        y: evt.clientY,
        width: 0,
        height: 0,
      });
    };

    const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
      const target = evt.currentTarget.parentElement?.parentElement ?? evt.currentTarget;
      setMenuAnchor(target.getBoundingClientRect());
    };

    const closeMenu = () => {
      setMenuAnchor(undefined);
    };

    return (
      <MessageBase
        className={classNames(css.MessageBase, className)}
        tabIndex={0}
        space={messageSpacing}
        autoCollapse
        highlight={highlight}
        selected={!!menuAnchor}
        {...props}
        {...hoverProps}
        {...focusWithinProps}
        ref={ref}
      >
        {(hover || !!menuAnchor) && (
          <div className={css.MessageOptionsBase}>
            <Menu className={css.MessageOptionsBar} variant="SurfaceVariant">
              <Box gap="100">
                <PopOut
                  anchor={menuAnchor}
                  position="Bottom"
                  align={menuAnchor?.width === 0 ? 'Start' : 'End'}
                  offset={menuAnchor?.width === 0 ? 0 : undefined}
                  content={
                    <FocusTrap
                      focusTrapOptions={{
                        initialFocus: false,
                        onDeactivate: () => setMenuAnchor(undefined),
                        clickOutsideDeactivates: true,
                        isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
                        isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
                        escapeDeactivates: stopPropagation,
                      }}
                    >
                      <Menu {...props} ref={ref}>
                        <Box direction="Column" gap="100" className={css.MessageMenuGroup}>
                          {!hideReadReceipts && (
                            <MessageReadReceiptItem
                              room={room}
                              eventId={mEvent.getId() ?? ''}
                              onClose={closeMenu}
                            />
                          )}
                          {showDeveloperTools && (
                            <MessageSourceCodeItem
                              room={room}
                              mEvent={mEvent}
                              onClose={closeMenu}
                            />
                          )}
                          <MessageCopyLinkItem room={room} mEvent={mEvent} onClose={closeMenu} />
                        </Box>
                        {((!mEvent.isRedacted() && canDelete && !stateEvent) ||
                          (mEvent.getSender() !== mx.getUserId() && !stateEvent)) && (
                          <>
                            <Line size="300" />
                            <Box direction="Column" gap="100" className={css.MessageMenuGroup}>
                              {!mEvent.isRedacted() && canDelete && (
                                <MessageDeleteItem
                                  room={room}
                                  mEvent={mEvent}
                                  onClose={closeMenu}
                                />
                              )}
                              {mEvent.getSender() !== mx.getUserId() && (
                                <MessageReportItem
                                  room={room}
                                  mEvent={mEvent}
                                  onClose={closeMenu}
                                />
                              )}
                            </Box>
                          </>
                        )}
                      </Menu>
                    </FocusTrap>
                  }
                >
                  <IconButton
                    variant="SurfaceVariant"
                    size="300"
                    radii="300"
                    onClick={handleOpenMenu}
                    aria-pressed={!!menuAnchor}
                  >
                    <Icon src={EllipsisVerticalIcon} size="100" />
                  </IconButton>
                </PopOut>
              </Box>
            </Menu>
          </div>
        )}
        <div onContextMenu={handleContextMenu}>{children}</div>
      </MessageBase>
    );
  }
);
