import { JoinRule } from 'matrix-js-sdk';
import { AvatarFallback, AvatarImage, Icon, Icons, color } from 'folds';
import React, { ComponentProps, ReactEventHandler, ReactNode, forwardRef, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import * as css from './RoomAvatar.css';
import { getRoomIconSrc } from '../../utils/room';
import colorMXID from '../../../util/colorMXID';
import { useAuthenticatedMediaUrl } from '../../hooks/useAuthenticatedMediaUrl';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { mDirectAtom } from '../../state/mDirectList';

type RoomAvatarProps = {
  roomId: string;
  src?: string;
  alt?: string;
  fallbackAsIcon?: ReactNode;
  renderFallback: () => ReactNode;
};
export function RoomAvatar({ roomId, src, alt, fallbackAsIcon, renderFallback }: RoomAvatarProps) {
  const mx = useMatrixClient();
  const mDirects = useAtomValue(mDirectAtom);
  const room = mx.getRoom(roomId);
  const isDirect = mDirects.has(roomId);

  const [error, setError] = useState(false);
  const authSrc = useAuthenticatedMediaUrl(src);

  const colorId = useMemo(() => {
    if ((!authSrc || error) && isDirect) {
      const avatarMember = room?.getAvatarFallbackMember();
      if (avatarMember) {
        return avatarMember.userId;
      }
    }
    return roomId;
  }, [authSrc, error, isDirect, room, roomId]);

  const handleLoad: ReactEventHandler<HTMLImageElement> = (evt) => {
    evt.currentTarget.setAttribute('data-image-loaded', 'true');
  };

  if (!authSrc || error) {
    if (fallbackAsIcon) {
      return fallbackAsIcon;
    }
    return (
      <AvatarFallback
        style={{ backgroundColor: colorMXID(colorId ?? ''), color: color.Surface.Container }}
        className={css.RoomAvatar}
      >
        {renderFallback()}
      </AvatarFallback>
    );
  }

  return (
    <AvatarImage
      className={css.RoomAvatar}
      src={authSrc}
      alt={alt}
      onError={() => setError(true)}
      onLoad={handleLoad}
      draggable={false}
    />
  );
}

export const RoomIcon = forwardRef<
  SVGSVGElement,
  Omit<ComponentProps<typeof Icon>, 'src'> & {
    joinRule?: JoinRule;
    roomType?: string;
  }
>(({ joinRule, roomType, ...props }, ref) => (
  <Icon src={getRoomIconSrc(Icons, roomType, joinRule)} {...props} ref={ref} />
));
