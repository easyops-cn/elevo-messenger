import { useMatch } from 'react-router-dom';
import {
  getMeInvitesPath,
  getMeNotificationsPath,
  getMePath,
} from '../../pages/pathUtils';

export const useMeSelected = (): boolean => {
  const match = useMatch({
    path: getMePath(),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};

export const useMeNotificationsSelected = (): boolean => {
  const match = useMatch({
    path: getMeNotificationsPath(),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};

export const useMeInvitesSelected = (): boolean => {
  const match = useMatch({
    path: getMeInvitesPath(),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};
