import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Zap, Star } from 'lucide-react';

export default function WorkflowTemplateCard({ template, onUse }) {
    if (!template || !template.workflow_data) {
        return null; // Don't render if template data is invalid
    }

    const workflowData = template.workflow_data;
    
    // Safely access trigger data with fallbacks
    const triggerType = workflowData.trigger_type || 'manual';
    const triggerConfig = workflowData.trigger_config || {};
    
    // Build trigger description
    const getTriggerDescription = () => {
        if (triggerType === 'schedule') {
            const frequency = triggerConfig.frequency || 'daily';
            return `Runs ${frequency}`;
        } else if (triggerType === 'event') {
            return 'Triggered by events';
        }
        return 'Manual trigger';
    };

    // Get number of actions
    const actionCount = workflowData.commands?.length || workflowData.nodes?.length || 0;

    return (
        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                            {template.icon && <span className="text-2xl">{template.icon}</span>}
                            <span>{template.name}</span>
                        </CardTitle>
                        <p className="text-sm text-slate-600 mt-1">{template.description}</p>
                    </div>
                    {template.is_featured && (
                        <Badge className="bg-amber-100 text-amber-800">
                            <Star className="w-3 h-3 mr-1" />
                            Featured
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                            {template.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {getTriggerDescription()}
                        </Badge>
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            {actionCount} action{actionCount !== 1 ? 's' : ''}
                        </Badge>
                    </div>
                    
                    <Button 
                        onClick={() => onUse(template)} 
                        className="w-full"
                    >
                        Use This Template
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}