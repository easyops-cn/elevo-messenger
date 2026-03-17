import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, Icons } from 'folds';
import { useAtomValue } from 'jotai';
import {
  SidebarAvatar,
  SidebarItem,
  SidebarItemTooltip,
} from '../../../components/sidebar';
import { getContactsContactsPath, getContactsPath, joinPathComponent } from '../../pathUtils';
import { useContactsSelected } from '../../../hooks/router/useContacts';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import { useNavToActivePathAtom } from '../../../state/hooks/navToActivePath';

export function ContactsTab() {
  const screenSize = useScreenSizeContext();
  const navigate = useNavigate();
  const navToActivePath = useAtomValue(useNavToActivePathAtom());
  const contactsSelected = useContactsSelected();

  const handleContactsClick = () => {
    if (screenSize === ScreenSize.Mobile) {
      navigate(getContactsPath());
      return;
    }
    const activePath = navToActivePath.get('contacts');
    if (activePath) {
      navigate(joinPathComponent(activePath));
      return;
    }

    navigate(getContactsContactsPath());
  };

  return (
    <SidebarItem active={contactsSelected}>
      <SidebarItemTooltip tooltip="Contacts">
        {(triggerRef) => (
          <SidebarAvatar as="button" ref={triggerRef} outlined onClick={handleContactsClick}>
            <Icon src={Icons.UserPlus} filled={contactsSelected} />
          </SidebarAvatar>
        )}
      </SidebarItemTooltip>
    </SidebarItem>
  );
}
