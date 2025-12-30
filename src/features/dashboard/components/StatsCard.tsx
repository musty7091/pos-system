// src/features/dashboard/components/StatsCard.tsx
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string; // Opsiyonel: "+%5 arttı" gibi
  color?: 'blue' | 'green' | 'orange' | 'purple';
}

export default function StatsCard({ title, value, icon: Icon, trend, color = 'blue' }: StatsCardProps) {
  
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${colorMap[color]}`}>
          <Icon size={24} />
        </div>
        {trend && (
          <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
          {title}
        </p>
        <h3 className="text-2xl font-black text-slate-800">
          {value}
        </h3>
      </div>
    </div>
  );
}