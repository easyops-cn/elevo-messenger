import { useCallback, useEffect, useRef } from 'react';
import { useMatrixClient } from './useMatrixClient';
import { useAccountData } from './useAccountData';
import { AccountDataEvent, LinksContent } from '../../types/matrix/accountData';
import { useElevoConfig } from './useElevoConfig';
import { performWorkspaceOAuth, refreshWorkspaceOAuthToken } from '../utils/workspaceOAuth';

export type WorkspaceTokenState = {
  token: string | null;
  connected: boolean;
  expired: boolean;
  connection: LinksContent['workspaces'] | null;
};

export type UseWorkspaceTokenReturn = WorkspaceTokenState & {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

export function useWorkspaceToken(): UseWorkspaceTokenReturn {
  const mx = useMatrixClient();
  const elevoConfig = useElevoConfig();
  const accountDataEvent = useAccountData(AccountDataEvent.ElevoLinks);
  const linksContent = accountDataEvent?.getContent() as LinksContent | undefined;
  const connection = linksContent?.workspaces ?? null;

  const expired = connection
    ? Date.now() > new Date(connection.connectedAt).getTime() + connection.expiresIn * 1000
    : false;

  const token = connection && !expired ? connection.accessToken : null;
  const connected = !!connection && !expired;

  const connect = useCallback(async () => {
    const oauth = elevoConfig.workspaces?.oauth;
    const apiBaseUrl = elevoConfig.workspaces?.apiBaseUrl;
    if (!oauth || !apiBaseUrl) {
      throw new Error('OAuth not configured for workspaces');
    }
    const result = await performWorkspaceOAuth({
      serverUrl: apiBaseUrl,
      clientId: oauth.clientId,
    });
    await mx.setAccountData(AccountDataEvent.ElevoLinks, {
      workspaces: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
        scope: result.scope,
        connectedAt: new Date().toISOString(),
        serverUrl: apiBaseUrl,
      },
    });
  }, [mx, elevoConfig]);

  // Auto-refresh when access token is expired but refresh token is available
  const refreshingRef = useRef(false);
  useEffect(() => {
    const refreshToken = connection?.refreshToken;
    if (!expired || !refreshToken || refreshingRef.current) return;

    const oauth = elevoConfig.workspaces?.oauth;
    if (!oauth) return;

    refreshingRef.current = true;
    const doRefresh = async () => {
      try {
        const result = await refreshWorkspaceOAuthToken(
          connection.serverUrl,
          oauth.clientId,
          refreshToken
        );
        await mx.setAccountData(AccountDataEvent.ElevoLinks, {
          workspaces: {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn,
            scope: result.scope,
            connectedAt: new Date().toISOString(),
            serverUrl: connection.serverUrl,
          },
        });
      } catch {
        // Refresh failed (e.g. refresh token expired), keep expired state
      }
      refreshingRef.current = false;
    };
    doRefresh();
  }, [mx, expired, connection, elevoConfig]);

  const disconnect = useCallback(async () => {
    await mx.setAccountData(AccountDataEvent.ElevoLinks, {});
  }, [mx]);

  return { token, connected, expired, connection, connect, disconnect };
}
