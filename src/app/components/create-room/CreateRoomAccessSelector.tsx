import React from 'react';
import { Box, Text, Icon, Icons, config, IconSrc } from 'folds';
import { useTranslation } from 'react-i18next';
import { SequenceCard } from '../sequence-card';
import { SettingTile } from '../setting-tile';
import { CreateRoomAccess } from './types';

type CreateRoomAccessSelectorProps = {
  value?: CreateRoomAccess;
  onSelect: (value: CreateRoomAccess) => void;
  canRestrict?: boolean;
  disabled?: boolean;
  getIcon: (access: CreateRoomAccess) => IconSrc;
};
export function CreateRoomAccessSelector({
  value,
  onSelect,
  canRestrict,
  disabled,
  getIcon,
}: CreateRoomAccessSelectorProps) {
  const { t } = useTranslation();
  return (
    <Box shrink="No" direction="Column" gap="100">
      {canRestrict && (
        <SequenceCard
          style={{ padding: config.space.S300 }}
          variant="SurfaceVariant"
          direction="Column"
          gap="100"
          as="button"
          type="button"
          aria-pressed={value === CreateRoomAccess.Restricted}
          onClick={() => onSelect(CreateRoomAccess.Restricted)}
          disabled={disabled}
        >
          <SettingTile
            before={<Icon size="400" src={getIcon(CreateRoomAccess.Restricted)} />}
            after={value === CreateRoomAccess.Restricted && <Icon src={Icons.Check} />}
          >
            <Text size="H6">{t('create.restricted')}</Text>
            <Text size="T300" priority="300">
              {t('create.restrictedDesc')}
            </Text>
          </SettingTile>
        </SequenceCard>
      )}
      <SequenceCard
        style={{ padding: config.space.S300 }}
        variant="SurfaceVariant"
        direction="Column"
        gap="100"
        as="button"
        type="button"
        aria-pressed={value === CreateRoomAccess.Private}
        onClick={() => onSelect(CreateRoomAccess.Private)}
        disabled={disabled}
      >
        <SettingTile
          before={<Icon size="400" src={getIcon(CreateRoomAccess.Private)} />}
          after={value === CreateRoomAccess.Private && <Icon src={Icons.Check} />}
        >
          <Text size="H6">{t('create.private')}</Text>
          <Text size="T300" priority="300">
            {t('create.privateDesc')}
          </Text>
        </SettingTile>
      </SequenceCard>
      <SequenceCard
        style={{ padding: config.space.S300 }}
        variant="SurfaceVariant"
        direction="Column"
        gap="100"
        as="button"
        type="button"
        aria-pressed={value === CreateRoomAccess.Public}
        onClick={() => onSelect(CreateRoomAccess.Public)}
        disabled={disabled}
      >
        <SettingTile
          before={<Icon size="400" src={getIcon(CreateRoomAccess.Public)} />}
          after={value === CreateRoomAccess.Public && <Icon src={Icons.Check} />}
        >
          <Text size="H6">{t('create.public')}</Text>
          <Text size="T300" priority="300">
            {t('create.publicDesc')}
          </Text>
        </SettingTile>
      </SequenceCard>
    </Box>
  );
}
