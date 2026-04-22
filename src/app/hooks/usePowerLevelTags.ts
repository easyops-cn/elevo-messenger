import { Room } from 'matrix-js-sdk';
import { useMemo } from 'react';
import { IPowerLevels } from './usePowerLevels';
import { MemberPowerTag } from '../../types/matrix/room';

export type PowerLevelTags = Record<number, MemberPowerTag>;

const powerSortFn = (a: number, b: number) => b - a;
const sortPowers = (powers: number[]): number[] => powers.sort(powerSortFn);

export const getPowers = (tags: PowerLevelTags): number[] => {
  const powers: number[] = Object.keys(tags)
    .map((p) => {
      const power = parseInt(p, 10);
      if (Number.isNaN(power)) {
        return undefined;
      }
      return power;
    })
    .filter((power) => typeof power === 'number');

  return sortPowers(powers);
};

export const getUsedPowers = (powerLevels: IPowerLevels): Set<number> => {
  const powers: Set<number> = new Set();

  const findAndAddPower = (data: Record<string, unknown>) => {
    Object.keys(data).forEach((key) => {
      const powerOrAny: unknown = data[key];

      if (typeof powerOrAny === 'number') {
        powers.add(powerOrAny);
        return;
      }
      if (powerOrAny && typeof powerOrAny === 'object') {
        findAndAddPower(powerOrAny as Record<string, unknown>);
      }
    });
  };

  findAndAddPower(powerLevels);

  return powers;
};

const DEFAULT_TAGS: PowerLevelTags = {
  150: {
    name: 'Owner',
  },
  100: {
    name: 'Admin',
  },
  50: {
    name: 'Moderator',
  },
  0: {
    name: 'Member',
  },
  [-1]: {
    name: 'Muted',
  },
};

export const BADGE_LABEL_KEYS: Record<string, string> = {
  Creator: 'room.badgeCreator',
  Owner: 'room.badgeOwner',
  Admin: 'room.badgeAdmin',
  Moderator: 'room.badgeModerator',
};

const generateFallbackTag = (powerLevelTags: PowerLevelTags, power: number): MemberPowerTag => {
  const highToLow = sortPowers(getPowers(powerLevelTags));

  const tagPower = highToLow.find((p) => p < power);
  const tag = typeof tagPower === 'number' ? powerLevelTags[tagPower] : undefined;

  return {
    name: tag ? `${tag.name} ${power}` : `Team ${power}`,
  };
};

export const usePowerLevelTags = (room: Room, powerLevels: IPowerLevels): PowerLevelTags => {
  const powerLevelTags: PowerLevelTags = useMemo(() => {
    const powerToTags: PowerLevelTags = {};

    const powers = getUsedPowers(powerLevels);
    Array.from(powers).forEach((power) => {
      if (powerToTags[power]?.name === undefined) {
        powerToTags[power] = DEFAULT_TAGS[power] ?? generateFallbackTag(DEFAULT_TAGS, power);
      }
    });

    return powerToTags;
  }, [powerLevels]);

  return powerLevelTags;
};

export const getPowerLevelTag = (
  powerLevelTags: PowerLevelTags,
  powerLevel: number
): MemberPowerTag => {
  const tag: MemberPowerTag | undefined = powerLevelTags[powerLevel];
  return tag ?? generateFallbackTag(powerLevelTags, powerLevel);
};
