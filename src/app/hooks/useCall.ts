import { Room } from 'matrix-js-sdk';
import {
  MatrixRTCSession,
  MatrixRTCSessionEvent,
} from 'matrix-js-sdk/lib/matrixrtc/MatrixRTCSession';
import { CallMembership } from 'matrix-js-sdk/lib/matrixrtc/CallMembership';
import { useEffect, useState } from 'react';
import { MatrixRTCSessionManagerEvents } from 'matrix-js-sdk/lib/matrixrtc/MatrixRTCSessionManager';
import { useMatrixClient } from './useMatrixClient';

export const useCallSession = (room: Room): MatrixRTCSession => {
  const mx = useMatrixClient();

  const [session, setSession] = useState(mx.matrixRTC.getRoomSession(room));

  useEffect(() => {
    const start = (roomId: string) => {
      if (roomId !== room.roomId) return;
      setSession(mx.matrixRTC.getRoomSession(room));
    };
    const end = (roomId: string) => {
      if (roomId !== room.roomId) return;
      setSession(mx.matrixRTC.getRoomSession(room));
    };
    mx.matrixRTC.on(MatrixRTCSessionManagerEvents.SessionStarted, start);
    mx.matrixRTC.on(MatrixRTCSessionManagerEvents.SessionEnded, end);
    return () => {
      mx.matrixRTC.off(MatrixRTCSessionManagerEvents.SessionStarted, start);
      mx.matrixRTC.off(MatrixRTCSessionManagerEvents.SessionEnded, end);
    };
  }, [mx, room]);

  return session;
};

export const useCallMembers = (room: Room, session: MatrixRTCSession): CallMembership[] => {
  const [memberships, setMemberships] = useState<CallMembership[]>([]);

  useEffect(() => {
    let disposed = false;
    let requestId = 0;

    const updateMemberships = async () => {
      requestId += 1;
      const currentRequestId = requestId;

      try {
        const nextMemberships = await MatrixRTCSession.sessionMembershipsForSlot(room, session.slotDescription);

        if (!disposed && currentRequestId === requestId) {
          setMemberships(nextMemberships);
        }
      } catch {
        // Keep current value when fetching memberships fails.
      }
    };

    updateMemberships().catch(() => undefined);

    const onMembershipsChanged = () => {
      updateMemberships().catch(() => undefined);
    };

    session.on(MatrixRTCSessionEvent.MembershipsChanged, onMembershipsChanged);
    return () => {
      disposed = true;
      session.removeListener(MatrixRTCSessionEvent.MembershipsChanged, onMembershipsChanged);
    };
  }, [session, room]);

  return memberships;
};

export const useCallMembersChange = (session: MatrixRTCSession, callback: () => void): void => {
  useEffect(() => {
    session.on(MatrixRTCSessionEvent.MembershipsChanged, callback);
    return () => {
      session.removeListener(MatrixRTCSessionEvent.MembershipsChanged, callback);
    };
  }, [session, callback]);
};
