import { createClient } from '@supabase/supabase-js';

/**
 * Analytics Service
 *
 * Transforms database logs into business intelligence metrics for restaurant owners.
 * All data is scoped to a single restaurant.
 */

// ============================================================
// TYPES
// ============================================================

export interface RevenueMetrics {
  totalRevenue: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  revenueByDay: Array<{ date: string; revenue: number; orders: number }>;
}

export interface ReservationMetrics {
  totalReservations: number;
  todayReservations: number;
  weekReservations: number;
  totalGuests: number;
  averagePartySize: number;
  bySource: {
    ai: number;
    phone: number;
    manual: number;
    website: number;
    walkIn: number;
  };
  byDayOfWeek: Array<{ day: string; count: number }>;
  upcomingReservations: number;
}

export interface VoiceInsights {
  totalCalls: number;
  averageDuration: number;
  conversionRate: number;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topIntents: Array<{ intent: string; count: number }>;
  callsByDay: Array<{ date: string; calls: number; conversions: number }>;
}

export interface MenuInsights {
  topItems: Array<{
    id: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    orders: number;
    revenue: number;
  }>;
}

export interface DashboardStats {
  totalRevenue: number;
  totalGuests: number;
  aiConversations: number;
  timeSavedMinutes: number;
  revenueChange: number;
  guestsChange: number;
}

// ============================================================
// HELPERS
// ============================================================

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function getDateRange(days: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

function getDayOfWeekName(dayIndex: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayIndex];
}

// ============================================================
// REVENUE METRICS
// ============================================================

export async function getRevenueMetrics(
  restaurantId: string,
  days: number = 30
): Promise<RevenueMetrics> {
  const supabase = getSupabase();
  const { start } = getDateRange(days);
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Fetch paid orders
  const { data: orders, error } = await supabase
    .from('orders')
    .select('total, created_at')
    .eq('restaurant_id', restaurantId)
    .eq('payment_status', 'paid')
    .gte('created_at', start + 'T00:00:00')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching revenue metrics:', error);
    return {
      totalRevenue: 0,
      todayRevenue: 0,
      weekRevenue: 0,
      monthRevenue: 0,
      orderCount: 0,
      averageOrderValue: 0,
      revenueByDay: [],
    };
  }

  const allOrders = orders || [];

  // Calculate totals
  const totalRevenue = allOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const orderCount = allOrders.length;
  const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

  // Filter by time periods
  const todayOrders = allOrders.filter((o) => o.created_at.startsWith(today));
  const weekOrders = allOrders.filter((o) => o.created_at >= weekAgo);
  const monthOrders = allOrders.filter((o) => o.created_at >= monthAgo);

  const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const weekRevenue = weekOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  // Group by day
  const revenueByDayMap = new Map<string, { revenue: number; orders: number }>();
  allOrders.forEach((order) => {
    const date = order.created_at.split('T')[0];
    const existing = revenueByDayMap.get(date) || { revenue: 0, orders: 0 };
    revenueByDayMap.set(date, {
      revenue: existing.revenue + (order.total || 0),
      orders: existing.orders + 1,
    });
  });

  const revenueByDay = Array.from(revenueByDayMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalRevenue,
    todayRevenue,
    weekRevenue,
    monthRevenue,
    orderCount,
    averageOrderValue,
    revenueByDay,
  };
}

// ============================================================
// RESERVATION METRICS
// ============================================================

export async function getReservationMetrics(
  restaurantId: string,
  days: number = 30
): Promise<ReservationMetrics> {
  const supabase = getSupabase();
  const { start } = getDateRange(days);
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Fetch reservations
  const { data: reservations, error } = await supabase
    .from('reservations')
    .select('party_size, reservation_date, source, status')
    .eq('restaurant_id', restaurantId)
    .gte('created_at', start + 'T00:00:00');

  if (error) {
    console.error('Error fetching reservation metrics:', error);
    return {
      totalReservations: 0,
      todayReservations: 0,
      weekReservations: 0,
      totalGuests: 0,
      averagePartySize: 0,
      bySource: { ai: 0, phone: 0, manual: 0, website: 0, walkIn: 0 },
      byDayOfWeek: [],
      upcomingReservations: 0,
    };
  }

  const allReservations = reservations || [];
  const confirmedReservations = allReservations.filter(
    (r) => r.status !== 'cancelled' && r.status !== 'no_show'
  );

  // Calculate totals
  const totalReservations = confirmedReservations.length;
  const totalGuests = confirmedReservations.reduce((sum, r) => sum + (r.party_size || 0), 0);
  const averagePartySize = totalReservations > 0 ? totalGuests / totalReservations : 0;

  // Filter by time
  const todayReservations = confirmedReservations.filter(
    (r) => r.reservation_date === today
  ).length;
  const weekReservations = confirmedReservations.filter(
    (r) => r.reservation_date >= weekAgo && r.reservation_date <= today
  ).length;

  // Upcoming reservations
  const upcomingReservations = confirmedReservations.filter(
    (r) => r.reservation_date >= today && (r.status === 'pending' || r.status === 'confirmed')
  ).length;

  // By source
  const bySource = { ai: 0, phone: 0, manual: 0, website: 0, walkIn: 0 };
  confirmedReservations.forEach((r) => {
    const source = r.source || 'manual';
    if (source === 'ai' || source === 'chat') bySource.ai++;
    else if (source === 'phone') bySource.phone++;
    else if (source === 'website') bySource.website++;
    else if (source === 'walk_in') bySource.walkIn++;
    else bySource.manual++;
  });

  // By day of week
  const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];
  confirmedReservations.forEach((r) => {
    const date = new Date(r.reservation_date + 'T12:00:00');
    dayOfWeekCounts[date.getDay()]++;
  });
  const byDayOfWeek = dayOfWeekCounts.map((count, i) => ({
    day: getDayOfWeekName(i),
    count,
  }));

  return {
    totalReservations,
    todayReservations,
    weekReservations,
    totalGuests,
    averagePartySize,
    bySource,
    byDayOfWeek,
    upcomingReservations,
  };
}

// ============================================================
// VOICE INSIGHTS
// ============================================================

export async function getVoiceInsights(
  restaurantId: string,
  days: number = 30
): Promise<VoiceInsights> {
  const supabase = getSupabase();
  const { start } = getDateRange(days);

  // Fetch call logs
  const { data: calls, error } = await supabase
    .from('call_logs')
    .select('duration_seconds, sentiment, intent, reservation_id, created_at, status')
    .eq('restaurant_id', restaurantId)
    .gte('created_at', start + 'T00:00:00');

  if (error) {
    console.error('Error fetching voice insights:', error);
    return {
      totalCalls: 0,
      averageDuration: 0,
      conversionRate: 0,
      sentiment: { positive: 0, neutral: 0, negative: 0 },
      topIntents: [],
      callsByDay: [],
    };
  }

  const allCalls = calls || [];
  const totalCalls = allCalls.length;

  if (totalCalls === 0) {
    return {
      totalCalls: 0,
      averageDuration: 0,
      conversionRate: 0,
      sentiment: { positive: 0, neutral: 0, negative: 0 },
      topIntents: [],
      callsByDay: [],
    };
  }

  // Average duration
  const totalDuration = allCalls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0);
  const averageDuration = totalDuration / totalCalls;

  // Conversion rate (calls that resulted in a reservation)
  const conversions = allCalls.filter((c) => c.reservation_id).length;
  const conversionRate = (conversions / totalCalls) * 100;

  // Sentiment breakdown
  const sentiment = { positive: 0, neutral: 0, negative: 0 };
  allCalls.forEach((c) => {
    if (c.sentiment === 'positive') sentiment.positive++;
    else if (c.sentiment === 'negative') sentiment.negative++;
    else sentiment.neutral++;
  });

  // Top intents
  const intentCounts = new Map<string, number>();
  allCalls.forEach((c) => {
    if (c.intent) {
      intentCounts.set(c.intent, (intentCounts.get(c.intent) || 0) + 1);
    }
  });
  const topIntents = Array.from(intentCounts.entries())
    .map(([intent, count]) => ({ intent, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Calls by day
  const callsByDayMap = new Map<string, { calls: number; conversions: number }>();
  allCalls.forEach((call) => {
    const date = call.created_at.split('T')[0];
    const existing = callsByDayMap.get(date) || { calls: 0, conversions: 0 };
    callsByDayMap.set(date, {
      calls: existing.calls + 1,
      conversions: existing.conversions + (call.reservation_id ? 1 : 0),
    });
  });

  const callsByDay = Array.from(callsByDayMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalCalls,
    averageDuration,
    conversionRate,
    sentiment,
    topIntents,
    callsByDay,
  };
}

// ============================================================
// MENU INSIGHTS
// ============================================================

export async function getMenuInsights(
  restaurantId: string,
  days: number = 30
): Promise<MenuInsights> {
  const supabase = getSupabase();
  const { start } = getDateRange(days);

  // Fetch paid orders with items
  const { data: orders, error } = await supabase
    .from('orders')
    .select('items')
    .eq('restaurant_id', restaurantId)
    .eq('payment_status', 'paid')
    .gte('created_at', start + 'T00:00:00');

  if (error) {
    console.error('Error fetching menu insights:', error);
    return { topItems: [], categoryBreakdown: [] };
  }

  // Aggregate item quantities
  const itemStats = new Map<string, { name: string; quantity: number; revenue: number }>();

  (orders || []).forEach((order) => {
    const items = (order.items as Array<{
      id?: string;
      name: string;
      quantity: number;
      line_total?: number;
    }>) || [];

    items.forEach((item) => {
      const key = item.name;
      const existing = itemStats.get(key) || { name: item.name, quantity: 0, revenue: 0 };
      itemStats.set(key, {
        name: item.name,
        quantity: existing.quantity + (item.quantity || 1),
        revenue: existing.revenue + (item.line_total || 0),
      });
    });
  });

  const topItems = Array.from(itemStats.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return {
    topItems,
    categoryBreakdown: [], // Would require joining with menu_categories
  };
}

// ============================================================
// DASHBOARD STATS
// ============================================================

export async function getDashboardStats(
  restaurantId: string
): Promise<DashboardStats> {
  const supabase = getSupabase();

  // Current period (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Fetch current period orders
  const { data: currentOrders } = await supabase
    .from('orders')
    .select('total')
    .eq('restaurant_id', restaurantId)
    .eq('payment_status', 'paid')
    .gte('created_at', thirtyDaysAgo.toISOString());

  // Fetch previous period orders (for comparison)
  const { data: previousOrders } = await supabase
    .from('orders')
    .select('total')
    .eq('restaurant_id', restaurantId)
    .eq('payment_status', 'paid')
    .gte('created_at', sixtyDaysAgo.toISOString())
    .lt('created_at', thirtyDaysAgo.toISOString());

  // Fetch current reservations
  const { data: currentReservations } = await supabase
    .from('reservations')
    .select('party_size')
    .eq('restaurant_id', restaurantId)
    .neq('status', 'cancelled')
    .neq('status', 'no_show')
    .gte('created_at', thirtyDaysAgo.toISOString());

  // Fetch previous reservations
  const { data: previousReservations } = await supabase
    .from('reservations')
    .select('party_size')
    .eq('restaurant_id', restaurantId)
    .neq('status', 'cancelled')
    .neq('status', 'no_show')
    .gte('created_at', sixtyDaysAgo.toISOString())
    .lt('created_at', thirtyDaysAgo.toISOString());

  // Fetch AI conversations (chat sessions)
  const { count: aiConversations } = await supabase
    .from('chat_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .gte('created_at', thirtyDaysAgo.toISOString());

  // Fetch voice calls
  const { data: voiceCalls } = await supabase
    .from('call_logs')
    .select('duration_seconds')
    .eq('restaurant_id', restaurantId)
    .gte('created_at', thirtyDaysAgo.toISOString());

  // Calculate metrics
  const totalRevenue = (currentOrders || []).reduce((sum, o) => sum + (o.total || 0), 0);
  const previousRevenue = (previousOrders || []).reduce((sum, o) => sum + (o.total || 0), 0);

  const totalGuests = (currentReservations || []).reduce((sum, r) => sum + (r.party_size || 0), 0);
  const previousGuests = (previousReservations || []).reduce((sum, r) => sum + (r.party_size || 0), 0);

  // Calculate percentage changes
  const revenueChange = previousRevenue > 0
    ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
    : 0;
  const guestsChange = previousGuests > 0
    ? ((totalGuests - previousGuests) / previousGuests) * 100
    : 0;

  // Estimate time saved (2 min per AI conversation, 3 min per voice call)
  const callMinutes = (voiceCalls || []).reduce((sum, c) => sum + (c.duration_seconds || 0) / 60, 0);
  const chatMinutes = (aiConversations || 0) * 2;
  const timeSavedMinutes = Math.round(chatMinutes + callMinutes);

  return {
    totalRevenue,
    totalGuests,
    aiConversations: aiConversations || 0,
    timeSavedMinutes,
    revenueChange: Math.round(revenueChange * 10) / 10,
    guestsChange: Math.round(guestsChange * 10) / 10,
  };
}

// ============================================================
// LANGUAGE INSIGHTS
// ============================================================

export interface LanguageInsights {
  distribution: Array<{
    language: string;
    count: number;
    name: string;
    flag: string;
  }>;
  opportunities: Array<{
    language: string;
    name: string;
    flag: string;
    callCount: number;
    isSupported: boolean;
  }>;
  supportedLanguages: string[];
}

const LANGUAGE_INFO: Record<string, { name: string; flag: string }> = {
  en: { name: 'English', flag: '🇺🇸' },
  es: { name: 'Spanish', flag: '🇪🇸' },
  fr: { name: 'French', flag: '🇫🇷' },
  de: { name: 'German', flag: '🇩🇪' },
  it: { name: 'Italian', flag: '🇮🇹' },
  pt: { name: 'Portuguese', flag: '🇵🇹' },
  zh: { name: 'Chinese', flag: '🇨🇳' },
  ja: { name: 'Japanese', flag: '🇯🇵' },
  ko: { name: 'Korean', flag: '🇰🇷' },
  ar: { name: 'Arabic', flag: '🇸🇦' },
  hi: { name: 'Hindi', flag: '🇮🇳' },
  ru: { name: 'Russian', flag: '🇷🇺' },
};

// Languages the AI is currently optimized for
const SUPPORTED_AI_LANGUAGES = ['en', 'es', 'fr', 'de'];

export async function getLanguageInsights(
  restaurantId: string,
  days: number = 30
): Promise<LanguageInsights> {
  const supabase = getSupabase();
  const { start } = getDateRange(days);

  // Fetch call logs with language data
  const { data: calls, error } = await supabase
    .from('call_logs')
    .select('language_detected')
    .eq('restaurant_id', restaurantId)
    .gte('created_at', start + 'T00:00:00');

  if (error) {
    console.error('Error fetching language insights:', error);
    return {
      distribution: [],
      opportunities: [],
      supportedLanguages: SUPPORTED_AI_LANGUAGES,
    };
  }

  // Count calls by language
  const languageCounts = new Map<string, number>();
  (calls || []).forEach((call) => {
    const lang = call.language_detected || 'en';
    languageCounts.set(lang, (languageCounts.get(lang) || 0) + 1);
  });

  // Build distribution array
  const distribution = Array.from(languageCounts.entries())
    .map(([language, count]) => {
      const info = LANGUAGE_INFO[language] || { name: language.toUpperCase(), flag: '🌐' };
      return {
        language,
        count,
        name: info.name,
        flag: info.flag,
      };
    })
    .sort((a, b) => b.count - a.count);

  // Build opportunities array
  const opportunities = Array.from(languageCounts.entries()).map(([language, callCount]) => {
    const info = LANGUAGE_INFO[language] || { name: language.toUpperCase(), flag: '🌐' };
    return {
      language,
      name: info.name,
      flag: info.flag,
      callCount,
      isSupported: SUPPORTED_AI_LANGUAGES.includes(language),
    };
  });

  return {
    distribution,
    opportunities,
    supportedLanguages: SUPPORTED_AI_LANGUAGES,
  };
}

// ============================================================
// EXPORTS
// ============================================================

export async function getFullAnalytics(restaurantId: string, days: number = 30) {
  const [revenue, reservations, voice, menu, stats, language] = await Promise.all([
    getRevenueMetrics(restaurantId, days),
    getReservationMetrics(restaurantId, days),
    getVoiceInsights(restaurantId, days),
    getMenuInsights(restaurantId, days),
    getDashboardStats(restaurantId),
    getLanguageInsights(restaurantId, days),
  ]);

  return {
    revenue,
    reservations,
    voice,
    menu,
    stats,
    language,
  };
}
