import React from 'react';
import { formatCurrency } from '../../utils';

interface StatCardProps {
  title: string;
  amount: number;
  count?: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  trend?: { value: number; label: string };
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, amount, count, icon, color, bgColor, trend, onClick }) => {
  return (
    <div
      className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-100 stat-card cursor-pointer ${onClick ? 'hover:shadow-md' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl ${bgColor} flex items-center justify-center ${color}`}>
          {icon}
        </div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${trend.value >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-slate-800">{formatCurrency(amount)}</p>
        {count !== undefined && (
          <p className="text-xs text-slate-400 mt-1">{count} {count === 1 ? 'expense' : 'expenses'}</p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
