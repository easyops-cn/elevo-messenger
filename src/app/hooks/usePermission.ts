import { useCallback, useEffect, useState } from 'react';
import { getNotificationPermission } from '../utils/notification';

export const getNotificationState = (): PermissionState => 'prompt';

export function useNotificationPermissionState(initialValue: PermissionState = 'prompt') {
  const [permissionState, setPermissionState] = useState<PermissionState>(initialValue);

  const refreshPermissionState = useCallback(() => {
    getNotificationPermission()
      .then(setPermissionState)
      .catch(() => {
        setPermissionState('denied');
      });
  }, []);

  useEffect(() => {
    refreshPermissionState();

    const focusHandler = () => {
      refreshPermissionState();
    };
    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        refreshPermissionState();
      }
    };

    window.addEventListener('focus', focusHandler);
    document.addEventListener('visibilitychange', visibilityHandler);

    return () => {
      window.removeEventListener('focus', focusHandler);
      document.removeEventListener('visibilitychange', visibilityHandler);
    };
  }, [refreshPermissionState]);

  return permissionState;
}

export function usePermissionState(name: PermissionName, initialValue: PermissionState = 'prompt') {
  const [permissionState, setPermissionState] = useState<PermissionState>(initialValue);

  useEffect(() => {
    let permissionStatus: PermissionStatus;

    function handlePermissionChange(this: PermissionStatus) {
      setPermissionState(this.state);
    }

    navigator.permissions
      .query({ name })
      .then((permStatus: PermissionStatus) => {
        permissionStatus = permStatus;
        handlePermissionChange.apply(permStatus);
        permStatus.addEventListener('change', handlePermissionChange);
      })
      .catch(() => {
        // Silence error since FF doesn't support microphone permission
      });

    return () => {
      permissionStatus?.removeEventListener('change', handlePermissionChange);
    };
  }, [name]);

  return permissionState;
}
