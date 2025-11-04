import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, DollarSign, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CompetitorInsightsCard({ data }) {
    const navigate = useNavigate();
    const prices = data.competitor_data?.price_ranges;

    return (
        <Card className="flex flex-col h-full bg-white/80 backdrop-blur-sm border-slate-200/60 hover:shadow-xl transition-shadow">
            <CardHeader>
                 <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Eye className="w-5 h-5 text-blue-500" />
                            Competitor Insights
                        </CardTitle>
                        <p className="text-sm text-slate-500 mt-1">for "{data.category}"</p>
                    </div>
                    <Badge variant="outline">Confidence: {data.confidence_score || 'N/A'}</Badge>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm text-slate-600 mb-4">{data.insights?.summary}</p>
                <div className="space-y-3">
                    <div>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Top Competitors</h4>
                        <div className="flex flex-wrap gap-1">
                            {data.competitor_data?.top_performers?.map(comp => (
                                <Badge key={comp} variant="secondary">{comp}</Badge>
                            ))}
                        </div>
                    </div>
                     <div>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Market Price Range</h4>
                        {prices && (
                            <div className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded-md">
                                <span className="text-red-600 font-medium">${prices.low}</span>
                                <span className="text-slate-700 font-bold">${prices.average}</span>
                                <span className="text-green-600 font-medium">${prices.high}</span>
                            </div>
                        )}
                    </div>
                    <div>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Identified Gaps</h4>
                        <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                            {data.competitor_data?.gaps_identified?.map((gap, i) => <li key={i}>{gap}</li>)}
                        </ul>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button 
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => navigate(createPageUrl('Commands?prompt=' + encodeURIComponent(`Exploit market gaps in ${data.category} based on competitor analysis`)))}
                >
                    <Target className="w-4 h-4 mr-2" />
                    Exploit This Opportunity
                </Button>
            </CardFooter>
        </Card>
    );
}