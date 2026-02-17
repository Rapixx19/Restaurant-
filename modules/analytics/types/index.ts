/**
 * Analytics Module Types
 */

export interface StatCardData {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface RevenueChartData {
  date: string;
  revenue: number;
  orders: number;
}

export interface BookingChartData {
  day: string;
  count: number;
}

export interface SentimentData {
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}
