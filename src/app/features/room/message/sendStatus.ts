import { EventStatus, MatrixEvent } from 'matrix-js-sdk';

export const shouldShowResendMessageButton = (mEvent: MatrixEvent, currentUserId: string | null) =>
  mEvent.getSender() === currentUserId && mEvent.status === EventStatus.NOT_SENT;
