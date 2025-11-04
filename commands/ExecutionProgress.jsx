import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
    Check, 
    Loader2, 
    X, 
    AlertTriangle, 
    Clock,
    Zap,
    CheckCircle2,
    Play
} from 'lucide-react';
import { cn } from "@/lib/utils";

const steps = [
    { id: 'interpreting', name: 'Interpreting' },
    { id: 'awaiting_confirmation', name: 'Planning' },
    { id: 'executing', name: 'Executing' },
    { id: 'completed', name: 'Completed' },
];

export default function ExecutionProgress({ command, onCancel }) {
    if (!command) return null;

    const currentStepIndex = steps.findIndex(step => step.id === command.status);
    const isCompleted = command.status === 'completed';
    const isFailed = command.status === 'failed';

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : isFailed ? (
                        <X className="w-5 h-5 text-red-600" />
                    ) : (
                        <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                    )}
                    Command Execution
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Progress Steps */}
                <nav aria-label="Progress">
                    <ol role="list" className="flex items-center">
                        {steps.map((step, stepIdx) => (
                            <li key={step.name} className={cn("relative", stepIdx !== steps.length - 1 ? "pr-8 sm:pr-20 flex-1" : "")}>
                                {stepIdx <= currentStepIndex || isCompleted ? (
                                    <>
                                        {stepIdx !== steps.length - 1 && (
                                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                                <div className={`h-0.5 w-full ${isCompleted || stepIdx < currentStepIndex ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                                            </div>
                                        )}
                                        <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-700 transition-colors">
                                            {isCompleted || stepIdx < currentStepIndex ? (
                                                <Check className="h-5 w-5 text-white" aria-hidden="true" />
                                            ) : (
                                                <Loader2 className="h-5 w-5 text-white animate-spin" />
                                            )}
                                        </div>
                                        <p className="absolute top-10 left-1/2 -translate-x-1/2 text-xs font-medium text-slate-600 whitespace-nowrap">
                                            {step.name}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        {stepIdx !== steps.length - 1 && (
                                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                                <div className="h-0.5 w-full bg-slate-200" />
                                            </div>
                                        )}
                                        <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-300 bg-white">
                                            <span className="h-2.5 w-2.5 rounded-full bg-transparent" />
                                        </div>
                                        <p className="absolute top-10 left-1/2 -translate-x-1/2 text-xs font-medium text-slate-400 whitespace-nowrap">
                                            {step.name}
                                        </p>
                                    </>
                                )}
                            </li>
                        ))}
                    </ol>
                </nav>

                {/* Status Messages */}
                {command.status === 'executing' && (
                    <Alert className="bg-blue-50 border-blue-200">
                        <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                        <AlertDescription className="text-blue-800">
                            Executing actions on your platforms...
                        </AlertDescription>
                    </Alert>
                )}

                {command.status === 'completed' && command.results && (
                    <Alert className="bg-green-50 border-green-200">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                            Completed! {command.results.success_count || 0} items processed successfully.
                        </AlertDescription>
                    </Alert>
                )}

                {command.status === 'failed' && (
                    <Alert className="bg-red-50 border-red-200">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                            Command execution failed. {command.results?.details?.[0] || 'Please try again.'}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Cancel Button */}
                {(command.status === 'interpreting' || command.status === 'awaiting_confirmation') && (
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        className="w-full"
                    >
                        <X className="w-4 h-4 mr-2" />
                        Cancel Command
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}