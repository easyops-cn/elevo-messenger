import React, { ReactNode, useEffect, useState } from 'react';
import { fetchElevoConfig } from './ElevoConfigLoader';
import { ElevoConfig, ElevoConfigProvider } from '../hooks/useElevoConfig';

type AuthElevoConfigLoaderProps = {
  baseUrl: string;
  children: ReactNode;
};

export function AuthElevoConfigLoader({ baseUrl, children }: AuthElevoConfigLoaderProps) {
  const [config, setConfig] = useState<ElevoConfig>({});

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
