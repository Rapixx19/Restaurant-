import { createClient } from '@supabase/supabase-js';
import {
  sendEmail,
  isEmailConfigured,
  orderConfirmationEmail,
  reservationConfirmationEmail,
  orderReadyEmail,
} from './email';
import {
  sendSMS,
  isSMSConfigured,
  orderConfirmationSMS,
  reservationConfirmationSMS,
  orderReadySMS,
} from './sms';
import type { RestaurantSettings } from '@/modules/settings/types';

interface NotificationResult {
  email?: { success: boolean; error?: string };
  sms?: { success: boolean; error?: string };
}

interface OrderItem {
  name: string;
  quantity: number;
  price?: number;
  line_total?: number;
}

/**
 * Get Supabase admin client for fetching data.
 */
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * Check if notifications are enabled for a restaurant.
 */
function getNotificationSettings(settings: RestaurantSettings | null): {
  emailEnabled: boolean;
  smsEnabled: boolean;
  replyToEmail?: string;
} {
  const notifications = settings?.notifications;

  return {
    emailEnabled: notifications?.emailEnabled ?? true,
    smsEnabled: notifications?.smsEnabled ?? true,
    replyToEmail: notifications?.replyToEmail,
  };
}

/**
 * Format time from 24h to 12h format.
 */
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Format date for display.
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// ============================================================
// ORDER NOTIFICATIONS
// ============================================================

/**
 * Send order confirmation notification (email + SMS).
 */
export async function sendOrderConfirmation(
  orderId: string
): Promise<NotificationResult> {
  const supabase = getSupabase();
  const result: NotificationResult = {};

  // Fetch order with restaurant info
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, restaurants(name, phone, settings)')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    console.error('Failed to fetch order for notification:', orderError);
    return { email: { success: false, error: 'Order not found' } };
  }

  const restaurant = order.restaurants as {
    name: string;
    phone?: string;
    settings?: RestaurantSettings;
  };
  const settings = getNotificationSettings(restaurant.settings || null);
  const items = (order.items || []) as OrderItem[];

  // Format items for email
  const emailItems = items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    price: (item.line_total || item.price || 0) * item.quantity,
  }));

  // Send email if configured and enabled
  if (order.customer_email && settings.emailEnabled && isEmailConfigured()) {
    const emailHtml = orderConfirmationEmail({
      customerName: order.customer_name,
      restaurantName: restaurant.name,
      orderId: order.id,
      items: emailItems,
      subtotal: order.subtotal || 0,
      tax: order.tax || 0,
      total: order.total || 0,
      orderType: order.type || 'takeout',
    });

    result.email = await sendEmail({
      to: order.customer_email,
      subject: `Order Confirmed - ${restaurant.name}`,
      html: emailHtml,
      replyTo: settings.replyToEmail,
    });
  }

  // Send SMS if configured and enabled
  if (order.customer_phone && settings.smsEnabled && isSMSConfigured()) {
    const smsMessage = orderConfirmationSMS({
      restaurantName: restaurant.name,
      orderId: order.id,
      total: order.total || 0,
    });

    result.sms = await sendSMS({
      to: order.customer_phone,
      message: smsMessage,
    });
  }

  return result;
}

/**
 * Send order ready notification (email + SMS).
 */
export async function sendOrderReadyAlert(
  orderId: string
): Promise<NotificationResult> {
  const supabase = getSupabase();
  const result: NotificationResult = {};

  // Fetch order with restaurant info
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, restaurants(name, settings)')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    console.error('Failed to fetch order for notification:', orderError);
    return { email: { success: false, error: 'Order not found' } };
  }

  const restaurant = order.restaurants as {
    name: string;
    settings?: RestaurantSettings;
  };
  const settings = getNotificationSettings(restaurant.settings || null);

  // Send email if configured and enabled
  if (order.customer_email && settings.emailEnabled && isEmailConfigured()) {
    const emailHtml = orderReadyEmail({
      customerName: order.customer_name,
      restaurantName: restaurant.name,
      orderId: order.id,
      orderType: order.type || 'takeout',
    });

    result.email = await sendEmail({
      to: order.customer_email,
      subject: `Your Order is Ready! - ${restaurant.name}`,
      html: emailHtml,
      replyTo: settings.replyToEmail,
    });
  }

  // Send SMS if configured and enabled
  if (order.customer_phone && settings.smsEnabled && isSMSConfigured()) {
    const smsMessage = orderReadySMS({
      restaurantName: restaurant.name,
      orderId: order.id,
      orderType: order.type || 'takeout',
    });

    result.sms = await sendSMS({
      to: order.customer_phone,
      message: smsMessage,
    });
  }

  return result;
}

// ============================================================
// RESERVATION NOTIFICATIONS
// ============================================================

/**
 * Send reservation confirmation notification (email + SMS).
 */
export async function sendReservationConfirmation(
  reservationId: string
): Promise<NotificationResult> {
  const supabase = getSupabase();
  const result: NotificationResult = {};

  // Fetch reservation with restaurant info
  const { data: reservation, error: resError } = await supabase
    .from('reservations')
    .select('*, restaurants(name, phone, address, settings)')
    .eq('id', reservationId)
    .single();

  if (resError || !reservation) {
    console.error('Failed to fetch reservation for notification:', resError);
    return { email: { success: false, error: 'Reservation not found' } };
  }

  const restaurant = reservation.restaurants as {
    name: string;
    phone?: string;
    address?: { street?: string; city?: string; state?: string; zip?: string };
    settings?: RestaurantSettings;
  };
  const settings = getNotificationSettings(restaurant.settings || null);

  const formattedDate = formatDate(reservation.reservation_date);
  const formattedTime = formatTime(reservation.reservation_time);

  // Build address string
  const address = restaurant.address;
  const addressStr = address
    ? [address.street, address.city, address.state, address.zip]
        .filter(Boolean)
        .join(', ')
    : undefined;

  // Send email if configured and enabled
  if (reservation.customer_email && settings.emailEnabled && isEmailConfigured()) {
    const emailHtml = reservationConfirmationEmail({
      customerName: reservation.customer_name,
      restaurantName: restaurant.name,
      restaurantPhone: restaurant.phone,
      restaurantAddress: addressStr,
      date: formattedDate,
      time: formattedTime,
      partySize: reservation.party_size,
      reservationId: reservation.id,
    });

    result.email = await sendEmail({
      to: reservation.customer_email,
      subject: `Reservation Confirmed - ${restaurant.name}`,
      html: emailHtml,
      replyTo: settings.replyToEmail,
    });
  }

  // Send SMS if configured and enabled
  if (reservation.customer_phone && settings.smsEnabled && isSMSConfigured()) {
    const smsMessage = reservationConfirmationSMS({
      restaurantName: restaurant.name,
      date: formattedDate,
      time: formattedTime,
      partySize: reservation.party_size,
    });

    result.sms = await sendSMS({
      to: reservation.customer_phone,
      message: smsMessage,
    });
  }

  return result;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Check notification service status.
 */
export function getNotificationStatus(): {
  email: boolean;
  sms: boolean;
} {
  return {
    email: isEmailConfigured(),
    sms: isSMSConfigured(),
  };
}
