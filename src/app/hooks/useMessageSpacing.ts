import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSpacing } from '../state/settings';

export type MessageSpacingItem = {
  name: string;
  spacing: MessageSpacing;
};

export const useMessageSpacingItems = (): MessageSpacingItem[] => {
  const { t } = useTranslation();

  return useMemo(
    () => [
      {
        spacing: '0',
        name: t('settings.messages.messageSpacingOptions.none'),
      },
      {
        spacing: '100',
        name: t('settings.messages.messageSpacingOptions.ultraSmall'),
      },
      {
        spacing: '200',
        name: t('settings.messages.messageSpacingOptions.extraSmall'),
      },
      {
        spacing: '300',
        name: t('settings.messages.messageSpacingOptions.small'),
      },
      {
        spacing: '400',
        name: t('settings.messages.messageSpacingOptions.normal'),
      },
      {
        spacing: '500',
        name: t('settings.messages.messageSpacingOptions.large'),
      },
    ],
    [t]
  );
};
