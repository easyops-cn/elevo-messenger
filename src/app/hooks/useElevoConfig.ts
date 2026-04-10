import { createContext, useContext } from 'react';

export type TenantConfig = {
  id: string;
  name: string;
  tasks_template_url?: string;
  tasks_web_template_url?: string;
};

export type WorkspacesConfig = {
  apiBaseUrl?: string;
  explorerUrl?: string;
  apiKey?: string;
  tenants?: TenantConfig[];
};

export type ElevoConfig = {
  workspaces?: WorkspacesConfig;
  oidcStaticClients?: Record<string, { client_id: string }>;
  elevoContactsRoomId?: string;
};

const ElevoConfigContext = createContext<ElevoConfig | null>(null);

export const ElevoConfigProvider = ElevoConfigContext.Provider;

export function useElevoConfig(): ElevoConfig {
  const config = useContext(ElevoConfigContext);
  if (!config) throw new Error('Elevo config not provided!');
  return config;
}

export const getOidcStaticClientId = (
  elevoConfig: ElevoConfig,
  server: string
): string | undefined => elevoConfig.oidcStaticClients?.[server]?.client_id;
