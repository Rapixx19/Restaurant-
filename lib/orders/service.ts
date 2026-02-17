import { createClient as createAnonClient } from '@supabase/supabase-js';
import { createCheckoutSession } from '@/lib/payments/stripe';
import type { MenuItem } from '@/lib/database.types';

export interface OrderItem {
  id: string;
  quantity: number;
  notes?: string;
}

export interface CreateOrderInput {
  restaurantId: string;
  items: OrderItem[];
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  orderType: 'dine_in' | 'takeout' | 'delivery';
  specialInstructions?: string;
  source?: 'phone' | 'chat' | 'website' | 'walk_in' | 'manual' | 'ai';
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  checkoutUrl?: string;
  error?: string;
  orderSummary?: string;
}

interface ValidatedItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
  lineTotal: number;
}

/**
 * CRITICAL SECURITY: Validates items and fetches prices from the database.
 * NEVER trust prices sent from the frontend.
 */
async function validateAndPriceItems(
  restaurantId: string,
  items: OrderItem[]
): Promise<{ valid: boolean; validatedItems?: ValidatedItem[]; error?: string }> {
  const supabase = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const itemIds = Array.from(new Set(items.map((item) => item.id)));

  const { data: menuItems, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .in('id', itemIds);

  if (error) {
    console.error('Error fetching menu items:', error);
    return { valid: false, error: 'Failed to validate menu items' };
  }

  if (!menuItems || menuItems.length === 0) {
    return { valid: false, error: 'No valid menu items found' };
  }

  const menuItemMap = new Map(menuItems.map((item) => [item.id, item as MenuItem]));
  const validatedItems: ValidatedItem[] = [];
  const invalidItems: string[] = [];

  for (const orderItem of items) {
    const menuItem = menuItemMap.get(orderItem.id);

    if (!menuItem) {
      invalidItems.push(orderItem.id);
      continue;
    }

    if (!menuItem.is_available) {
      return {
        valid: false,
        error: '"' + menuItem.name + '" is currently unavailable. Please choose another item.',
      };
    }

    if (orderItem.quantity < 1 || orderItem.quantity > 99) {
      return {
        valid: false,
        error: 'Invalid quantity for "' + menuItem.name + '". Quantity must be between 1 and 99.',
      };
    }

    validatedItems.push({
      menuItem,
      quantity: orderItem.quantity,
      notes: orderItem.notes,
      lineTotal: menuItem.price * orderItem.quantity,
    });
  }

  if (invalidItems.length > 0) {
    return {
      valid: false,
      error: 'Some items are no longer on the menu. Please refresh and try again.',
    };
  }

  return { valid: true, validatedItems };
}

function calculateTotals(validatedItems: ValidatedItem[]): {
  subtotal: number;
  tax: number;
  total: number;
} {
  const subtotal = validatedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const taxRate = 0.0875;
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  return { subtotal, tax, total };
}

function formatItemsForStorage(validatedItems: ValidatedItem[]): object[] {
  return validatedItems.map((item) => ({
    menu_item_id: item.menuItem.id,
    name: item.menuItem.name,
    price: item.menuItem.price,
    quantity: item.quantity,
    notes: item.notes || null,
    line_total: item.lineTotal,
  }));
}

export async function createOrder(input: CreateOrderInput): Promise<OrderResult> {
  const supabase = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const validation = await validateAndPriceItems(input.restaurantId, input.items);
  if (!validation.valid || !validation.validatedItems) {
    return { success: false, error: validation.error };
  }

  const validatedItems = validation.validatedItems;
  const { subtotal, tax, total } = calculateTotals(validatedItems);

  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('name, currency')
    .eq('id', input.restaurantId)
    .single();

  if (restaurantError || !restaurant) {
    return { success: false, error: 'Restaurant not found' };
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      restaurant_id: input.restaurantId,
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      customer_email: input.customerEmail || null,
      type: input.orderType,
      status: 'pending',
      source: input.source || 'chat',
      items: formatItemsForStorage(validatedItems),
      subtotal,
      tax,
      tip: 0,
      total,
      payment_status: 'pending',
      special_instructions: input.specialInstructions || null,
    })
    .select('id')
    .single();

  if (orderError || !order) {
    console.error('Error creating order:', orderError);
    return { success: false, error: 'Failed to create order. Please try again.' };
  }

  try {
    const checkoutUrl = await createCheckoutSession({
      orderId: order.id,
      restaurantId: input.restaurantId,
      restaurantName: restaurant.name,
      items: validatedItems.map((item) => ({
        name: item.menuItem.name,
        description: item.notes || undefined,
        price: item.menuItem.price,
        quantity: item.quantity,
      })),
      tax,
      total,
      customerEmail: input.customerEmail,
      currency: restaurant.currency || 'usd',
    });

    const orderSummary = formatOrderSummary(validatedItems, { subtotal, tax, total });

    return {
      success: true,
      orderId: order.id,
      checkoutUrl,
      orderSummary,
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    await supabase.from('orders').delete().eq('id', order.id);
    return {
      success: false,
      error: 'Failed to create payment link. Please try again.',
    };
  }
}

export function formatOrderSummary(
  validatedItems: ValidatedItem[],
  totals: { subtotal: number; tax: number; total: number }
): string {
  const itemLines = validatedItems.map((item) => {
    const line = item.quantity + 'x ' + item.menuItem.name + ' - $' + item.lineTotal.toFixed(2);
    return item.notes ? line + '\n   Note: ' + item.notes : line;
  });

  return 'Order Summary:\n' +
    itemLines.join('\n') +
    '\n\nSubtotal: $' + totals.subtotal.toFixed(2) +
    '\nTax: $' + totals.tax.toFixed(2) +
    '\nTotal: $' + totals.total.toFixed(2);
}

export async function updateOrderPaymentStatus(
  orderId: string,
  paymentStatus: 'paid' | 'refunded',
  paymentMethod?: string
): Promise<boolean> {
  const supabase = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { error } = await supabase
    .from('orders')
    .update({
      payment_status: paymentStatus,
      payment_method: paymentMethod || null,
      status: paymentStatus === 'paid' ? 'confirmed' : 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (error) {
    console.error('Error updating order payment status:', error);
    return false;
  }

  return true;
}
