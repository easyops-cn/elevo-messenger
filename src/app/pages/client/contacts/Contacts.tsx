import React from 'react';
import { Avatar, Box, Icon, Icons, Text } from 'folds';
import { NavCategory, NavItem, NavItemContent, NavLink } from '../../../components/nav';
import { getContactsContactsPath } from '../../pathUtils';
import { useContactsContactsSelected } from '../../../hooks/router/useContacts';
import { useNavToActivePathMapper } from '../../../hooks/useNavToActivePathMapper';
import { PageNav, PageNavContent, PageNavHeader } from '../../../components/page';

export function Contacts() {
  useNavToActivePathMapper('contacts');
  const contactsSelected = useContactsContactsSelected();

  return (
    <PageNav>
      <PageNavHeader>
        <Box grow="Yes" gap="300">
          <Box grow="Yes">
            <Text size="H4" truncate>
              Contacts
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
                      <Icon src={Icons.UserPlus} size="100" filled={contactsSelected} />
                    </Avatar>
                    <Box as="span" grow="Yes">
                      <Text as="span" size="Inherit" truncate>
                        Contacts
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
