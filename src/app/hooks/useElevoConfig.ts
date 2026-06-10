import { createContext, useContext } from 'react';

export type TenantConfig = {
  id: string;
  name: string;
  tasks_template_url?: string;
  tasks_web_template_url?: string;
};

export type OAuthConfig = {
  clientId: string;
};

export type BridgeProviderConfig = {
  id: string;
  name: string;
};

export type FeatureConfig = {
  federation: boolean;
  deviceVerification: boolean;
  encryption: boolean;
  call: boolean;
  roomVersion: boolean;
};

export type WorkspacesConfig = {
  apiBaseUrl?: string;
  explorerUrl?: string;
  bridgeProvider?: BridgeProviderConfig;
  tenants?: TenantConfig[];
  oauth?: OAuthConfig;
};

export type CustomCommandConfig = {
  name: string;
  description: string;
};

export type CommandsConfig = {
  '*'?: boolean;
  [commandName: string]: boolean | CustomCommandConfig | undefined;
};

export type ElevoConfig = {
  workspaces?: WorkspacesConfig;
  features: FeatureConfig;
  oidcStaticClients?: Record<string, { client_id: string }>;
  elevoContactsRoomId?: string;
  todos?: {
    api: string;
  };
  commands?: CommandsConfig;
};

export const DEFAULT_ELEVO_FEATURES: FeatureConfig = {
  federation: true,
  deviceVerification: true,
  encryption: true,
  call: true,
  roomVersion: true,
};

export const DEFAULT_ELEVO_CONFIG: ElevoConfig = {
  features: DEFAULT_ELEVO_FEATURES,
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
  server: string,
): string | undefined => elevoConfig.oidcStaticClients?.[server]?.client_id;
