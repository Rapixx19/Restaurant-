import { type LucideIcon, Phone, MessageCircle, CalendarCheck, ShoppingBag, Users, UtensilsCrossed } from 'lucide-react';

/**
 * Feature definition for the landing page feature grid.
 */
export interface Feature {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
}

/**
 * The 6 core features of VECTERAI platform.
 */
export const FEATURES: readonly Feature[] = [
  {
    id: 'phone',
    icon: Phone,
    title: 'AI Phone Agent',
    description:
      'Handle reservations, answer questions, and take orders 24/7 with a voice AI that sounds natural and understands context.',
    gradient: 'from-blue-500 to-cyan-400',
  },
  {
    id: 'chat',
    icon: MessageCircle,
    title: 'Smart Chat Widget',
    description:
      'Embed an intelligent chat assistant on your website that handles customer inquiries instantly.',
    gradient: 'from-purple-500 to-pink-400',
  },
  {
    id: 'reservations',
    icon: CalendarCheck,
    title: 'Reservation System',
    description:
      'Automated booking management with smart table allocation, waitlist handling, and confirmation reminders.',
    gradient: 'from-green-500 to-emerald-400',
  },
  {
    id: 'orders',
    icon: ShoppingBag,
    title: 'Order Processing',
    description:
      'Accept and manage takeout and delivery orders seamlessly through phone, chat, or your website.',
    gradient: 'from-orange-500 to-amber-400',
  },
  {
    id: 'profiles',
    icon: Users,
    title: 'Customer Profiles',
    description:
      'Build rich customer profiles with preferences, allergies, visit history, and personalized recommendations.',
    gradient: 'from-red-500 to-rose-400',
  },
  {
    id: 'menu',
    icon: UtensilsCrossed,
    title: 'Menu Management',
    description:
      'Easily update your menu, manage seasonal items, and sync changes across all AI touchpoints instantly.',
    gradient: 'from-indigo-500 to-violet-400',
  },
] as const;
