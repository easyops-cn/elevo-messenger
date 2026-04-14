import React, { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import FocusTrap from 'focus-trap-react';
import { useAtomValue } from 'jotai';
import {
  Avatar,
  Box,
  Button,
  Dialog,
  Header,
  Icon,
  IconButton,
  Icons,
  Input,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Text,
  color,
  config,
} from 'folds';
import {
  NavCategory,
  NavCategoryHeader,
  NavItem,
  NavItemContent,
  NavLink,
} from '../../../components/nav';
import { getExploreFeaturedPath, getExploreServerPath, getExploreSpacePath } from '../../pathUtils';
import { useClientConfig } from '../../../hooks/useClientConfig';
import {
  useExploreFeaturedSelected,
  useExploreServer,
  useExploreSpaceSelected,
} from '../../../hooks/router/useExploreSelected';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { getMxIdServer, getCanonicalAliasOrRoomId } from '../../../utils/matrix';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useNavToActivePathMapper } from '../../../hooks/useNavToActivePathMapper';
import { PageNav, PageNavContent, PageNavHeader } from '../../../components/page';
import { stopPropagation } from '../../../utils/keyboard';
import { RoomAvatar } from '../../../components/room-avatar';
import { useOrphanSpaces } from '../../../state/hooks/roomList';
import { useSidebarItems } from '../../../hooks/useSidebarItems';
import { roomToParentsAtom } from '../../../state/room/roomToParents';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { getRoomAvatarUrl } from '../../../utils/room';
import { nameInitials } from '../../../utils/common';
import type { ISidebarFolder } from '../../../hooks/useSidebarItems';

export function AddServer() {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState(false);
  const serverInputRef = useRef<HTMLInputElement>(null);

  const [exploreState] = useAsyncCallback(
    useCallback((server: string) => mx.publicRooms({ server, limit: 1 }), [mx])
  );

  const getInputServer = (): string | undefined => {
    const serverInput = serverInputRef.current;
    if (!serverInput) return undefined;
    const server = serverInput.value.trim();
    return server || undefined;
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    const server = getInputServer();
    if (!server) return;

    navigate(getExploreServerPath(server));
    setDialog(false);
  };

  const handleView = () => {
    const server = getInputServer();
    if (!server) return;
    navigate(getExploreServerPath(server));
    setDialog(false);
  };

  return (
    <>
      <Overlay open={dialog} backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              clickOutsideDeactivates: true,
              onDeactivate: () => setDialog(false),
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
                  <Text size="H4">{t('explore.addServer')}</Text>
                </Box>
                <IconButton size="300" onClick={() => setDialog(false)} radii="300">
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
                <Text priority="400">{t('explore.addServerDesc')}</Text>
                <Box direction="Column" gap="100">
                  <Text size="L400">{t('explore.serverName')}</Text>
                  <Input ref={serverInputRef} name="serverInput" variant="Background" required />
                  {exploreState.status === AsyncStatus.Error && (
                    <Text style={{ color: color.Critical.Main }} size="T300">
                      {t('explore.failedLoadRooms')}
                    </Text>
                  )}
                </Box>
                <Box direction="Column" gap="200">
                  <Button type="submit" onClick={handleView} variant="Secondary" fill="Soft">
                    <Text size="B400">{t('common.view')}</Text>
                  </Button>
                </Box>
              </Box>
            </Dialog>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
      <Button
        variant="Secondary"
        fill="Soft"
        size="300"
        before={<Icon size="100" src={Icons.Plus} />}
        onClick={() => setDialog(true)}
      >
        <Text size="B300" truncate>
          {t('explore.addServer')}
        </Text>
      </Button>
    </>
  );
}

export function Explore() {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  useNavToActivePathMapper('explore');
  const userId = mx.getUserId();
  const clientConfig = useClientConfig();
  const userServer = userId ? getMxIdServer(userId) : undefined;
  const servers =
    clientConfig.featuredCommunities?.servers?.filter((server) => server !== userServer) ?? [];

  const featuredSelected = useExploreFeaturedSelected();
  const selectedServer = useExploreServer();
  const selectedExploreSpace = useExploreSpaceSelected();

  const roomToParents = useAtomValue(roomToParentsAtom);
  const orphanSpaces = useOrphanSpaces(mx, allRoomsAtom, roomToParents);
  const [sidebarItems] = useSidebarItems(orphanSpaces);
  const useAuth = useMediaAuthentication();

  return (
    <PageNav stretch>
      <PageNavHeader>
        <Box grow="Yes" gap="300">
          <Box grow="Yes">
            <Text size="H4" truncate>
              {t('explore.title')}
            </Text>
          </Box>
        </Box>
      </PageNavHeader>

      <PageNavContent>
        <Box direction="Column" gap="300">
          <NavCategory>
            <NavItem variant="Background" radii="400" aria-selected={featuredSelected}>
              <NavLink to={getExploreFeaturedPath()}>
                <NavItemContent>
                  <Box as="span" grow="Yes" alignItems="Center" gap="200">
                    <Avatar size="200" radii="400">
                      <Icon src={Icons.Bulb} size="100" filled={featuredSelected} />
                    </Avatar>
                    <Box as="span" grow="Yes">
                      <Text as="span" size="Inherit" truncate>
                        {t('explore.featured')}
                      </Text>
                    </Box>
                  </Box>
                </NavItemContent>
              </NavLink>
            </NavItem>
            {userServer && (
              <NavItem
                variant="Background"
                radii="400"
                aria-selected={selectedServer === userServer}
              >
                <NavLink to={getExploreServerPath(userServer)}>
                  <NavItemContent>
                    <Box as="span" grow="Yes" alignItems="Center" gap="200">
                      <Avatar size="200" radii="400">
                        <Icon
                          src={Icons.Server}
                          size="100"
                          filled={selectedServer === userServer}
                        />
                      </Avatar>
                      <Box as="span" grow="Yes">
                        <Text as="span" size="Inherit" truncate>
                          {userServer}
                        </Text>
                      </Box>
                    </Box>
                  </NavItemContent>
                </NavLink>
              </NavItem>
            )}
          </NavCategory>
          {servers.length > 0 && (
            <NavCategory>
              <NavCategoryHeader>
                <Text size="O400" style={{ paddingLeft: config.space.S200 }}>
                  {t('explore.servers')}
                </Text>
              </NavCategoryHeader>
              {servers.map((server) => (
                <NavItem
                  key={server}
                  variant="Background"
                  radii="400"
                  aria-selected={server === selectedServer}
                >
                  <NavLink to={getExploreServerPath(server)}>
                    <NavItemContent>
                      <Box as="span" grow="Yes" alignItems="Center" gap="200">
                        <Avatar size="200" radii="400">
                          <Icon src={Icons.Server} size="100" filled={server === selectedServer} />
                        </Avatar>
                        <Box as="span" grow="Yes">
                          <Text as="span" size="Inherit" truncate>
                            {server}
                          </Text>
                        </Box>
                      </Box>
                    </NavItemContent>
                  </NavLink>
                </NavItem>
              ))}
            </NavCategory>
          )}
          {sidebarItems.length > 0 && (
            <NavCategory>
              <NavCategoryHeader>
                <Text size="O400" style={{ paddingLeft: config.space.S200 }}>
                  {t('explore.spaces')}
                </Text>
              </NavCategoryHeader>
              {sidebarItems.map((item) => {
                if (typeof item === 'object') {
                  const folder = item as ISidebarFolder;
                  const firstSpaceId = folder.content[0];
                  const firstSpace = firstSpaceId ? mx.getRoom(firstSpaceId) : undefined;
                  if (!firstSpace) return null;

                  return (
                    <NavItem
                      key={folder.id}
                      variant="Background"
                      radii="400"
                      aria-selected={folder.content.includes(selectedExploreSpace ?? '')}
                    >
                      <NavLink
                        to={getExploreSpacePath(
                          getCanonicalAliasOrRoomId(mx, firstSpace.roomId)
                        )}
                      >
                        <NavItemContent>
                          <Box as="span" grow="Yes" alignItems="Center" gap="200">
                            <Avatar size="200" radii="400">
                              <Text size="T200">{nameInitials(folder.name ?? '', 2)}</Text>
                            </Avatar>
                            <Box as="span" grow="Yes">
                              <Text as="span" size="Inherit" truncate>
                                {folder.name ??
                                  folder.content
                                    .map((id) => mx.getRoom(id)?.name)
                                    .filter(Boolean)
                                    .join(', ')}
                              </Text>
                            </Box>
                          </Box>
                        </NavItemContent>
                      </NavLink>
                    </NavItem>
                  );
                }

                const space = mx.getRoom(item);
                if (!space) return null;

                return (
                  <NavItem
                    key={space.roomId}
                    variant="Background"
                    radii="400"
                    aria-selected={space.roomId === selectedExploreSpace}
                  >
                    <NavLink
                      to={getExploreSpacePath(getCanonicalAliasOrRoomId(mx, space.roomId))}
                    >
                      <NavItemContent>
                        <Box as="span" grow="Yes" alignItems="Center" gap="200">
                          <Avatar size="200" radii="400">
                            <RoomAvatar
                              roomId={space.roomId}
                              src={getRoomAvatarUrl(mx, space, 96, useAuth) ?? undefined}
                              alt={space.name}
                              renderFallback={() => (
                                <Text size="T200">{nameInitials(space.name, 2)}</Text>
                              )}
                            />
                          </Avatar>
                          <Box as="span" grow="Yes">
                            <Text as="span" size="Inherit" truncate>
                              {space.name}
                            </Text>
                          </Box>
                        </Box>
                      </NavItemContent>
                    </NavLink>
                  </NavItem>
                );
              })}
            </NavCategory>
          )}
        </Box>
      </PageNavContent>
    </PageNav>
  );
}
