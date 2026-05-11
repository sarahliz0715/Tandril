import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const competitionColor = (level) => {
    if (!level) return 'bg-slate-100 text-slate-700';
    if (level.toLowerCase() === 'low') return 'bg-green-100 text-green-800';
    if (level.toLowerCase() === 'medium') return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
};

const intentColor = (intent) => {
    if (!intent) return 'text-slate-500';
    if (intent.toLowerCase() === 'buy') return 'text-green-600';
    if (intent.toLowerCase() === 'compare') return 'text-blue-600';
    return 'text-slate-500';
};

export default function KeywordOpportunitiesCard({ data }) {
    const navigate = useNavigate();
    const keywords = Array.isArray(data.content) ? data.content : [];

    return (
        <Card className="flex flex-col h-full bg-white/80 backdrop-blur-sm border-slate-200/60 hover:shadow-xl transition-shadow">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Search className="w-5 h-5 text-green-500" />
                            Keyword Opportunities
                        </CardTitle>
                        <p className="text-sm text-slate-500 mt-1">for "{data.niche}"</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-2">
                {keywords.slice(0, 8).map((kw, index) => (
                    <div key={index} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{kw.keyword}</p>
                            {kw.tip && <p className="text-xs text-slate-500 mt-0.5">{kw.tip}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                            {kw.competition && (
                                <Badge className={`text-xs ${competitionColor(kw.competition)}`}>{kw.competition}</Badge>
                            )}
                            {kw.intent && (
                                <span className={`text-xs font-medium ${intentColor(kw.intent)}`}>{kw.intent}</span>
                            )}
                        </div>
                    </div>
                ))}
                {keywords.length === 0 && (
                    <p className="text-sm text-slate-400 italic">No keyword data available.</p>
                )}
            </CardContent>
            <CardFooter>
                <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => navigate(createPageUrl('Commands?prompt=' + encodeURIComponent(`Update SEO for my ${data.niche} products using these keywords: ${keywords.slice(0, 8).map(k => k.keyword).join(', ')}`)))}
                >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Apply SEO Insights
                </Button>
            </CardFooter>
        </Card>
    );
}
