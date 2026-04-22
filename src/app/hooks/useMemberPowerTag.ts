import { useCallback, useMemo } from 'react';
import { Room, RoomMember } from 'matrix-js-sdk';
import { getPowerLevelTag, usePowerLevelTags } from './usePowerLevelTags';
import { IPowerLevels, readPowerLevel } from './usePowerLevels';
import { MemberPowerTag } from '../../types/matrix/room';
import { useRoomCreatorsTag } from './useRoomCreatorsTag';

export type GetMemberPowerTag = (userId: string) => MemberPowerTag;

export const useGetMemberPowerTag = (
  room: Room,
  creators: Set<string>,
  powerLevels: IPowerLevels
) => {
  const creatorsTag = useRoomCreatorsTag();
  const powerLevelTags = usePowerLevelTags(room, powerLevels);

  const getMemberPowerTag: GetMemberPowerTag = useCallback(
    (userId) => {
      if (creators.has(userId)) {
        return creatorsTag;
      }

      const power = readPowerLevel.user(powerLevels, userId);
      return getPowerLevelTag(powerLevelTags, power);
    },
    [creators, creatorsTag, powerLevels, powerLevelTags]
  );

  return getMemberPowerTag;
};

export const useFlattenPowerTagMembers = (
  members: RoomMember[],
  getTag: GetMemberPowerTag
): Array<MemberPowerTag | RoomMember> => {
  const PLTagOrRoomMember = useMemo(() => {
    let prevTag: MemberPowerTag | undefined;
    const tagOrMember: Array<MemberPowerTag | RoomMember> = [];
    members.forEach((member) => {
      const tag = getTag(member.userId);
      if (tag !== prevTag) {
        prevTag = tag;
        tagOrMember.push(tag);
      }
      tagOrMember.push(member);
    });
    return tagOrMember;
  }, [members, getTag]);

  return PLTagOrRoomMember;
};
