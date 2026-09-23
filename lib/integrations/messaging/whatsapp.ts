export interface MessagingMessage {
  id: string;
  recipientPhone?: string;
  recipientEmail?: string;
  templateName: string;
  parameters: Record<string, string>;
}

export interface MessagingResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface MessagingProvider {
  send(message: MessagingMessage): Promise<MessagingResult>;
}

export class WhatsAppProvider implements MessagingProvider {
  async send(message: MessagingMessage): Promise<MessagingResult> {
    if (!message.recipientPhone) {
      return { success: false, error: "WHATSAPP_NOT_CONFIGURED" };
    }

    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiToken = process.env.WHATSAPP_API_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    // Fake provider for tests if no env configured
    if (!apiUrl || !apiToken || !phoneId) {
      console.log("[WhatsApp Mock] Sent:", message.templateName, "to", message.recipientPhone);
      return { success: true, providerMessageId: "mock-wa-" + Date.now() };
    }

    try {
      const response = await fetch(`${apiUrl}/${phoneId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: message.recipientPhone,
          type: "template",
          template: {
            name: message.templateName,
            language: { code: "en_US" },
            components: [
              {
                type: "body",
                parameters: Object.values(message.parameters).map(text => ({ type: "text", text }))
              }
            ]
          }
        })
      });

      if (!response.ok) {
        return { success: false, error: "WHATSAPP_PROVIDER_ERROR" };
      }

      const data = await response.json();
      return { success: true, providerMessageId: data.messages?.[0]?.id };
    } catch (err: unknown) {
      return { success: false, error: "WHATSAPP_PROVIDER_ERROR" };
    }
  }
}
