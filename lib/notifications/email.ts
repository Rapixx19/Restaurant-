import { Resend } from 'resend';

/**
 * Lazy-initialized Resend client to avoid build-time errors.
 */
let resendInstance: Resend | null = null;

function getResend(): Resend | null {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('RESEND_API_KEY not configured - email notifications disabled');
      return null;
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email via Resend.
 */
export async function sendEmail(params: SendEmailParams): Promise<EmailResult> {
  const resend = getResend();

  if (!resend) {
    return { success: false, error: 'Email service not configured' };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@vecterai.com';

  try {
    const { data, error } = await resend.emails.send({
      from: `VECTERAI <${fromEmail}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Email send error:', message);
    return { success: false, error: message };
  }
}

/**
 * Check if email service is configured.
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

// ============================================================
// EMAIL TEMPLATES
// ============================================================

export function orderConfirmationEmail(params: {
  customerName: string;
  restaurantName: string;
  orderId: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  tax: number;
  total: number;
  orderType: string;
}): string {
  const itemsHtml = params.items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${item.quantity}x ${item.name}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
        </tr>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Order Confirmed!</h1>
  </div>

  <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px;">Hi ${params.customerName},</p>

    <p>Thank you for your order at <strong>${params.restaurantName}</strong>! We're preparing it now.</p>

    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0; font-weight: 600; color: #374151;">Order #${params.orderId.slice(0, 8).toUpperCase()}</p>
      <p style="margin: 0; color: #6b7280; font-size: 14px;">Type: ${params.orderType}</p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr>
          <th style="text-align: left; padding: 8px 0; border-bottom: 2px solid #e5e7eb;">Item</th>
          <th style="text-align: right; padding: 8px 0; border-bottom: 2px solid #e5e7eb;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Subtotal</td>
          <td style="padding: 8px 0; text-align: right; color: #6b7280;">$${params.subtotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Tax</td>
          <td style="padding: 8px 0; text-align: right; color: #6b7280;">$${params.tax.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; font-weight: 700; font-size: 18px;">Total</td>
          <td style="padding: 12px 0; text-align: right; font-weight: 700; font-size: 18px; color: #667eea;">$${params.total.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>

    <p style="color: #6b7280; font-size: 14px;">We'll notify you when your order is ready!</p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
      Powered by VECTERAI
    </p>
  </div>
</body>
</html>
`;
}

export function reservationConfirmationEmail(params: {
  customerName: string;
  restaurantName: string;
  restaurantPhone?: string;
  restaurantAddress?: string;
  date: string;
  time: string;
  partySize: number;
  reservationId: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reservation Confirmed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Reservation Confirmed!</h1>
  </div>

  <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px;">Hi ${params.customerName},</p>

    <p>Your reservation at <strong>${params.restaurantName}</strong> has been confirmed!</p>

    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 100px;">Date</td>
          <td style="padding: 8px 0; font-weight: 600;">${params.date}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Time</td>
          <td style="padding: 8px 0; font-weight: 600;">${params.time}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Guests</td>
          <td style="padding: 8px 0; font-weight: 600;">${params.partySize} ${params.partySize === 1 ? 'guest' : 'guests'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Confirmation</td>
          <td style="padding: 8px 0; font-weight: 600;">#${params.reservationId.slice(0, 8).toUpperCase()}</td>
        </tr>
      </table>
    </div>

    ${params.restaurantAddress ? `
    <div style="background: #f9fafb; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0 0 5px 0; font-weight: 600; color: #374151;">Location</p>
      <p style="margin: 0; color: #6b7280;">${params.restaurantAddress}</p>
      ${params.restaurantPhone ? `<p style="margin: 5px 0 0 0; color: #6b7280;">Phone: ${params.restaurantPhone}</p>` : ''}
    </div>
    ` : ''}

    <p style="color: #6b7280; font-size: 14px;">Need to modify or cancel? Please call the restaurant directly.</p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
      Powered by VECTERAI
    </p>
  </div>
</body>
</html>
`;
}

export function orderReadyEmail(params: {
  customerName: string;
  restaurantName: string;
  orderId: string;
  orderType: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Order is Ready!</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Your Order is Ready!</h1>
  </div>

  <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px;">Hi ${params.customerName},</p>

    <p>Great news! Your order from <strong>${params.restaurantName}</strong> is ready for ${params.orderType === 'takeout' ? 'pickup' : params.orderType === 'delivery' ? 'delivery' : 'service'}!</p>

    <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #92400e;">Order #${params.orderId.slice(0, 8).toUpperCase()}</p>
    </div>

    <p style="color: #6b7280; font-size: 14px;">Thank you for choosing ${params.restaurantName}!</p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
      Powered by VECTERAI
    </p>
  </div>
</body>
</html>
`;
}
