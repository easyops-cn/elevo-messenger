import React, { MouseEventHandler, useState } from 'react';
import { Box, Button, Icon, Icons, Menu, MenuItem, PopOut, RectCords, Text } from 'folds';
import FocusTrap from 'focus-trap-react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../../i18n';
import { isDesktopTauri } from '../../plugins/useTauriOpener';
import { settingsAtom } from '../../state/settings';
import { useSetting } from '../../state/hooks/settings';
import { stopPropagation } from '../../utils/keyboard';
import * as css from './styles.css';

export function AuthFooter() {
  const { t, i18n } = useTranslation();
  const [, setLanguage] = useSetting(settingsAtom, 'language');
  const [menuCords, setMenuCords] = useState<RectCords>();

  const handleMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setMenuCords(evt.currentTarget.getBoundingClientRect());
  };

  const handleSelect = (langCode: string) => {
    i18n.changeLanguage(langCode);
    if (isDesktopTauri) {
      setLanguage(langCode);
    }
    setMenuCords(undefined);
  };

  const currentLang =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ?? SUPPORTED_LANGUAGES[0];

  return (
    <Box className={css.AuthFooter} justifyContent="Center" gap="400" wrap="Wrap" alignItems="Center">
      <Text as="a" size="T300" href="https://github.com/easyops-cn/elevo-desktop" target="_blank" rel="noreferrer">
        {t('auth.about')}
      </Text>
      <Text
        as="a"
        size="T300"
        href="https://github.com/easyops-cn/elevo-desktop/releases"
        target="_blank"
        rel="noreferrer"
      >
        {`v${__APP_VERSION__}`}
      </Text>
      <Text as="a" size="T300" href="https://matrix.org" target="_blank" rel="noreferrer">
        {t('auth.poweredByMatrix')}
      </Text>
      <Button
        size="300"
        variant="Secondary"
        fill="None"
        radii="300"
        before={<Icon size="100" src={Icons.Globe} />}
        after={<Icon size="100" src={Icons.ChevronBottom} />}
        onClick={handleMenu}
      >
        <Text size="T300">{currentLang.name}</Text>
      </Button>
      <PopOut
        anchor={menuCords}
        offset={5}
        position="Top"
        align="Center"
        content={
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: () => setMenuCords(undefined),
              clickOutsideDeactivates: true,
              isKeyForward: (evt: KeyboardEvent) =>
                evt.key === 'ArrowDown' || evt.key === 'ArrowRight',
              isKeyBackward: (evt: KeyboardEvent) =>
                evt.key === 'ArrowUp' || evt.key === 'ArrowLeft',
              escapeDeactivates: stopPropagation,
            }}
          >
            <Menu>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <MenuItem
                  key={lang.code}
                  size="300"
                  radii="300"
                  aria-pressed={lang.code === i18n.language}
                  onClick={() => handleSelect(lang.code)}
                >
                  <Text size="T300">{lang.name}</Text>
                </MenuItem>
              ))}
            </Menu>
          </FocusTrap>
        }
      />
    </Box>
  );
}
