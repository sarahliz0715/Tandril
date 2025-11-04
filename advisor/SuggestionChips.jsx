import React from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, TrendingUp, Package } from 'lucide-react';

const suggestions = [
    { icon: TrendingUp, text: "What were my top 3 best-selling products last month?" },
    { icon: Package, text: "Which products are running low on stock?" },
    { icon: Lightbulb, text: "Give me a marketing idea for my store." },
];

export default function SuggestionChips({ onSuggestionClick }) {
    return (
        <div className="mb-3 flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
                <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="h-auto py-1.5 px-3 text-xs bg-white/80"
                    onClick={() => onSuggestionClick(suggestion.text)}
                >
                    <suggestion.icon className="w-3.5 h-3.5 mr-2 opacity-70" />
                    {suggestion.text}
                </Button>
            ))}
        </div>
    );
}