import React, { ReactNode } from 'react';
import { Box, Icon, Text } from 'folds';
import { RadioIcon } from '../../icons/RadioIcon';
import * as css from './RadioGroup.css';

export type RadioGroupOption = {
  value: string;
  label: ReactNode;
  disabled?: boolean;
};

type RadioGroupProps = {
  value?: string;
  options: readonly RadioGroupOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  name?: string;
};

export function RadioGroup({ value, options, onChange, disabled, name }: RadioGroupProps) {
  return (
    <Box role="radiogroup" aria-label={name} wrap="Wrap" gap="300">
      {options.map((option) => {
        const checked = option.value === value;
        const optionDisabled = disabled || option.disabled;

        return (
          <button
            key={option.value}
            type="button"
            className={css.RadioOption}
            role="radio"
            aria-checked={checked}
            aria-label={typeof option.label === 'string' ? option.label : option.value}
            disabled={optionDisabled}
            onClick={() => onChange(option.value)}
          >
            <Icon src={RadioIcon} filled={checked} size="200" className={checked ? css.RadioIconSelected : undefined} />
            <Text size="T300" priority={checked ? '400' : '300'}>
              {option.label}
            </Text>
          </button>
        );
      })}
    </Box>
  );
}

// Keep typo-compatible alias for callers that use RaidoGroup.
export const RaidoGroup = RadioGroup;
