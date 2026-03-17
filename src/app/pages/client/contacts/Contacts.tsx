import React from 'react';
import { Avatar, Box, Icon, Text } from 'folds';
import { useTranslation } from 'react-i18next';
import { UsersIcon } from '../../../icons/UsersIcon';
import { NavCategory, NavItem, NavItemContent, NavLink } from '../../../components/nav';
import { getContactsContactsPath } from '../../pathUtils';
import { useContactsContactsSelected } from '../../../hooks/router/useContacts';
import { useNavToActivePathMapper } from '../../../hooks/useNavToActivePathMapper';
import { PageNav, PageNavContent, PageNavHeader } from '../../../components/page';

export function Contacts() {
  const { t } = useTranslation();
  useNavToActivePathMapper('contacts');
  const contactsSelected = useContactsContactsSelected();

  return (
    <PageNav>
      <PageNavHeader>
        <Box grow="Yes" gap="300">
          <Box grow="Yes">
            <Text size="H4" truncate>
              {t('contacts.title')}
            </Text>
          </Box>
        </Box>
      </PageNavHeader>

      <PageNavContent>
        <Box direction="Column" gap="300">
          <NavCategory>
            <NavItem variant="Background" radii="400" aria-selected={contactsSelected}>
              <NavLink to={getContactsContactsPath()}>
                <NavItemContent>
                  <Box as="span" grow="Yes" alignItems="Center" gap="200">
                    <Avatar size="200" radii="400">
                      <Icon src={UsersIcon} size="100" filled={contactsSelected} />
                    </Avatar>
                    <Box as="span" grow="Yes">
                      <Text as="span" size="Inherit" truncate>
                        {t('contacts.title')}
                      </Text>
                    </Box>
                  </Box>
                </NavItemContent>
              </NavLink>
            </NavItem>
          </NavCategory>
        </Box>
      </PageNavContent>
    </PageNav>
  );
}
