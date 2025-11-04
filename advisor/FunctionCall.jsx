import React, { useState } from 'react';
import { Loader2, CheckCircle, AlertCircle, Database, Search, ChevronRight } from 'lucide-react';
import { cn } from "@/lib/utils";

const toolIcons = {
    'Order.read': Database,
    'InventoryItem.read': Database,
    'Platform.read': Database,
    'CustomerProfile.read': Database,
    'MarketIntelligence.read': Database,
    'AICommand.read': Database,
    'AICommand.create': Database,
    'web_search': Search,
    'Thinking...': Loader2
};

const statusConfig = {
    running: { icon: Loader2, color: 'text-slate-500', spin: true },
    completed: { icon: CheckCircle, color: 'text-green-600', spin: false },
    failed: { icon: AlertCircle, color: 'text-red-500', spin: false },
    success: { icon: CheckCircle, color: 'text-green-600', spin: false },
    error: { icon: AlertCircle, color: 'text-red-500', spin: false },
};

export default function FunctionCall({ toolCall }) {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const { name, status, results } = toolCall;
    const Icon = toolIcons[name] || Search;
    const StatusIcon = statusConfig[status]?.icon || Loader2;
    const statusColor = statusConfig[status]?.color || 'text-slate-500';
    const isSpinning = statusConfig[status]?.spin || false;

    // A more readable name for the tool
    const displayName = name.replace('.read', '').replace('Item', '').replace('AI', '');

    return (
        <div className="bg-slate-100 border border-slate-200/80 rounded-lg text-xs">
            <button 
                className="w-full flex items-center justify-between p-2 text-left"
                onClick={() => setIsExpanded(!isExpanded)}
                disabled={!results}
            >
                <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-medium text-slate-700">
                        {status === 'running' ? `Analyzing ${displayName}...` : `Analyzed ${displayName}`}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <StatusIcon className={cn("w-3.5 h-3.5", statusColor, isSpinning && "animate-spin")} />
                    {results && <ChevronRight className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", isExpanded && "rotate-90")} />}
                </div>
            </button>
            {isExpanded && results && (
                 <div className="px-3 pb-3 border-t border-slate-200">
                     <pre className="text-xs text-slate-600 bg-white/80 p-2 rounded-md mt-2 max-h-40 overflow-auto">
                        {(() => {
                            try {
                                const parsed = typeof results === 'string' ? JSON.parse(results) : results;
                                return JSON.stringify(parsed, null, 2);
                            } catch {
                                return String(results);
                            }
                        })()}
                     </pre>
                 </div>
            )}
        </div>
    );
}