import React, { MouseEventHandler, useCallback, useMemo, useState } from 'react';
import { Box, Chip, Spinner, Text, config } from 'folds';
import { Room } from 'matrix-js-sdk';
import { useTranslation } from 'react-i18next';

import * as css from './RoomSidePanel.css';
import { ThreadMenuItem } from './ThreadMenuItem';
import { useRoomThreads } from '../../hooks/useRoomThreads';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useThreadChat } from '../../state/threadChat';

type ThreadsPanelProps = {
  room: Room;
};

const THREAD_PREVIEW_THRESHOLD = 10;

export function ThreadsPanel({ room }: ThreadsPanelProps) {
  const { t } = useTranslation();
  const useAuthentication = useMediaAuthentication();
  const [, setThreadChat] = useThreadChat(room.roomId);
  const [showAllThreads, setShowAllThreads] = useState(false);

  const { threads, loading, error, retry } = useRoomThreads(room);

  const sortedThreads = useMemo(() => (
    [...threads].sort((a, b) => {
      const aTs = a.replyToEvent?.getTs() ?? a.rootEvent?.getTs() ?? 0;
      const bTs = b.replyToEvent?.getTs() ?? b.rootEvent?.getTs() ?? 0;
      return bTs - aTs;
    })
  ), [threads]);

  const shouldShowThreadsPreview = !showAllThreads && sortedThreads.length > THREAD_PREVIEW_THRESHOLD;
  const displayThreads = shouldShowThreadsPreview
    ? sortedThreads.slice(0, THREAD_PREVIEW_THRESHOLD - 1)
    : sortedThreads;

  const handleThreadClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (evt) => {
      const rootId = evt.currentTarget.getAttribute('data-event-id');
      if (!rootId) return;

      setThreadChat({ open: true, threadRootId: rootId });
    },
    [setThreadChat]
  );

  return (
    <Box direction="Column" gap="100">
      <Text className={css.MembersGroupLabel} size="L400" priority="300">
        {t('room.threads')}
      </Text>

      {loading && (
        <Box justifyContent="Center" style={{ padding: config.space.S200 }}>
          <Spinner />
        </Box>
      )}

      {!loading && error && (
        <Box
          direction="Column"
          alignItems="Center"
          gap="100"
          style={{ padding: config.space.S300 }}
        >
          <Text align="Center" size="T300" priority="300">
            {t('room.threadsLoadFailed')}
          </Text>
          <Chip as="button" variant="SurfaceVariant" size="400" radii="300" onClick={retry}>
            <Text size="T200">{t('common.retry')}</Text>
          </Chip>
        </Box>
      )}

      {!loading && !error && sortedThreads.length === 0 && (
        <Text style={{ padding: config.space.S300 }} align="Center" size="T200" priority="300">
          {t('room.noThreads')}
        </Text>
      )}

      {!loading && !error && sortedThreads.length > 0 && (
        <>
          <Box direction="Column" gap="200">
            {displayThreads.map((thread) => (
              <ThreadMenuItem
                key={thread.id}
                useAuthentication={useAuthentication}
                room={room}
                thread={thread}
                onClick={handleThreadClick}
              />
            ))}
          </Box>

          {shouldShowThreadsPreview && (
            <Box justifyContent="Center">
              <Chip
                as="button"
                variant="SurfaceVariant"
                fill="None"
                size="500"
                radii="300"
                onClick={() => setShowAllThreads(true)}
              >
                <Text size="T200">{`${t('room.viewAllThreads')} (${sortedThreads.length})`}</Text>
              </Chip>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
