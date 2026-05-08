import React from 'react';
import { Avatar, Box, Icon, Text } from 'folds';
import { useTranslation } from 'react-i18next';
import { NavCategory, NavItem, NavItemContent, NavLink } from '../../../components/nav';
import { useNavToActivePathMapper } from '../../../hooks/useNavToActivePathMapper';
import { PageNav, PageNavContent, PageNavHeader } from '../../../components/page';
import { ListTodoIcon } from '../../../icons/ListTodoIcon';
import { getTodosPath } from '../../../pages/pathUtils';

export function TodosNav() {
  const { t } = useTranslation();
  useNavToActivePathMapper('todos');

  return (
    <PageNav stretch>
      <PageNavHeader>
        <Box grow="Yes" gap="300">
          <Box grow="Yes">
            <Text size="H4" truncate>
              {t('todos.title')}
            </Text>
          </Box>
        </Box>
      </PageNavHeader>

      <PageNavContent>
        <Box direction="Column" gap="300">
          <NavCategory>
            <NavItem variant="Background" radii="400" aria-selected>
              <NavLink to={getTodosPath()}>
                <NavItemContent>
                  <Box as="span" grow="Yes" alignItems="Center" gap="200">
                    <Avatar size="200" radii="400">
                      <Icon src={ListTodoIcon} size="100" filled />
                    </Avatar>
                    <Box as="span" grow="Yes">
                      <Text as="span" size="Inherit" truncate>
                        {t('todos.title')}
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
