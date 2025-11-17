import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Microscope, Users, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function NicheAnalysisCard({ data }) {
    const navigate = useNavigate();

    // The data for this card comes directly from the LLM prompt I crafted.
    // I'm assuming it will return an object with keys like 'target_customer_personas' and 'product_ideas'
    // This is a bit of a placeholder, actual keys might differ and I'll adjust as needed.
    const insights = data.insights || {};
    const personas = insights.target_customer_personas || [];
    const ideas = insights.product_ideas || [];

    return (
        <Card className="flex flex-col h-full bg-white/80 backdrop-blur-sm border-slate-200/60 hover:shadow-xl transition-shadow">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Microscope className="w-5 h-5 text-teal-500" />
                            Niche Analysis
                        </CardTitle>
                        <p className="text-sm text-slate-500 mt-1">for "{data.category}"</p>
                    </div>
                     <Badge variant="outline">Confidence: {data.confidence_score || 'N/A'}</Badge>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                 <p className="text-sm text-slate-600 mb-4">{data.insights?.summary}</p>
                 <div className="space-y-3">
                    {personas.length > 0 && (
                        <div>
                            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1"><Users className="w-3 h-3"/>Target Personas</h4>
                            <div className="flex flex-wrap gap-1">
                                {personas.map(p => <Badge key={p} variant="secondary">{p}</Badge>)}
                            </div>
                        </div>
                    )}
                    {ideas.length > 0 && (
                        <div>
                            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Product Ideas</h4>
                            <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                                {ideas.map((idea, i) => <li key={i}>{idea}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter>
                <Button 
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => navigate(createPageUrl('Commands?prompt=' + encodeURIComponent(`Create a new product for the ${data.category} niche.`)))}
                >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Develop Niche Product
                </Button>
            </CardFooter>
        </Card>
    );
}