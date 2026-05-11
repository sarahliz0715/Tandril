import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CompetitorInsightsCard({ data }) {
    const navigate = useNavigate();
    const c = data.content || {};
    const strategies = Array.isArray(c.differentiation_strategies) ? c.differentiation_strategies : [];
    const gaps = Array.isArray(c.market_gaps) ? c.market_gaps : [];
    const successFactors = Array.isArray(c.success_factors) ? c.success_factors : [];

    return (
        <Card className="flex flex-col h-full bg-white/80 backdrop-blur-sm border-slate-200/60 hover:shadow-xl transition-shadow">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Eye className="w-5 h-5 text-blue-500" />
                            Market Landscape
                        </CardTitle>
                        <p className="text-sm text-slate-500 mt-1">for "{data.niche}"</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                {c.seller_types && (
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Who's Selling</p>
                        <p className="text-sm text-slate-700">{c.seller_types}</p>
                    </div>
                )}
                {c.typical_price_points && (
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Typical Price Points</p>
                        <p className="text-sm text-slate-700">{c.typical_price_points}</p>
                    </div>
                )}
                {gaps.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Market Gaps</p>
                        <ul className="space-y-1">
                            {gaps.slice(0, 3).map((gap, i) => (
                                <li key={i} className="text-sm text-slate-700 flex items-start gap-1">
                                    <span className="text-blue-500 mt-0.5">•</span> {gap}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {strategies.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">How Top Sellers Differentiate</p>
                        <div className="flex flex-wrap gap-1">
                            {strategies.slice(0, 4).map((s, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                            ))}
                        </div>
                    </div>
                )}
                {successFactors.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Success Factors</p>
                        <ul className="space-y-1">
                            {successFactors.slice(0, 3).map((f, i) => (
                                <li key={i} className="text-sm text-emerald-700 flex items-start gap-1">
                                    <span className="mt-0.5">✓</span> {f}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {!c.seller_types && gaps.length === 0 && (
                    <p className="text-sm text-slate-400 italic">No market landscape data available.</p>
                )}
            </CardContent>
            <CardFooter>
                <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => navigate(createPageUrl('Commands?prompt=' + encodeURIComponent(`Exploit market gaps in ${data.niche} based on market landscape analysis`)))}
                >
                    <Target className="w-4 h-4 mr-2" />
                    Exploit This Opportunity
                </Button>
            </CardFooter>
        </Card>
    );
}
