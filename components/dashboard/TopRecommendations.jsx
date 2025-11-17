import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Lightbulb, ArrowRight, Sparkles } from "lucide-react";

const impactStyles = {
    "Critical": "bg-red-100 text-red-800 border-red-200",
    "High": "bg-orange-100 text-orange-800 border-orange-200",
    "Medium": "bg-yellow-100 text-yellow-800 border-yellow-200",
};

export default function TopRecommendations({ recommendations, isLoading }) {
  if (isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border border-slate-200/60">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-900">AI Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1,2].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-slate-200 rounded-xl"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const topRecs = recommendations
    .filter(r => r.status === 'new')
    .sort((a, b) => {
        const order = { "Critical": 0, "High": 1, "Medium": 2, "Low": 3 };
        return order[a.impact_level] - order[b.impact_level];
    });

  return (
    <Card className="bg-white/80 backdrop-blur-sm border border-slate-200/60 hover:shadow-xl transition-all duration-500 h-full">
      <CardHeader className="border-b border-slate-100">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
             <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl">
                <Lightbulb className="w-5 h-5 text-white" />
            </div>
            Top AI Recommendations
          </CardTitle>
        </div>
        <p className="text-sm text-slate-600 pt-2">High-impact growth opportunities identified by your AI Advisor.</p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {topRecs.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium mb-2">No new recommendations</p>
              <p className="text-sm text-slate-400">Your AI is analyzing your business for opportunities.</p>
            </div>
          ) : (
            topRecs.slice(0, 3).map((item) => (
              <div key={item.id} className="p-4 rounded-xl bg-slate-50/50 border border-slate-200/60">
                <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-slate-900 flex-1 mr-4">{item.title}</p>
                    <Badge className={`${impactStyles[item.impact_level]} font-medium capitalize`}>
                      {item.impact_level} Impact
                    </Badge>
                </div>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-xs text-slate-500">Potential Gain</p>
                        <p className="text-lg font-bold text-green-600">{item.potential_gain}</p>
                    </div>
                    <Link to={createPageUrl("Advisor")}>
                        <Button variant="outline" size="sm" className="bg-white/50">
                            View Plan <ArrowRight className="w-3 h-3 ml-2" />
                        </Button>
                    </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}