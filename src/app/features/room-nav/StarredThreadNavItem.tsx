import React, { MouseEventHandler } from 'react';
import { Box, Icon, Text, toRem } from 'folds';
import { useTranslation } from 'react-i18next';
import { Room } from 'matrix-js-sdk';
import { NavItem, NavItemContent, NavLink } from '../../components/nav';
import { getHomeRoomPath } from '../../pages/pathUtils';
import { getCanonicalAliasOrRoomId } from '../../utils/matrix';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useThreadChat } from '../../state/threadChat';
import { MessageSquareTextIcon } from '../../icons/MessageSquareTextIcon';
import * as css from './styles.css';

type StarredThreadNavItemProps = {
  room: Room;
  threadId: string;
  title?: string;
  roomSelected: boolean;
};

function ThreadRelationIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden focusable="false">
      <path
        d="M7 3V6.5C7 8.70914 8.79086 10.5 11 10.5H15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StarredThreadNavItem({
  room,
  threadId,
  title,
  roomSelected,
}: StarredThreadNavItemProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const [threadChat, setThreadChat] = useThreadChat(room.roomId);
  const selected = roomSelected && threadChat.open && threadChat.threadRootId === threadId;

  const handleClick: MouseEventHandler<HTMLAnchorElement> = () => {
    setThreadChat({ open: true, threadRootId: threadId });
  };

  return (
    <NavItem
      className={css.StarredThreadNavItem}
      variant="Background"
      radii="400"
      aria-selected={selected}
    >
      <NavLink
        to={getHomeRoomPath(getCanonicalAliasOrRoomId(mx, room.roomId))}
        onClick={handleClick}
      >
        <NavItemContent className={css.StarredThreadNavContent}>
          <Box as="span" grow="Yes" alignItems="Center" gap="100" style={{ minWidth: 0 }}>
            <Box as="span" className={css.StarredThreadRelation}>
              <ThreadRelationIcon />
            </Box>
            <Icon src={MessageSquareTextIcon} size="50" style={{ flexShrink: 0 }} />
            <Text as="span" size="T200" truncate style={{ lineHeight: toRem(16) }}>
              {title || t('room.thread')}
            </Text>
          </Box>
        </NavItemContent>
      </NavLink>
    </NavItem>
  );
}
