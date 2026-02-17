'use client';

import { useState } from 'react';
import { Store, Bot, Clock, Bell, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InfoTab } from './InfoTab';
import { AIConfigTab } from './AIConfigTab';
import { CapacityTab } from './CapacityTab';
import { NotificationsTab } from './NotificationsTab';
import { VoiceTab } from './VoiceTab';
import type { Restaurant } from '@/lib/supabase/types';

interface SettingsTabsProps {
  restaurant: Restaurant;
  userId: string;
}

type TabId = 'info' | 'ai' | 'capacity' | 'notifications' | 'voice';

interface Tab {
  id: TabId;
  label: string;
  icon: typeof Store;
  description: string;
}

const tabs: Tab[] = [
  {
    id: 'info',
    label: 'Info',
    icon: Store,
    description: 'Basic restaurant information',
  },
  {
    id: 'ai',
    label: 'AI Config',
    icon: Bot,
    description: 'AI behavior settings',
  },
  {
    id: 'capacity',
    label: 'Capacity',
    icon: Clock,
    description: 'Hours and party size',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    description: 'Email and SMS settings',
  },
  {
    id: 'voice',
    label: 'Voice',
    icon: Phone,
    description: 'Phone AI settings',
  },
];

export function SettingsTabs({ restaurant, userId }: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('info');

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 p-1 bg-white/5 rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg',
              'text-sm font-medium transition-all duration-200',
              activeTab === tab.id
                ? 'bg-electric-blue text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-card border border-white/10 rounded-2xl p-6">
        {activeTab === 'info' && <InfoTab restaurant={restaurant} userId={userId} />}
        {activeTab === 'ai' && <AIConfigTab restaurant={restaurant} />}
        {activeTab === 'capacity' && <CapacityTab restaurant={restaurant} />}
        {activeTab === 'notifications' && <NotificationsTab restaurant={restaurant} />}
        {activeTab === 'voice' && <VoiceTab restaurant={restaurant} />}
      </div>
    </div>
  );
}
