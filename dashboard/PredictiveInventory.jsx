import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, AlertTriangle, ArrowRight, TrendingUp } from "lucide-react";

// Mock data simulation - in a real app, this would be calculated based on sales history
const mockInventoryPredictions = [
    { productId: '1', stockoutDays: 8, velocity: 12, risk: 'high' },
    { productId: '2', stockoutDays: 25, velocity: 5, risk: 'medium' },
    { productId: '3', stockoutDays: 4, velocity: 20, risk: 'high' },
    { productId: '4', stockoutDays: 60, velocity: 2, risk: 'low' },
];

const riskStyles = {
    high: {
        iconColor: 'text-red-600',
        bgColor: 'bg-red-50 border-red-200',
        badgeColor: 'bg-red-100 text-red-700 border-red-200',
    },
    medium: {
        iconColor: 'text-orange-600',
        bgColor: 'bg-orange-50 border-orange-200',
        badgeColor: 'bg-orange-100 text-orange-700 border-orange-200',
    },
    low: {
        iconColor: 'text-green-600',
        bgColor: 'bg-green-50 border-green-200',
        badgeColor: 'bg-green-100 text-green-700 border-green-200',
    }
};

export default function PredictiveInventory({ products, isLoading }) {

  if (isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border border-slate-200/60">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-900">Predictive Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-slate-200 rounded-xl"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const productsWithPredictions = products
    .map(product => {
      const prediction = mockInventoryPredictions.find(p => p.productId === product.id);
      return prediction ? { ...product, ...prediction } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.stockoutDays - b.stockoutDays);

  return (
    <Card className="bg-white/80 backdrop-blur-sm border border-slate-200/60 hover:shadow-xl transition-all duration-500 h-full">
      <CardHeader className="border-b border-slate-100">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
             <div className="p-2 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl">
                <Package className="w-5 h-5 text-white" />
            </div>
            Predictive Inventory
          </CardTitle>
        </div>
        <p className="text-sm text-slate-600 pt-2">AI-powered forecasts to prevent stock-outs.</p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {productsWithPredictions.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium mb-2">No inventory data available</p>
              <p className="text-sm text-slate-400">Sync your products to enable predictions</p>
            </div>
          ) : (
            productsWithPredictions.slice(0, 4).map((item) => {
              const styles = riskStyles[item.risk];
              return (
                <div key={item.id} className={`p-4 rounded-xl ${styles.bgColor}`}>
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-slate-900 flex-1 mr-4">{item.name}</p>
                    <Badge className={`${styles.badgeColor} border font-medium capitalize`}>
                      <AlertTriangle className={`w-3 h-3 mr-1 ${styles.iconColor}`} />
                      {item.risk} Risk
                    </Badge>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                        <p className="text-xs text-slate-500">Stockout In</p>
                        <p className="text-lg font-bold text-slate-800">{item.stockoutDays} Days</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-500">Sales Velocity</p>
                        <div className="flex items-center gap-1 font-bold text-slate-800">
                           <TrendingUp className="w-4 h-4 text-green-500" />
                           <span>{item.velocity}/day</span>
                        </div>
                    </div>
                  </div>
                   <Button variant="outline" size="sm" className="w-full mt-3 bg-white/50">
                        Create Reorder Command
                   </Button>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}