import { useEffect, useState } from 'react';
import { UserEvent, UserEventHandlerMap } from 'matrix-js-sdk';
import { useQuery } from '@tanstack/react-query';
import { useMatrixClient } from './useMatrixClient';

export type UserProfile = {
  avatarUrl?: string;
  displayName?: string;
};
export const useUserProfile = (userId: string): UserProfile => {
  const mx = useMatrixClient();

  const { data: fetchedProfile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const info = await mx.getProfileInfo(userId);
      return {
        avatarUrl: info.avatar_url,
        displayName: info.displayname,
      } as UserProfile;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const [profile, setProfile] = useState<UserProfile>(() => {
    if (fetchedProfile) return fetchedProfile;
    const user = mx.getUser(userId);
    return {
      avatarUrl: user?.avatarUrl,
      displayName: user?.displayName,
    };
  });

  useEffect(() => {
    if (fetchedProfile) {
      setProfile(fetchedProfile);
    }
  }, [fetchedProfile]);

  useEffect(() => {
    const user = mx.getUser(userId);
    const onAvatarChange: UserEventHandlerMap[UserEvent.AvatarUrl] = (event, myUser) => {
      setProfile((cp) => ({
        ...cp,
        avatarUrl: myUser.avatarUrl,
      }));
    };
    const onDisplayNameChange: UserEventHandlerMap[UserEvent.DisplayName] = (event, myUser) => {
      setProfile((cp) => ({
        ...cp,
        displayName: myUser.displayName,
      }));
    };

    user?.on(UserEvent.AvatarUrl, onAvatarChange);
    user?.on(UserEvent.DisplayName, onDisplayNameChange);
    return () => {
      user?.removeListener(UserEvent.AvatarUrl, onAvatarChange);
      user?.removeListener(UserEvent.DisplayName, onDisplayNameChange);
    };
  }, [mx, userId]);

  return profile;
};
