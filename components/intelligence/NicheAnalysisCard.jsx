import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Microscope, PlusCircle, TrendingUp, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function NicheAnalysisCard({ data }) {
    const navigate = useNavigate();
    const c = data.content || {};
    const opportunities = Array.isArray(c.opportunities) ? c.opportunities : [];
    const threats = Array.isArray(c.threats) ? c.threats : [];

    return (
        <Card className="flex flex-col h-full bg-white/80 backdrop-blur-sm border-slate-200/60 hover:shadow-xl transition-shadow">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Microscope className="w-5 h-5 text-teal-500" />
                            Niche Analysis
                        </CardTitle>
                        <p className="text-sm text-slate-500 mt-1">for "{data.niche}"</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                {(c.market_size || c.growth_trend) && (
                    <div className="grid grid-cols-2 gap-3">
                        {c.market_size && (
                            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Market Size</p>
                                <p className="text-sm text-slate-800">{c.market_size}</p>
                            </div>
                        )}
                        {c.growth_trend && (
                            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Growth Trend</p>
                                <p className="text-sm text-slate-800">{c.growth_trend}</p>
                            </div>
                        )}
                    </div>
                )}
                {c.demographics && (
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Key Demographics</p>
                        <p className="text-sm text-slate-700">{c.demographics}</p>
                    </div>
                )}
                {opportunities.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-green-600" /> Opportunities
                        </p>
                        <ul className="space-y-1">
                            {opportunities.slice(0, 3).map((o, i) => (
                                <li key={i} className="text-sm text-slate-700 flex items-start gap-1">
                                    <span className="text-green-500 mt-0.5">•</span> {o}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {threats.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-500" /> Threats
                        </p>
                        <ul className="space-y-1">
                            {threats.slice(0, 2).map((t, i) => (
                                <li key={i} className="text-sm text-slate-700 flex items-start gap-1">
                                    <span className="text-amber-500 mt-0.5">•</span> {t}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {c.seasonality && (
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Seasonality</p>
                        <p className="text-sm text-slate-700">{c.seasonality}</p>
                    </div>
                )}
                {!c.market_size && !c.growth_trend && opportunities.length === 0 && (
                    <p className="text-sm text-slate-400 italic">No niche analysis data available.</p>
                )}
            </CardContent>
            <CardFooter>
                <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => navigate(createPageUrl('Commands?prompt=' + encodeURIComponent(`Create a new product for the ${data.niche} niche.`)))}
                >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Develop Niche Product
                </Button>
            </CardFooter>
        </Card>
    );
}
