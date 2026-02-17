import twilio from 'twilio';

/**
 * Lazy-initialized Twilio client to avoid build-time errors.
 */
let twilioClient: twilio.Twilio | null = null;

function getTwilio(): twilio.Twilio | null {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      console.warn('Twilio credentials not configured - SMS notifications disabled');
      return null;
    }

    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}

export interface SendSMSParams {
  to: string;
  message: string;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Normalize phone number to E.164 format.
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If it doesn't start with +, assume US number
  if (!cleaned.startsWith('+')) {
    // Remove leading 1 if present
    if (cleaned.startsWith('1') && cleaned.length === 11) {
      cleaned = cleaned.slice(1);
    }
    // Add US country code
    cleaned = '+1' + cleaned;
  }

  return cleaned;
}

/**
 * Send an SMS via Twilio.
 */
export async function sendSMS(params: SendSMSParams): Promise<SMSResult> {
  const client = getTwilio();

  if (!client) {
    return { success: false, error: 'SMS service not configured' };
  }

  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!fromNumber) {
    return { success: false, error: 'Twilio phone number not configured' };
  }

  try {
    const normalizedTo = normalizePhoneNumber(params.to);

    const message = await client.messages.create({
      body: params.message,
      from: fromNumber,
      to: normalizedTo,
    });

    return { success: true, messageId: message.sid };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('SMS send error:', message);
    return { success: false, error: message };
  }
}

/**
 * Check if SMS service is configured.
 */
export function isSMSConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}

// ============================================================
// SMS TEMPLATES
// ============================================================

export function orderConfirmationSMS(params: {
  restaurantName: string;
  orderId: string;
  total: number;
}): string {
  return `Your order at ${params.restaurantName} is confirmed! Order #${params.orderId.slice(0, 8).toUpperCase()}. Total: $${params.total.toFixed(2)}. We'll text you when it's ready!`;
}

export function reservationConfirmationSMS(params: {
  restaurantName: string;
  date: string;
  time: string;
  partySize: number;
}): string {
  return `Reservation confirmed at ${params.restaurantName} for ${params.partySize} on ${params.date} at ${params.time}. See you soon!`;
}

export function orderReadySMS(params: {
  restaurantName: string;
  orderId: string;
  orderType: string;
}): string {
  const action = params.orderType === 'takeout' ? 'pickup' : params.orderType === 'delivery' ? 'delivery' : 'service';
  return `Your order at ${params.restaurantName} is ready for ${action}! Order #${params.orderId.slice(0, 8).toUpperCase()}`;
}

export function reservationReminderSMS(params: {
  restaurantName: string;
  time: string;
}): string {
  return `Reminder: Your reservation at ${params.restaurantName} is today at ${params.time}. See you soon!`;
}
