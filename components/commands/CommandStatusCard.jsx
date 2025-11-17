import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, CornerDownRight } from 'lucide-react';
import ExecutionProgress from './ExecutionProgress';

export default function CommandStatusCard({ command }) {
    const [actions, setActions] = useState(command.actions_planned.map(a => ({ ...a, status: 'pending' })));

    useEffect(() => {
        const timer = setTimeout(() => {
            setActions(prevActions => {
                const nextPendingIndex = prevActions.findIndex(a => a.status === 'pending');
                if (nextPendingIndex === -1) {
                    clearTimeout(timer);
                    return prevActions;
                }
                const newActions = [...prevActions];
                newActions[nextPendingIndex] = { ...newActions[nextPendingIndex], status: 'completed' };
                return newActions;
            });
        }, 1000);

        return () => clearTimeout(timer);
    }, [actions]);

    return (
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
            <CardHeader>
                <CardTitle className="text-xl">Executing Command...</CardTitle>
                <p className="text-sm text-slate-600 pt-2">"{command.command_text}"</p>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="py-4">
                    <ExecutionProgress status={command.status} />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-800 mb-2">Execution Log:</h3>
                    <div className="space-y-2">
                        {actions.map((action, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/50">
                                {action.status === 'completed' ? 
                                    <Check className="w-4 h-4 text-green-500 mt-1 flex-shrink-0"/> :
                                    <Loader2 className="w-4 h-4 text-blue-500 mt-1 flex-shrink-0 animate-spin"/>
                                }
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">{action.platform}</Badge>
                                        <p className="font-medium text-slate-700">{action.action_type}</p>
                                    </div>
                                    <p className="text-sm text-slate-600 mt-1">{action.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}