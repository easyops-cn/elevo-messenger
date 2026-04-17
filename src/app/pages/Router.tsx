import React from 'react';
import {
  Outlet,
  Route,
  createBrowserRouter,
  createHashRouter,
  createRoutesFromElements,
  redirect,
} from 'react-router-dom';
import { useTauriDeepLink } from '../plugins/useTauriDeepLink';

import { ClientConfig } from '../hooks/useClientConfig';
import { AuthLayout, Login, Register, ResetPassword } from './auth';
import { OidcCallback } from './auth/oidc/OidcCallback';
import {
  DIRECT_PATH,
  EXPLORE_PATH,
  HOME_PATH,
  LOGIN_PATH,
  INBOX_PATH,
  REGISTER_PATH,
  RESET_PASSWORD_PATH,
  OIDC_CALLBACK_PATH,
  _CREATE_PATH,
  _FEATURED_PATH,
  _INVITES_PATH,
  _ROOM_PATH,
  _SEARCH_PATH,
  _SERVER_PATH,
  _EXPLORE_SPACE_PATH,
  CREATE_PATH,
  CONTACTS_PATH,
  _CONTACTS_CONTACTS_PATH,
  _CONTACTS_ROLE_PATH,
  _CREATE_CHAT_PATH,
  ME_PATH,
} from './paths';
import {
  getAppPathFromHref,
  getExploreFeaturedPath,
  getHomePath,
  getHomeCreateChatPath,
  getHomeRoomPath,
  getContactsContactsPath,
  getLoginPath,
  getOriginBaseUrl,
  getMeInvitesPath,
  getInboxInvitesPath,
  getMePath,
} from './pathUtils';
import { ClientBindAtoms, ClientLayout, ClientRoot } from './client';
import { Home, HomeRouteRoomProvider, HomeSearch } from './client/home';
import { Explore, FeaturedRooms, PublicRooms } from './client/explore';
import { ExploreSpaceProvider } from './client/explore/ExploreSpaceProvider';
import { Invites } from './client/inbox';
import { Contacts, ContactsPage, ContactsProvider, ContactsRolePage } from './client/contacts';
import { Me } from './client/me';
import { setAfterLoginRedirectPath } from './afterLoginRedirectPath';
import { Room } from '../features/room';
import { Lobby } from '../features/lobby';
import { WelcomePage } from './client/WelcomePage';
import { MobileFriendlyPageNav } from './MobileFriendly';
import { PageRoot } from '../components/page';
import { ScreenSize } from '../hooks/useScreenSize';
import { ClientInitStorageAtom } from './client/ClientInitStorageAtom';
import { ClientNonUIFeatures } from './client/ClientNonUIFeatures';
import { AuthRouteThemeManager } from './ThemeManager';
import { ReceiveSelfDeviceVerification } from '../components/DeviceVerification';
import { AutoRestoreBackupOnVerification } from '../components/BackupRestore';
import { RoomSettingsRenderer } from '../features/room-settings';
import { ClientRoomsNotificationPreferences } from './client/ClientRoomsNotificationPreferences';
import { SpaceSettingsRenderer } from '../features/space-settings';
import { UserRoomProfileRenderer } from '../components/UserRoomProfileRenderer';
import { CreateRoomModalRenderer } from '../features/create-room';
import { HomeCreateRoom } from './client/home/CreateRoom';
import { HomeCreateChat } from './client/home/CreateChatPage';
import { Create } from './client/create';
import { CreateSpaceModalRenderer } from '../features/create-space';
import { SearchModalRenderer } from '../features/search';
import { getFallbackSession } from '../state/sessions';
import { CallStatusRenderer } from './CallStatusRenderer';
import { CallEmbedProvider } from '../components/CallEmbedProvider';
import { UpdateCheckerProvider } from '../state/update/UpdateCheckerContext';

function TauriDeepLinkHandler() {
  useTauriDeepLink();
  return <Outlet />;
}

export const createRouter = (clientConfig: ClientConfig, screenSize: ScreenSize) => {
  const { hashRouter } = clientConfig;

  const mobile = screenSize === ScreenSize.Mobile;

  const routes = createRoutesFromElements(
    <Route element={<TauriDeepLinkHandler />}>
      <Route
        index
        loader={() => {
          if (getFallbackSession()) return redirect(getHomePath());
          const afterLoginPath = getAppPathFromHref(getOriginBaseUrl(), window.location.href);
          if (afterLoginPath) setAfterLoginRedirectPath(afterLoginPath);
          return redirect(getLoginPath());
        }}
      />
      <Route
        loader={() => {
          if (getFallbackSession()) {
            return redirect(getHomePath());
          }

          return null;
        }}
        element={
          <AuthRouteThemeManager>
            <AuthLayout />
          </AuthRouteThemeManager>
        }
      >
        <Route path={LOGIN_PATH} element={<Login />} />
        <Route path={REGISTER_PATH} element={<Register />} />
        <Route path={RESET_PASSWORD_PATH} element={<ResetPassword />} />
        <Route path={OIDC_CALLBACK_PATH} element={<OidcCallback />} />
      </Route>

      <Route
        loader={() => {
          const session = getFallbackSession();
          if (!session) {
            const afterLoginPath = getAppPathFromHref(
              getOriginBaseUrl(hashRouter),
              window.location.href
            );
            if (afterLoginPath) setAfterLoginRedirectPath(afterLoginPath);
            return redirect(getLoginPath());
          }
          return null;
        }}
        element={
          <AuthRouteThemeManager>
            <ClientRoot>
              <ClientInitStorageAtom>
                <ClientRoomsNotificationPreferences>
                  <ClientBindAtoms>
                    <ClientNonUIFeatures>
                      <UpdateCheckerProvider>
                        <CallEmbedProvider>
                          <ClientLayout>
                            <Outlet />
                          </ClientLayout>
                          <CallStatusRenderer />
                        </CallEmbedProvider>
                        <SearchModalRenderer />
                        <UserRoomProfileRenderer />
                        <CreateRoomModalRenderer />
                        <CreateSpaceModalRenderer />
                        <RoomSettingsRenderer />
                        <SpaceSettingsRenderer />
                        <ReceiveSelfDeviceVerification />
                        <AutoRestoreBackupOnVerification />
                      </UpdateCheckerProvider>
                    </ClientNonUIFeatures>
                  </ClientBindAtoms>
                </ClientRoomsNotificationPreferences>
              </ClientInitStorageAtom>
            </ClientRoot>
          </AuthRouteThemeManager>
        }
      >
        <Route
          path={HOME_PATH}
          element={
            <PageRoot
              nav={
                <MobileFriendlyPageNav path={HOME_PATH}>
                  <Home />
                </MobileFriendlyPageNav>
              }
            >
              <Outlet />
            </PageRoot>
          }
        >
          {mobile ? null : <Route index element={<WelcomePage />} />}
          <Route path={_CREATE_PATH} element={<HomeCreateRoom />} />
          <Route path={_CREATE_CHAT_PATH} element={<HomeCreateChat />} />
          <Route path={_SEARCH_PATH} element={<HomeSearch />} />
          <Route
            path={_ROOM_PATH}
            element={
              <HomeRouteRoomProvider>
                <Room />
              </HomeRouteRoomProvider>
            }
          />
        </Route>
        <Route
          path={DIRECT_PATH}
          loader={() => redirect(getHomePath())}
        />
        <Route
          path={`/direct/${_CREATE_CHAT_PATH}`}
          loader={() => redirect(getHomeCreateChatPath())}
        />
        <Route
          path={`/direct/${_CREATE_PATH}`}
          loader={() => redirect(getHomeCreateChatPath())}
        />
        <Route
          path={`/direct/${_ROOM_PATH}`}
          loader={({ params }) => {
            const { roomIdOrAlias, eventId } = params as { roomIdOrAlias: string; eventId?: string };
            return redirect(getHomeRoomPath(decodeURIComponent(roomIdOrAlias), eventId ? decodeURIComponent(eventId) : undefined));
          }}
        />
        <Route
          path={EXPLORE_PATH}
          element={
            <PageRoot
              nav={
                <MobileFriendlyPageNav path={EXPLORE_PATH}>
                  <Explore />
                </MobileFriendlyPageNav>
              }
            >
              <Outlet />
            </PageRoot>
          }
        >
          {mobile ? <Route index element={<div />} /> : (
            <Route
              index
              loader={() => redirect(getExploreFeaturedPath())}
              element={<WelcomePage />}
            />
          )}
          <Route path={_FEATURED_PATH} element={<FeaturedRooms />} />
          <Route path={_SERVER_PATH} element={<PublicRooms />} />
          <Route
            path={_EXPLORE_SPACE_PATH}
            element={
              <ExploreSpaceProvider>
                <Lobby />
              </ExploreSpaceProvider>
            }
          />
        </Route>
        <Route path={CREATE_PATH} element={<Create />} />
        <Route
          path={INBOX_PATH}
          loader={() => redirect(getMePath())}
        />
        <Route
          path={getInboxInvitesPath()}
          loader={() => redirect(getMeInvitesPath())}
        />
        <Route
          path={CONTACTS_PATH}
          element={
            <ContactsProvider>
              <PageRoot
                nav={
                  <MobileFriendlyPageNav path={CONTACTS_PATH}>
                    <Contacts />
                  </MobileFriendlyPageNav>
                }
              >
                <Outlet />
              </PageRoot>
            </ContactsProvider>
          }
        >
          {mobile ? <Route index element={<div />} /> : (
            <Route
              index
              loader={() => redirect(getContactsContactsPath())}
              element={<WelcomePage />}
            />
          )}
          <Route path={_CONTACTS_CONTACTS_PATH} element={<ContactsPage />} />
          <Route path={_CONTACTS_ROLE_PATH} element={<ContactsRolePage />} />
        </Route>
        <Route
          path={ME_PATH}
          element={
            <PageRoot
              nav={
                <MobileFriendlyPageNav path={ME_PATH}>
                  <Me />
                </MobileFriendlyPageNav>
              }
            >
              <Outlet />
            </PageRoot>
          }
        >
          {mobile ? <Route index element={<div />} /> : (
            <Route
              index
              loader={() => redirect(getMeInvitesPath())}
              element={<WelcomePage />}
            />
          )}
          <Route path={_INVITES_PATH} element={<Invites />} />
        </Route>
      </Route>
      <Route path="/*" element={<p>Page not found</p>} />
    </Route>
  );

  if (hashRouter?.enabled) {
    return createHashRouter(routes, { basename: hashRouter.basename });
  }
  return createBrowserRouter(routes, {
    basename: import.meta.env.BASE_URL,
  });
};
