import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertTriangle, RotateCcw, Play, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function FinalConfirmation({ command, onDismiss, onRunAll }) {
    const [showDetails, setShowDetails] = useState(false);
    const navigate = useNavigate();

    if (!command) return null;

    const hasRealResults = command.shopify_results && command.shopify_results.length > 0;
    const hasDetails = command.results?.details && command.results.details.length > 0;
    
    // Determine if we should show detailed results
    const showDetailedResults = hasRealResults || hasDetails;

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
            case 'partially_completed': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            default: return <Clock className="w-5 h-5 text-blue-500" />;
        }
    };

    const handleViewHistory = () => {
        navigate(createPageUrl('History'));
        onDismiss();
    };

    const handleUndoCommand = () => {
        // This will trigger an undo command
        navigate(createPageUrl(`Commands?prompt=${encodeURIComponent(`Undo the changes from: ${command.command_text}`)}`));
        onDismiss();
    };

    return (
        <Dialog open={true} onOpenChange={onDismiss}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {getStatusIcon(command.status)}
                        {command.status === 'completed' ? 'Execution Completed' : 
                         command.status === 'failed' ? 'Execution Failed' : 
                         'Execution Partially Completed'}
                    </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                    <p className="text-slate-600">
                        The command "{command.command_text}" has finished. Review the results below.
                    </p>
                    
                    {/* Results Summary */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="text-2xl font-bold text-green-600">
                                {command.results?.success_count || 0}
                            </div>
                            <div className="text-sm text-green-600 font-medium">SUCCEEDED</div>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                            <div className="text-2xl font-bold text-red-600">
                                {command.results?.failure_count || 0}
                            </div>
                            <div className="text-sm text-red-600 font-medium">FAILED</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="text-2xl font-bold text-blue-600">
                                {command.execution_time || 0}s
                            </div>
                            <div className="text-sm text-blue-600 font-medium">DURATION</div>
                        </div>
                    </div>

                    {/* Detailed Results */}
                    <div>
                        <h3 className="font-semibold text-slate-900 mb-3">Execution Log:</h3>
                        
                        {showDetailedResults ? (
                            <div className="space-y-2">
                                {hasRealResults ? (
                                    // Show real Shopify results
                                    command.shopify_results.map((result, index) => (
                                        <div 
                                            key={index}
                                            className={`p-3 rounded-lg border ${
                                                result.result?.success 
                                                    ? 'bg-green-50 border-green-200' 
                                                    : 'bg-red-50 border-red-200'
                                            }`}
                                        >
                                            <div className="flex items-start gap-2">
                                                {result.result?.success ? (
                                                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-red-500 mt-0.5" />
                                                )}
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">
                                                        {result.product_title || `Product ${index + 1}`}
                                                    </p>
                                                    <p className="text-xs text-slate-600 mt-1">
                                                        {result.result?.message || 'No details available'}
                                                    </p>
                                                    {result.product_id && (
                                                        <p className="text-xs text-slate-500">
                                                            ID: {result.product_id}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : hasDetails ? (
                                    // Show basic details
                                    command.results.details.map((detail, index) => (
                                        <div key={index} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                            <p className="text-sm text-slate-700">{detail}</p>
                                        </div>
                                    ))
                                ) : null}
                                
                                {/* Show processing summary if available */}
                                {command.results?.total_found && (
                                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                        <p className="text-sm text-blue-700">
                                            <strong>Summary:</strong> Found {command.results.total_found} products, processed {command.results.processed_count || command.results.success_count || 0}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // No detailed results available
                            <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
                                <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                <p className="text-slate-500">No detailed execution results were returned.</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    This may be a mock execution or the command did not produce a specific log.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                        <Button 
                            variant="outline" 
                            onClick={handleUndoCommand}
                            className="flex items-center gap-2"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Undo This Command
                        </Button>
                        
                        {command.results?.total_found && command.results.total_found > (command.results.processed_count || 0) && (
                            <Button 
                                onClick={() => onRunAll(command.command_text, command.results.total_found)}
                                className="flex items-center gap-2"
                            >
                                <Play className="w-4 h-4" />
                                Process All {command.results.total_found} Items
                            </Button>
                        )}
                        
                        <Button 
                            variant="outline" 
                            onClick={handleViewHistory}
                            className="flex items-center gap-2"
                        >
                            <ExternalLink className="w-4 h-4" />
                            View History
                        </Button>
                    </div>
                </div>
                
                <DialogFooter>
                    <Button onClick={onDismiss}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}