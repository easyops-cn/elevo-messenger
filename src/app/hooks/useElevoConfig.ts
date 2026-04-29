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

export type FeatureConfig = {
  federation: boolean;
  deviceVerification: boolean;
  encryption: boolean;
};

export type WorkspacesConfig = {
  apiBaseUrl?: string;
  explorerUrl?: string;
  tenants?: TenantConfig[];
  oauth?: OAuthConfig;
};

export type ElevoConfig = {
  workspaces?: WorkspacesConfig;
  features: FeatureConfig;
  oidcStaticClients?: Record<string, { client_id: string }>;
  elevoContactsRoomId?: string;
};

export const DEFAULT_ELEVO_FEATURES: FeatureConfig = {
  federation: true,
  deviceVerification: true,
  encryption: true,
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
  server: string
): string | undefined => elevoConfig.oidcStaticClients?.[server]?.client_id;
