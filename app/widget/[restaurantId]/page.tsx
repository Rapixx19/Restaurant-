import { Suspense } from 'react';
import { ChatWidget } from '@/modules/chat/components/ChatWidget';

interface WidgetPageProps {
  params: Promise<{
    restaurantId: string;
  }>;
}

export const metadata = {
  title: 'Chat Widget | VECTERAI',
  description: 'Restaurant AI Chat Assistant',
};

export default async function WidgetPage({ params }: WidgetPageProps) {
  const { restaurantId } = await params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(restaurantId)) {
    return (
      <div className="min-h-screen bg-deep-navy flex items-center justify-center p-4">
        <div className="text-center text-white">
          <p className="text-lg">Invalid restaurant ID</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-deep-navy">
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-pulse text-white">Loading...</div>
          </div>
        }
      >
        <ChatWidget restaurantId={restaurantId} />
      </Suspense>
    </div>
  );
}
