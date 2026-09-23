import { NotificationMessage, NotificationProvider, NotificationResult } from '../notifications/types';

export class SsoMailProvider implements NotificationProvider {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = process.env.SSO_ISSUER ? `${process.env.SSO_ISSUER}/api/v1/mail/send` : 'https://sso.awslpu.in/api/v1/mail/send';
    this.apiKey = process.env.AWS_LPU_MAIL_API_KEY || '';
  }

  async send(message: NotificationMessage): Promise<NotificationResult> {
    if (!this.apiKey) {
      console.warn('AWS_LPU_MAIL_API_KEY not configured, simulating success');
      return { success: true, providerMessageId: `simulated-${Date.now()}` };
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          to: message.recipientEmail,
          subject: message.subject,
          html: message.htmlBody,
          idempotency_key: message.id, // For idempotency if supported by SSO mail
        }),
      });

      if (!response.ok) {
        let errorText = 'Unknown error';
        try {
          const body = await response.json();
          errorText = body.error || JSON.stringify(body);
        } catch {
          errorText = await response.text();
        }
        return { success: false, error: `SSO Mail API Error: ${response.status} - ${errorText}` };
      }

      const data = await response.json().catch(() => ({}));
      return { success: true, providerMessageId: data.id || data.messageId || 'unknown' };
    } catch (error: unknown) {
      return { success: false, error: (error instanceof Error ? error.message : String(error)) };
    }
  }
}
