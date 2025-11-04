import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, DollarSign } from 'lucide-react';

export default function AdSpendVsRevenue({ data }) {
  const roas = data.totalSpend > 0 ? (data.totalRevenue / data.totalSpend) : 0;

  return (
    <Card className="bg-white/80 backdrop-blur-sm border border-slate-200/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-red-600" />
          Ad Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-around text-center">
          <div>
            <p className="text-sm font-semibold text-slate-500">Spend</p>
            <p className="text-2xl font-bold text-red-600">${data.totalSpend.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Revenue</p>
            <p className="text-2xl font-bold text-green-600">${Math.floor(data.totalRevenue).toLocaleString()}</p>
          </div>
        </div>
        <div className="text-center p-4 bg-slate-50 rounded-xl">
          <p className="text-sm font-semibold text-slate-500">Return on Ad Spend (ROAS)</p>
          <p className="text-4xl font-bold text-slate-900 mt-1">{roas.toFixed(2)}x</p>
        </div>
      </CardContent>
    </Card>
  );
}