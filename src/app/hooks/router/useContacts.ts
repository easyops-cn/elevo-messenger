import { useMatch } from 'react-router-dom';
import { getContactsContactsPath, getContactsPath } from '../../pages/pathUtils';
import { CONTACTS_ROLE_PATH } from '../../pages/paths';

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

export const useContactsRoleSelected = (): string | null => {
  const match = useMatch({
    path: CONTACTS_ROLE_PATH,
    caseSensitive: true,
    end: false,
  });
  return match ? decodeURIComponent((match.params as { roleName?: string }).roleName ?? '') : null;
};
