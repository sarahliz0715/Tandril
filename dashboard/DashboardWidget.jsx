import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardWidget({ 
    id, 
    title, 
    children, 
    isDragging, 
    isVisible = true, 
    onToggleVisibility,
    dragHandleProps,
    className = "",
    showControls = true 
}) {
    return (
        <div 
            className={cn(
                "group relative",
                isDragging && "opacity-50 scale-95 shadow-2xl z-50",
                !isVisible && "opacity-40",
                className
            )}
        >
            {showControls && (
                <div className="absolute -top-2 -right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <div
                        {...dragHandleProps}
                        className="p-2 bg-white rounded-lg shadow-lg border cursor-grab active:cursor-grabbing hover:bg-slate-50"
                        title="Drag to reorder"
                    >
                        <GripVertical className="w-4 h-4 text-slate-400" />
                    </div>
                    <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 bg-white shadow-lg"
                        onClick={() => onToggleVisibility?.(id)}
                        title={isVisible ? "Hide widget" : "Show widget"}
                    >
                        {isVisible ? 
                            <EyeOff className="w-4 h-4" /> : 
                            <Eye className="w-4 h-4" />
                        }
                    </Button>
                </div>
            )}
            
            <div className={cn("transition-all duration-200", !isVisible && "filter grayscale")}>
                {children}
            </div>
        </div>
    );
}