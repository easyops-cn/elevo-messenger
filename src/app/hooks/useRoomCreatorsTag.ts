import { MemberPowerTag } from '../../types/matrix/room';

const DEFAULT_TAG: MemberPowerTag = {
  name: 'Creator',
};

export const useRoomCreatorsTag = (): MemberPowerTag => DEFAULT_TAG;
