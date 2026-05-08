import { ReactNode, useCallback } from 'react';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import {
  getExplorePath,
  getHomePath,
  getInboxPath,
} from '../pages/pathUtils';
import { EXPLORE_PATH, HOME_PATH, INBOX_PATH, TODOS_PATH } from '../pages/paths';

type BackRouteHandlerProps = {
  children: (onBack: () => void) => ReactNode;
};
export function BackRouteHandler({ children }: BackRouteHandlerProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const goBack = useCallback(() => {
    if (
      matchPath(
        {
          path: HOME_PATH,
          caseSensitive: true,
          end: false,
        },
        location.pathname
      )
    ) {
      navigate(getHomePath());
      return;
    }
    if (
      matchPath(
        {
          path: EXPLORE_PATH,
          caseSensitive: true,
          end: false,
        },
        location.pathname
      )
    ) {
      navigate(getExplorePath());
      return;
    }
    if (
      matchPath(
        {
          path: INBOX_PATH,
          caseSensitive: true,
          end: false,
        },
        location.pathname
      )
    ) {
      navigate(getInboxPath());
      return;
    }
    if (
      matchPath(
        {
          path: TODOS_PATH,
          caseSensitive: true,
          end: false,
        },
        location.pathname
      )
    ) {
      navigate(getHomePath());
    }
  }, [navigate, location]);

  return children(goBack);
}
