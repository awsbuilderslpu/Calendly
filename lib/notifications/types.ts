export type NotificationType =
  | 'BOOKING_CONFIRMATION_CANDIDATE'
  | 'BOOKING_CONFIRMATION_INTERVIEWER'
  | 'RESCHEDULE_CONFIRMATION_CANDIDATE'
  | 'RESCHEDULE_CONFIRMATION_INTERVIEWER'
  | 'CANCELLATION_CONFIRMATION_CANDIDATE'
  | 'CANCELLATION_CONFIRMATION_INTERVIEWER'
  | 'REMINDER_24_HOURS'
  | 'REMINDER_1_HOUR'
  | 'REMINDER_10_MINUTES';

export type NotificationStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'CANCELLED';

export interface NotificationMessage {
  id: string; // Used for idempotency where supported
  recipientEmail: string;
  subject: string;
  // Mail API v1 fields:
  content: string; // Plain-text email content. Use a blank line between paragraphs.
  greeting?: string; // Greeting displayed above the message.
  heading?: string; // Main heading displayed in the email.
  senderName?: string; // Name displayed in the signature.
  senderRole?: string; // Role or team displayed below the sender name.
  
  // Legacy / backward compatibility if needed by other providers
  htmlBody?: string;
}

export interface NotificationResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface NotificationProvider {
  send(message: NotificationMessage): Promise<NotificationResult>;
}
