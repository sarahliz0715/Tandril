import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, TrendingUp, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function KeywordOpportunitiesCard({ data }) {
    const navigate = useNavigate();
    
    const competitionColor = (level) => {
        if (level === 'low') return 'bg-green-100 text-green-800';
        if (level === 'medium') return 'bg-yellow-100 text-yellow-800';
        return 'bg-red-100 text-red-800';
    };

    return (
        <Card className="flex flex-col h-full bg-white/80 backdrop-blur-sm border-slate-200/60 hover:shadow-xl transition-shadow">
            <CardHeader>
                 <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Search className="w-5 h-5 text-purple-500" />
                            Keyword Opportunities
                        </CardTitle>
                        <p className="text-sm text-slate-500 mt-1">for "{data.category}"</p>
                    </div>
                    <Badge variant="outline">Confidence: {data.confidence_score || 'N/A'}</Badge>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm text-slate-600 mb-4">{data.insights?.summary}</p>
                <div className="space-y-2">
                    {data.trending_keywords?.slice(0, 4).map((kw, index) => (
                        <div key={index} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                            <div>
                                <p className="text-sm font-medium text-slate-800">{kw.keyword}</p>
                                <p className="text-xs text-green-600 flex items-center">
                                    <TrendingUp className="w-3 h-3 mr-1" />
                                    {kw.volume_growth}% growth
                                </p>
                            </div>
                            <div className="text-right">
                                <Badge className={competitionColor(kw.competition)}>{kw.competition}</Badge>
                                <p className="text-xs text-slate-500 mt-1">Score: {kw.opportunity_score}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
            <CardFooter>
                 <Button 
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => navigate(createPageUrl('Commands?prompt=' + encodeURIComponent(`Update SEO for my ${data.category} products using these keywords: ${data.trending_keywords?.map(k=>k.keyword).join(', ')}`)))}
                >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Apply SEO Insights
                </Button>
            </CardFooter>
        </Card>
    );
}