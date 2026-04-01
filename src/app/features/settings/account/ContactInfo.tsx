import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Text, Chip } from 'folds';
import { useQuery } from '@tanstack/react-query';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { useMatrixClient } from '../../../hooks/useMatrixClient';

export function ContactInformation() {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const { data } = useQuery({
    queryKey: ['threePIds'],
    queryFn: () => mx.getThreePids(),
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const threePIds = data?.threepids;

  const emailIds = threePIds?.filter((id) => id.medium === 'email');

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">{t('settings.accountSettings.contactInfo')}</Text>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <SettingTile
          title={t('settings.accountSettings.emailAddress')}
          description={t('settings.accountSettings.emailAddressDesc')}
        >
          <Box>
            {emailIds?.map((email) => (
              <Chip key={email.address} as="span" variant="Secondary" radii="Pill">
                <Text size="T200">{email.address}</Text>
              </Chip>
            ))}
          </Box>
          {/* <Input defaultValue="" variant="Secondary" radii="300" /> */}
        </SettingTile>
      </SequenceCard>
    </Box>
  );
}
