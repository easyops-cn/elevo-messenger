import React, { ReactNode, useEffect, useState } from 'react';
import { MatrixClient } from 'matrix-js-sdk';
import {
  ElevoConfig,
  ElevoConfigProvider,
  TenantConfig,
  OAuthConfig,
  DEFAULT_ELEVO_CONFIG,
} from '../hooks/useElevoConfig';
import { trimTrailingSlash } from '../utils/common';

export const fetchElevoConfig = async (baseUrl: string): Promise<ElevoConfig> => {
  const url = `${trimTrailingSlash(baseUrl)}/.well-known/elevo-messenger/config`;
  try {
    const res = await fetch(url);
    if (!res.ok) return DEFAULT_ELEVO_CONFIG;
    const data = await res.json();
    const tenants: TenantConfig[] | undefined = data.workspaces?.tenants?.map(
      (t: { id: string; name: string; tasks_template_url?: string; tasks_web_template_url?: string }) => ({
        id: t.id,
        name: t.name,
        tasks_template_url: t.tasks_template_url,
        tasks_web_template_url: t.tasks_web_template_url,
      })
    );
    const oauth: OAuthConfig | undefined = data.workspaces?.oauth?.client_id
      ? { clientId: data.workspaces.oauth.client_id }
      : undefined;
    return {
      workspaces: {
        apiBaseUrl: data.workspaces?.api?.base_url,
        explorerUrl: data.workspaces?.explorer?.base_url,
        tenants,
        oauth,
      },
      features: {
        federation: data.features?.federation ?? true,
        deviceVerification: data.features?.device_verification ?? true,
        encryption: data.features?.encryption ?? true,
        call: data.features?.call ?? true,
        roomVersion: data.features?.room_version ?? true,
      },
      oidcStaticClients: data.oidc_static_clients,
      elevoContactsRoomId: data.elevo_contacts_room_id,
    };
  } catch {
    return DEFAULT_ELEVO_CONFIG;
  }
};

type ElevoConfigLoaderProps = {
  mx: MatrixClient;
  children: ReactNode;
};

export function ElevoConfigLoader({ mx, children }: ElevoConfigLoaderProps) {
  const [config, setConfig] = useState<ElevoConfig>(DEFAULT_ELEVO_CONFIG);
  const baseUrl = mx.getHomeserverUrl();

  useEffect(() => {
    let cancelled = false;
    fetchElevoConfig(baseUrl).then((result) => {
      if (!cancelled) setConfig(result);
    });
    return () => {
      cancelled = true;
    };
  }, [baseUrl]);

  return <ElevoConfigProvider value={config}>{children}</ElevoConfigProvider>;
}
