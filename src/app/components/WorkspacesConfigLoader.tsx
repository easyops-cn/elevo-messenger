import React, { ReactNode, useEffect, useState } from 'react';
import { MatrixClient } from 'matrix-js-sdk';
import { WorkspacesConfig, WorkspacesConfigProvider } from '../hooks/useWorkspacesConfig';

type WorkspacesConfigLoaderProps = {
  mx: MatrixClient;
  children: ReactNode;
};

const fetchWorkspacesConfig = async (mx: MatrixClient): Promise<WorkspacesConfig> => {
  const baseUrl = mx.getHomeserverUrl().replace(/\/+$/, '');
  try {
    const res = await fetch(`${baseUrl}/.well-known/elevo-messenger/workspaces`);
    if (!res.ok) return {};
    const data = await res.json();
    return {
      apiBaseUrl: data.api?.base_url,
      explorerUrl: data.explorer?.base_url,
      apiKey: data.api?.api_key,
      tasksTemplateUrl: data.tasks?.template_url,
    };
  } catch {
    return {};
  }
};

export function WorkspacesConfigLoader({ mx, children }: WorkspacesConfigLoaderProps) {
  const [config, setConfig] = useState<WorkspacesConfig>({});

  useEffect(() => {
    let cancelled = false;
    fetchWorkspacesConfig(mx).then((result) => {
      if (!cancelled) setConfig(result);
    });
    return () => {
      cancelled = true;
    };
  }, [mx]);

  return <WorkspacesConfigProvider value={config}>{children}</WorkspacesConfigProvider>;
}
