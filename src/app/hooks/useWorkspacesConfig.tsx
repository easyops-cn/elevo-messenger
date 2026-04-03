import { createContext, useContext } from 'react';

export type WorkspacesConfig = {
  apiBaseUrl?: string;
  explorerUrl?: string;
};

const WorkspacesConfigContext = createContext<WorkspacesConfig | null>(null);

export const WorkspacesConfigProvider = WorkspacesConfigContext.Provider;

export function useWorkspacesConfig(): WorkspacesConfig {
  const config = useContext(WorkspacesConfigContext);
  if (!config) throw new Error('Workspaces config not provided!');
  return config;
}
