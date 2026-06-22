import { EventStatus } from 'matrix-js-sdk';
import { describe, expect, it } from 'vitest';
import { shouldShowResendMessageButton } from './sendStatus';

const createEvent = (sender: string, status?: EventStatus) =>
  ({
    getSender: () => sender,
    status,
  }) as never;

describe('shouldShowResendMessageButton', () => {
  it('shows the resend button only for the current user not-sent event', () => {
    expect(
      shouldShowResendMessageButton(
        createEvent('@me:example.org', EventStatus.NOT_SENT),
        '@me:example.org',
      ),
    ).toBe(true);
  });

  it('hides the resend button for other users', () => {
    expect(
      shouldShowResendMessageButton(
        createEvent('@other:example.org', EventStatus.NOT_SENT),
        '@me:example.org',
      ),
    ).toBe(false);
  });

  it('hides the resend button for non-failed local echo states', () => {
    expect(
      shouldShowResendMessageButton(
        createEvent('@me:example.org', EventStatus.SENDING),
        '@me:example.org',
      ),
    ).toBe(false);
    expect(shouldShowResendMessageButton(createEvent('@me:example.org'), '@me:example.org')).toBe(
      false,
    );
  });
});
