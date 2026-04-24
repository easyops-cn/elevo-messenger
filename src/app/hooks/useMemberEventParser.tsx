import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MatrixEvent, type Room } from 'matrix-js-sdk';
import { IMemberContent, Membership } from '../../types/matrix/room';
import { getMxIdLocalPart } from '../utils/matrix';
import { getMemberDisplayName, isMembershipChanged } from '../utils/room';

export type ParsedResult = {
  body: ReactNode;
};

export type MemberEventParser = (mEvent: MatrixEvent) => ParsedResult;

export const useMemberEventParser = (room: Room): MemberEventParser => {
  const { t } = useTranslation();

  const parseMemberEvent: MemberEventParser = (mEvent) => {
    const content = mEvent.getContent<IMemberContent>();
    const prevContent = mEvent.getPrevContent() as IMemberContent;
    const senderId = mEvent.getSender();
    const userId = mEvent.getStateKey();
    const reason = typeof content.reason === 'string' ? content.reason : undefined;

    if (!senderId || !userId)
      return {
        body: t('memberEvent.brokenEvent'),
      };

    const senderName = getMemberDisplayName(room, senderId) ?? getMxIdLocalPart(senderId);
    const userName = getMemberDisplayName(room, userId) ?? (
      typeof content.displayname === 'string' && content.displayname
        ? content.displayname
        : getMxIdLocalPart(userId)
    );

    if (isMembershipChanged(mEvent)) {
      if (content.membership === Membership.Invite) {
        if (prevContent.membership === Membership.Knock) {
          return {
            body: t('memberEvent.acceptedKnock', { senderName, userName, reason }),
          };
        }

        return {
          body: t('memberEvent.invited', { senderName, userName, reason }),
        };
      }

      if (content.membership === Membership.Knock) {
        return {
          body: t('memberEvent.knocked', { userName, reason }),
        };
      }

      if (content.membership === Membership.Join) {
        return {
          body: t('memberEvent.joined', { userName }),
        };
      }

      if (content.membership === Membership.Leave) {
        if (prevContent.membership === Membership.Invite) {
          if (senderId === userId) {
            return {
              body: t('memberEvent.rejectedInvite', { userName, reason }),
            };
          }
          return {
            body: t('memberEvent.rejectedKnock', { senderName, userName, reason }),
          };
        }

        if (prevContent.membership === Membership.Knock) {
          if (senderId === userId) {
            return {
              body: t('memberEvent.revokedKnock', { userName, reason }),
            };
          }
          return {
            body: t('memberEvent.revokedInvite', { senderName, userName, reason }),
          };
        }

        if (prevContent.membership === Membership.Ban) {
          return {
            body: t('memberEvent.unbanned', { senderName, userName, reason }),
          };
        }

        if (senderId === userId) {
          return {
            body: t('memberEvent.left', { userName, reason }),
          };
        }
        return {
          body: t('memberEvent.kicked', { senderName, userName, reason }),
        };
      }

      if (content.membership === Membership.Ban) {
        return {
          body: t('memberEvent.banned', { senderName, userName, reason }),
        };
      }
    }

    if (content.displayname !== prevContent.displayname) {
      const prevUserName =
        typeof prevContent.displayname === 'string' && prevContent.displayname
          ? prevContent.displayname
          : getMxIdLocalPart(userId);

      if (typeof content.displayname === 'string') {
        return {
          body: t('memberEvent.changedDisplayName', { prevUserName, userName }),
        };
      }
      return {
        body: t('memberEvent.removedDisplayName', { prevUserName }),
      };
    }

    if (content.avatar_url !== prevContent.avatar_url) {
      if (content.avatar_url && typeof content.avatar_url === 'string') {
        return {
          body: t('memberEvent.changedAvatar', { userName }),
        };
      }
      return {
        body: t('memberEvent.removedAvatar', { userName }),
      };
    }

    return {
      body: t('memberEvent.noChanges'),
    };
  };

  return parseMemberEvent;
};
