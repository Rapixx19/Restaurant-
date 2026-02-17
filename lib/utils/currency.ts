/**
 * Currency Formatting Utilities
 *
 * Standardized Euro formatting across the application.
 * All prices should use these utilities for consistency.
 */

const euroFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const euroFormatterCompact = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  notation: 'compact',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

/**
 * Format a number as Euro currency.
 * @param amount - The amount in Euros (not cents)
 * @returns Formatted string like "€29,00"
 */
export function formatEuro(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) {
    return '–';
  }
  return euroFormatter.format(amount);
}

/**
 * Format a number as Euro currency in compact notation.
 * @param amount - The amount in Euros (not cents)
 * @returns Formatted string like "€1,5K"
 */
export function formatEuroCompact(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) {
    return '–';
  }
  return euroFormatterCompact.format(amount);
}

/**
 * Format cents to Euro currency.
 * @param cents - The amount in cents
 * @returns Formatted string like "€29,00"
 */
export function formatCentsToEuro(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) {
    return '–';
  }
  return euroFormatter.format(cents / 100);
}

/**
 * Format price for display with optional "Contact Us" fallback.
 * Useful for Enterprise pricing that may be null.
 * @param priceEur - The price in Euros (null means "Contact Us")
 * @param interval - Optional billing interval
 * @returns Formatted price or "Contact Us"
 */
export function formatPlanPrice(
  priceEur: number | null | undefined,
  interval?: 'month' | 'year'
): string {
  if (priceEur === null || priceEur === undefined) {
    return 'Contact Us';
  }

  if (priceEur === 0) {
    return 'Free';
  }

  const formatted = euroFormatter.format(priceEur);
  if (interval) {
    return `${formatted}/${interval === 'month' ? 'mo' : 'yr'}`;
  }
  return formatted;
}

/**
 * Format a billing amount for alerts/invoices.
 * @param amount - The amount in Euros
 * @param currency - The currency code (defaults to EUR)
 * @returns Formatted string
 */
export function formatBillingAmount(
  amount: number | null | undefined,
  currency: string = 'eur'
): string {
  if (amount === null || amount === undefined) {
    return 'N/A';
  }

  const currencyUpper = currency.toUpperCase();

  if (currencyUpper === 'EUR') {
    return euroFormatter.format(amount);
  }

  // Fallback for other currencies
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyUpper,
  }).format(amount);
}
