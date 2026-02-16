import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingForm } from '@/modules/onboarding';

export const metadata = {
  title: 'Set Up Your Restaurant | VECTERAI',
  description: 'Create your restaurant profile to get started with VECTERAI',
};

/**
 * Onboarding page for new users to create their restaurant.
 */
export default async function OnboardingPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user already has a restaurant
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', user.id)
    .single();

  // If they already have a restaurant, redirect to dashboard
  if (restaurant) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <OnboardingForm />
    </div>
  );
}
