import { useMatch } from 'react-router-dom';
import { getContactsContactsPath, getContactsPath } from '../../pages/pathUtils';

export const useContactsSelected = (): boolean => {
  const match = useMatch({
    path: getContactsPath(),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};

export const useContactsContactsSelected = (): boolean => {
  const match = useMatch({
    path: getContactsContactsPath(),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};
