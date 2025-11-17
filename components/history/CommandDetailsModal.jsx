import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, RotateCcw, Loader2, Info, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { revertShopifyCommand } from '@/api/functions';

export default function CommandDetailsModal({ command, onClose, onCommandUpdate }) {
    const [revertingAction, setRevertingAction] = useState(null);

    const handleRevert = async (action, index) => {
        if (!action.result?.revert_data) {
            toast.error("Cannot revert this action", { description: "No revert data available." });
            return;
        }

        setRevertingAction(index);
        try {
            const response = await revertShopifyCommand({
                commandId: command.id,
                actionIndex: index,
                revertData: action.result.revert_data,
            });

            if (response.data?.success) {
                toast.success('Action reverted successfully.');
                onCommandUpdate();
            } else {
                throw new Error(response.data?.error || 'Failed to revert action.');
            }
        } catch (error) {
            console.error('Revert error:', error);
            toast.error('Failed to revert action.', {
                description: error.message,
            });
        } finally {
            setRevertingAction(null);
        }
    };

    if (!command) return null;

    const results = command.shopify_results || [];

    return (
        <Dialog open={!!command} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Command Details</DialogTitle>
                    <DialogDescription className="break-words">
                        "{command.command_text}"
                    </DialogDescription>
                </DialogHeader>
                <div className="my-2">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                            <Badge variant={command.status === 'completed' ? 'secondary' : 'destructive'}>
                                {command.status.replace('_', ' ')}
                            </Badge>
                        </span>
                        <span>
                            {results.length} Actions ({command.results?.success_count || 0} Succeeded, {command.results?.failure_count || 0} Failed)
                        </span>
                        <span>
                            Time taken: {command.execution_time || 'N/A'}s
                        </span>
                    </div>
                </div>

                <div className="flex-grow overflow-hidden relative">
                  <ScrollArea className="h-full pr-4 -mr-4">
                      <div className="space-y-3">
                          {results.length > 0 ? results.map((action, index) => (
                              <div key={index} className="p-3 rounded-lg border bg-slate-50 text-sm">
                                  <div className="flex items-start justify-between">
                                      <div className="flex items-start gap-3 flex-1 min-w-0">
                                          {action.status === 'success' ? <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />}
                                          <p className="flex-1 break-words">
                                              {action.result?.reverted 
                                                  ? <span className="line-through text-slate-500">{action.result.revert_message || action.result.message}</span> 
                                                  : (action.result.message || 'No details available.')
                                              }
                                          </p>
                                      </div>
                                      <div className="ml-4 flex-shrink-0">
                                          {action.result?.reverted ? (
                                              <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">
                                                  <RotateCcw className="w-3 h-3 mr-1" />
                                                  Reverted
                                              </Badge>
                                          ) : action.status === 'success' && action.result?.revert_data ? (
                                              <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="h-7 text-xs text-slate-500 hover:text-orange-600 hover:bg-orange-50"
                                                  onClick={() => handleRevert(action, index)}
                                                  disabled={revertingAction === index}
                                              >
                                                  {revertingAction === index ? (
                                                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                  ) : (
                                                      <RotateCcw className="w-3 h-3 mr-1" />
                                                  )}
                                                  Undo
                                              </Button>
                                          ) : null}
                                      </div>
                                  </div>
                              </div>
                          )) : (
                              <div className="text-center py-10 text-slate-500 flex flex-col items-center gap-3">
                                  <Info className="w-8 h-8 text-slate-300" />
                                  <p>No detailed actions were recorded for this command.</p>
                              </div>
                          )}
                      </div>
                  </ScrollArea>
                </div>
                <DialogFooter className="pt-4 border-t">
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}