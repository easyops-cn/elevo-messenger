import React, { useEffect, useMemo, useState } from 'react';
import { Box, Icon, IconButton, Scroll, Text } from 'folds';
import { useTranslation } from 'react-i18next';
import { FolderOpenIcon } from '../../icons/FolderOpenIcon';
import { RefreshCwIcon } from '../../icons/RefreshCwIcon';
import { BridgeExplorerProvider, createContextValue } from './BridgeExplorerContext';
import { FileTree } from './FileTree';
import { FileViewer } from './FileViewer';
import { BRIDGE_EXPLORER_SELECT_FILE_CHANNEL, onSdkMessage } from './sdkBridge';
import { getRememberedSelectedPath, rememberSelectedPath } from './selectedPathMemory';
import type { BridgeExplorerPayload } from './types';
import * as css from './BridgeExplorer.css';

type BridgeExplorerProps = {
  payload: BridgeExplorerPayload;
};

export function BridgeExplorer({ payload }: BridgeExplorerProps) {
  const { t } = useTranslation();
  const ctx = useMemo(() => createContextValue(payload), [payload]);
  const [selectedPath, setSelectedPath] = useState<string | null>(() =>
    getRememberedSelectedPath(payload.workspaceId, payload.initialFilePath ?? null),
  );

  // The main window can push a new file selection to an already-open window.
  useEffect(
    () =>
      onSdkMessage(BRIDGE_EXPLORER_SELECT_FILE_CHANNEL, (data) => {
        if (typeof data === 'string' && data.length > 0) {
          setSelectedPath(data);
        }
      }),
    [],
  );

  useEffect(() => {
    rememberSelectedPath(payload.workspaceId, selectedPath);
  }, [payload.workspaceId, selectedPath]);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <BridgeExplorerProvider value={ctx}>
      <Box className={css.Shell} direction="Column">
        <Box className={css.Header} shrink="No" alignItems="Center" gap="200">
          <Icon size="100" src={FolderOpenIcon} />
          <Text className={css.HeaderTitle} size="H6" truncate title={ctx.workspaceName}>
            {ctx.workspaceName}
          </Text>
          <IconButton
            size="300"
            variant="Surface"
            radii="300"
            title={t('bridgeExplorer.refresh')}
            aria-label={t('bridgeExplorer.refresh')}
            onClick={handleRefresh}
          >
            <Icon size="100" src={RefreshCwIcon} />
          </IconButton>
        </Box>
        <Box className={css.Body} grow="Yes">
          <Box className={css.Sidebar} direction="Column">
            <Scroll className={css.TreeScroll} size="300" hideTrack visibility="Hover">
              <FileTree selectedPath={selectedPath} onSelectFile={setSelectedPath} />
            </Scroll>
          </Box>
          <FileViewer path={selectedPath} />
        </Box>
      </Box>
    </BridgeExplorerProvider>
  );
}
