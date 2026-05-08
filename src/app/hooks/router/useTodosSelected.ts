import { useMatch } from 'react-router-dom';
import { getTodosPath } from '../../pages/pathUtils';

export const useTodosSelected = (): boolean => {
  const match = useMatch({
    path: getTodosPath(),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};
