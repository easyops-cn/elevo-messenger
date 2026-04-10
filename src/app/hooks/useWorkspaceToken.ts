import { useCallback } from 'react';
import { useMatrixClient } from './useMatrixClient';
import { useAccountData } from './useAccountData';
import { AccountDataEvent, LinksContent } from '../../types/matrix/accountData';
import { useElevoConfig } from './useElevoConfig';
import { isDesktopTauri } from '../plugins/useTauriOpener';
import { performWorkspaceOAuth } from '../utils/workspaceOAuth';

const ELEVO_TOKEN_STORAGE_KEY = 'elevo_workspaces_api_token';

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

  // Token resolution priority: account data > localStorage > config apiKey
  const legacyToken = localStorage.getItem(ELEVO_TOKEN_STORAGE_KEY) ?? '';
  const defaultApiKey = elevoConfig.workspaces?.apiKey ?? '';
  const token =
    connection && !expired ? connection.accessToken : legacyToken || defaultApiKey || null;
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
        expiresIn: result.expiresIn,
        scope: result.scope,
        connectedAt: new Date().toISOString(),
        serverUrl: apiBaseUrl,
      },
    });
  }, [mx, elevoConfig]);

  const disconnect = useCallback(async () => {
    await mx.setAccountData(AccountDataEvent.ElevoLinks, {});
  }, [mx]);

  return { token, connected, expired, connection, connect, disconnect };
}
