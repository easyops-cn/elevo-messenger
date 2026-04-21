import React, {
  ChangeEventHandler,
  MouseEventHandler,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  Avatar,
  Badge,
  Box,
  Chip,
  Icon,
  Icons,
  IconButton,
  Input,
  MenuItem,
  PopOut,
  RectCords,
  Scroll,
  Spinner,
  Text,
  config,
} from 'folds';
import { MatrixClient, Room, RoomMember } from 'matrix-js-sdk';
import { useVirtualizer } from '@tanstack/react-virtual';
import classNames from 'classnames';
import { Page, PageContent, PageContentCenter, PageHeader, PageMain } from '../../../components/page';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import { BackRouteHandler } from '../../../components/BackRouteHandler';
import { ContainerColor } from '../../../styles/ContainerColor.css';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useRoomMembers } from '../../../hooks/useRoomMembers';
import { PowerLevelsContextProvider, usePowerLevels } from '../../../hooks/usePowerLevels';
import { UseStateProvider } from '../../../components/UseStateProvider';
import {
  SearchItemStrGetter,
  UseAsyncSearchOptions,
  useAsyncSearch,
} from '../../../hooks/useAsyncSearch';
import { useDebounce } from '../../../hooks/useDebounce';
import { TypingIndicator } from '../../../components/typing-indicator';
import { getMemberDisplayName, getMemberSearchStr } from '../../../utils/room';
import { getMxIdLocalPart } from '../../../utils/matrix';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';
import { ScrollTopContainer } from '../../../components/scroll-top-container';
import { UserAvatar } from '../../../components/user-avatar';
import { useRoomTypingMember } from '../../../hooks/useRoomTypingMembers';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { useMembershipFilter, useMembershipFilterMenu } from '../../../hooks/useMemberFilter';
import { useMemberSort, useMemberSortMenu } from '../../../hooks/useMemberSort';
import { MembershipFilterMenu } from '../../../components/MembershipFilterMenu';
import { MemberSortMenu } from '../../../components/MemberSortMenu';
import {
  useOpenUserRoomProfile,
  useUserRoomProfileState,
} from '../../../state/hooks/userRoomProfile';
import { useSpaceOptionally } from '../../../hooks/useSpace';
import * as css from '../../../features/room/MembersDrawer.css';
import { ContactIcon } from '../../../icons/ContactIcon';
import { useContactsContext } from './ContactsContext';

type MemberItemProps = {
  mx: MatrixClient;
  useAuthentication: boolean;
  room: Room;
  member: RoomMember;
  onClick: MouseEventHandler<HTMLButtonElement>;
  pressed?: boolean;
  typing?: boolean;
};
function MemberItem({
  mx,
  useAuthentication,
  room,
  member,
  onClick,
  pressed,
  typing,
}: MemberItemProps) {
  const name =
    getMemberDisplayName(room, member.userId) ?? getMxIdLocalPart(member.userId) ?? member.userId;
  const avatarMxcUrl = member.getMxcAvatarUrl();
  const avatarUrl = avatarMxcUrl
    ? mx.mxcUrlToHttp(avatarMxcUrl, 100, 100, 'crop', undefined, false, useAuthentication)
    : undefined;

  return (
    <MenuItem
      style={{ padding: `0 ${config.space.S200}` }}
      aria-pressed={pressed}
      data-user-id={member.userId}
      variant="Background"
      radii="400"
      onClick={onClick}
      before={
        <Avatar size="200" radii="Pill">
          <UserAvatar
            userId={member.userId}
            src={avatarUrl ?? undefined}
            alt={name}
            renderFallback={() => <Icon size="50" src={Icons.User} filled />}
          />
        </Avatar>
      }
      after={
        typing && (
          <Badge size="300" variant="Secondary" fill="Soft" radii="Pill" outlined>
            <TypingIndicator size="300" />
          </Badge>
        )
      }
    >
      <Box grow="Yes">
        <Text size="T400" truncate>
          {name}
        </Text>
      </Box>
    </MenuItem>
  );
}

const SEARCH_OPTIONS: UseAsyncSearchOptions = {
  limit: 1000,
  matchOptions: {
    contain: true,
  },
};

const mxIdToName = (mxId: string) => getMxIdLocalPart(mxId) ?? mxId;
const getRoomMemberStr: SearchItemStrGetter<RoomMember> = (m, query) =>
  getMemberSearchStr(m, query, mxIdToName);

type ContactsMemberListProps = {
  room: Room;
  members: RoomMember[];
  filterRole?: string;
};

type RoleGroupItem = { type: 'label'; name: string } | { type: 'member'; member: RoomMember };

export function ContactsMemberList({ room, members, filterRole }: ContactsMemberListProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollTopAnchorRef = useRef<HTMLDivElement>(null);

  const fetchingMembers = members.length < room.getJoinedMemberCount();
  const openUserRoomProfile = useOpenUserRoomProfile();
  const space = useSpaceOptionally();
  const openProfileUserId = useUserRoomProfileState()?.userId;

  const membershipFilterMenu = useMembershipFilterMenu();
  const sortFilterMenu = useMemberSortMenu();
  const [sortFilterIndex, setSortFilterIndex] = useSetting(settingsAtom, 'memberSortFilterIndex');
  const [membershipFilterIndex, setMembershipFilterIndex] = useState(0);

  const membershipFilter = useMembershipFilter(membershipFilterIndex, membershipFilterMenu);
  const memberSort = useMemberSort(sortFilterIndex, sortFilterMenu);

  const typingMembers = useRoomTypingMember(room.roomId);

  const { javisRoleMap } = useContactsContext();

  const filteredMembers = useMemo(
    () => members.filter(membershipFilter.filterFn).sort(memberSort.sortFn),
    [members, membershipFilter, memberSort]
  );

  const [result, search, resetSearch] = useAsyncSearch(
    filteredMembers,
    getRoomMemberStr,
    SEARCH_OPTIONS
  );
  if (!result && searchInputRef.current?.value) search(searchInputRef.current.value);

  const processMembers = result ? result.items : filteredMembers;

  const roleGroupedItems = useMemo<RoleGroupItem[]>(() => {
    const membersToShow = filterRole
      ? processMembers.filter((m) => {
          const localpart = getMxIdLocalPart(m.userId);
          const role = localpart ? javisRoleMap[localpart] : undefined;
          return filterRole === 'Unknown' ? !role : role === filterRole;
        })
      : processMembers;

    if (filterRole) {
      return membersToShow.map((m): RoleGroupItem => ({ type: 'member', member: m }));
    }

    const groups = membersToShow.reduce<Map<string, RoomMember[]>>((acc, member) => {
      const localpart = getMxIdLocalPart(member.userId);
      const role = localpart ? javisRoleMap[localpart] : undefined;
      const key = role ?? '__others__';
      const existing = acc.get(key);
      if (existing) existing.push(member);
      else acc.set(key, [member]);
      return acc;
    }, new Map());

    const namedGroups = Array.from(groups.entries()).filter(([key]) => key !== '__others__');
    const othersGroup = groups.get('__others__');

    const items: RoleGroupItem[] = namedGroups.flatMap(([key, groupMembers]) => [
      { type: 'label', name: key } as RoleGroupItem,
      ...groupMembers.map((m): RoleGroupItem => ({ type: 'member', member: m })),
    ]);

    if (othersGroup) {
      items.push({ type: 'label', name: t('contacts.unknown') });
      othersGroup.forEach((m) => items.push({ type: 'member', member: m }));
    }

    return items;
  }, [processMembers, javisRoleMap, filterRole, t]);

  const virtualizer = useVirtualizer({
    count: roleGroupedItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });

  const handleSearchChange: ChangeEventHandler<HTMLInputElement> = useDebounce(
    useCallback(
      (evt) => {
        if (evt.target.value) search(evt.target.value);
        else resetSearch();
      },
      [search, resetSearch]
    ),
    { wait: 200 }
  );

  const handleMemberClick: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const btn = evt.currentTarget as HTMLButtonElement;
    const userId = btn.getAttribute('data-user-id');
    if (!userId) return;
    openUserRoomProfile(room.roomId, space?.roomId, userId, btn.getBoundingClientRect(), 'Left');
  };

  return (
    <Scroll ref={scrollRef} variant="Background" visibility="Hover" hideTrack>
      <PageContent>
        <PageContentCenter>
          <Box direction="Column" gap="600">
            <Box ref={scrollTopAnchorRef} direction="Column" gap="400">
              <Box direction="Column" gap="100">
                <span data-spacing-node />
                <Text size="L400">{t('contacts.search')}</Text>
                <Input
                  ref={searchInputRef}
                  onChange={handleSearchChange}
                  style={{ paddingRight: config.space.S300 }}
                  placeholder={t('contacts.searchPlaceholder')}
                  variant="Background"
                  size="500"
                  radii="400"
                  before={<Icon size="200" src={Icons.Search} />}
                  after={
                    result && (
                      <Chip
                        type="button"
                        variant="Secondary"
                        size="400"
                        radii="Pill"
                        outlined
                        after={<Icon size="50" src={Icons.Cross} />}
                        onClick={() => {
                          if (searchInputRef.current) {
                            searchInputRef.current.value = '';
                            searchInputRef.current.focus();
                          }
                          resetSearch();
                        }}
                      >
                        <Text size="B300">
                          {result.items.length
                            ? t('contacts.resultCount_other', { count: result.items.length })
                            : t('contacts.noResults')}
                        </Text>
                      </Chip>
                    )
                  }
                />
              </Box>
              <Box alignItems="Center" justifyContent="SpaceBetween" gap="200">
                <UseStateProvider initial={undefined}>
                  {(anchor: RectCords | undefined, setAnchor) => (
                    <PopOut
                      anchor={anchor}
                      position="Bottom"
                      align="Start"
                      offset={4}
                      content={
                        <MembershipFilterMenu
                          selected={membershipFilterIndex}
                          onSelect={setMembershipFilterIndex}
                          requestClose={() => setAnchor(undefined)}
                        />
                      }
                    >
                      <Chip
                        onClick={
                          ((evt) =>
                            setAnchor(
                              evt.currentTarget.getBoundingClientRect()
                            )) as MouseEventHandler<HTMLButtonElement>
                        }
                        variant="Background"
                        size="400"
                        radii="300"
                        before={<Icon src={Icons.Filter} size="50" />}
                      >
                        <Text size="T200">{membershipFilter.name}</Text>
                      </Chip>
                    </PopOut>
                  )}
                </UseStateProvider>
                <UseStateProvider initial={undefined}>
                  {(anchor: RectCords | undefined, setAnchor) => (
                    <PopOut
                      anchor={anchor}
                      position="Bottom"
                      align="End"
                      offset={4}
                      content={
                        <MemberSortMenu
                          selected={sortFilterIndex}
                          onSelect={setSortFilterIndex}
                          requestClose={() => setAnchor(undefined)}
                        />
                      }
                    >
                      <Chip
                        onClick={
                          ((evt) =>
                            setAnchor(
                              evt.currentTarget.getBoundingClientRect()
                            )) as MouseEventHandler<HTMLButtonElement>
                        }
                        variant="Background"
                        size="400"
                        radii="300"
                        after={<Icon src={Icons.Sort} size="50" />}
                      >
                        <Text size="T200">{memberSort.name}</Text>
                      </Chip>
                    </PopOut>
                  )}
                </UseStateProvider>
              </Box>
            </Box>

            <ScrollTopContainer scrollRef={scrollRef} anchorRef={scrollTopAnchorRef}>
              <IconButton
                onClick={() => virtualizer.scrollToOffset(0)}
                variant="Surface"
                radii="Pill"
                outlined
                size="300"
                aria-label={t('contacts.scrollToTop')}
              >
                <Icon src={Icons.ChevronTop} size="300" />
              </IconButton>
            </ScrollTopContainer>

            {!fetchingMembers && !result && processMembers.length === 0 && (
              <Text style={{ padding: config.space.S300 }} align="Center">
                {t('contacts.noMembersOfType', { type: membershipFilter.name })}
              </Text>
            )}

            <Box className={css.MembersGroup} direction="Column" gap="100">
              <div
                style={{
                  position: 'relative',
                  height: virtualizer.getTotalSize(),
                }}
              >
                {virtualizer.getVirtualItems().map((vItem) => {
                  const item = roleGroupedItems[vItem.index];
                  if (item.type === 'label') {
                    return (
                      <Text
                        style={{
                          transform: `translateY(${vItem.start}px)`,
                        }}
                        data-index={vItem.index}
                        ref={virtualizer.measureElement}
                        key={`${room.roomId}-label-${vItem.index}`}
                        className={classNames(css.MembersGroupLabel, css.DrawerVirtualItem)}
                        size="L400"
                      >
                        {item.name}
                      </Text>
                    );
                  }

                  const { member } = item;
                  return (
                    <div
                      style={{
                        transform: `translateY(${vItem.start}px)`,
                        paddingBottom: config.space.S200,
                      }}
                      className={css.DrawerVirtualItem}
                      data-index={vItem.index}
                      key={`${room.roomId}-${member.userId}`}
                      ref={virtualizer.measureElement}
                    >
                      <MemberItem
                        mx={mx}
                        useAuthentication={useAuthentication}
                        room={room}
                        member={member}
                        onClick={handleMemberClick}
                        pressed={openProfileUserId === member.userId}
                        typing={typingMembers.some(
                          (receipt) => receipt.userId === member.userId
                        )}
                      />
                    </div>
                  );
                })}
              </div>
            </Box>

            {fetchingMembers && (
              <Box justifyContent="Center">
                <Spinner />
              </Box>
            )}
          </Box>
        </PageContentCenter>
      </PageContent>
    </Scroll>
  );
}

type ContactsRoomMembersProps = {
  room: Room;
};
function ContactsRoomMembers({ room }: ContactsRoomMembersProps) {
  const mx = useMatrixClient();
  const members = useRoomMembers(mx, room.roomId);
  const powerLevels = usePowerLevels(room);

  return (
    <PowerLevelsContextProvider value={powerLevels}>
      <ContactsMemberList room={room} members={members} />
    </PowerLevelsContextProvider>
  );
}

export function ContactsPage() {
  const { t } = useTranslation();
  const screenSize = useScreenSizeContext();
  const { room } = useContactsContext();

  return (
    <PageMain>
      <Page>
        <PageHeader balance>
          <Box grow="Yes" gap="200">
            <Box grow="Yes" basis="No">
              {screenSize === ScreenSize.Mobile && (
                <BackRouteHandler>
                  {(onBack) => (
                    <IconButton size="300" fill="None" onClick={onBack}>
                      <Icon size="100" src={Icons.ArrowLeft} />
                    </IconButton>
                  )}
                </BackRouteHandler>
              )}
            </Box>
            <Box alignItems="Center" gap="200">
              {screenSize !== ScreenSize.Mobile && <Icon size="300" src={ContactIcon} />}
              <Text size="H5" truncate>
                {t('contacts.title')}
              </Text>
            </Box>
            <Box grow="Yes" basis="No" />
          </Box>
        </PageHeader>

        <Box style={{ position: 'relative' }} grow="Yes">
          {room ? (
            <ContactsRoomMembers room={room} />
          ) : (
            <Scroll hideTrack visibility="Hover">
              <PageContent>
                <PageContentCenter>
                  <Box
                    className={ContainerColor({ variant: 'SurfaceVariant' })}
                    style={{
                      padding: config.space.S300,
                      borderRadius: config.radii.R400,
                    }}
                    direction="Column"
                    gap="200"
                  >
                    <Text>{t('contacts.roomNotFound')}</Text>
                    <Text size="T200">{t('contacts.roomNotFoundDesc')}</Text>
                  </Box>
                </PageContentCenter>
              </PageContent>
            </Scroll>
          )}
        </Box>
      </Page>
    </PageMain>
  );
}
