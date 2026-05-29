import 'matrix-js-sdk/lib/@types/event';
import type { EmptyObject } from 'matrix-js-sdk/lib/@types/common';
import type { PackContent, EmoteRoomsContent } from '../../app/plugins/custom-emoji/types';
import type { LinksContent } from './accountData';

declare module 'matrix-js-sdk/lib/@types/event' {
  interface StateEvents {
    'im.ponies.room_emotes': PackContent;
  }

  interface RoomAccountDataEvents {
    [eventType: string]: object;
  }

  interface AccountDataEvents {
    'im.ponies.user_emotes': PackContent;
    'im.ponies.emote_rooms': EmoteRoomsContent;
    'io.element.recent_emoji': {
      recent_emoji?: [string, number][];
    };
    'vip.elevo.links': LinksContent;
    [eventType: string]: object | EmptyObject;
  }
}
