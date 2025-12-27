
import React from 'react'; // useState removed as isEditing/editedCommandText are no longer managed here
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    AlertCircle, 
    CheckCircle, 
    Edit, 
    RotateCw, 
    Briefcase, 
    Package,
    Edit2, // New icon import
    AlertTriangle, // New icon import
    List // New icon import
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea'; // Textarea might still be needed if `onEdit` callback handles the textarea internally. But the outline removes its usage from *this* component. I'll remove it too if not used.
import { toast } from 'sonner';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'; // New component imports
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert'; // New component imports

const getActionIcon = (actionType) => {
    const iconMap = {
        'Price Update': Package,
        'SEO Update': Edit,
        'Description Update': Edit,
        'Inventory Scan': Package,
        'Analytics Report': CheckCircle,
        'Create Listing': Package,
        'Bulk Edit': Edit,
    };
    return iconMap[actionType] || CheckCircle;
};

// New function to get risk icon
const getRiskIcon = (riskLevel) => {
    switch (riskLevel) {
        case 'low':
            return <CheckCircle className="h-4 w-4" />;
        case 'medium':
            return <AlertTriangle className="h-4 w-4" />;
        case 'high':
            return <AlertCircle className="h-4 w-4" />;
        default:
            return <CheckCircle className="h-4 w-4" />;
    }
};

export default function CommandConfirmation({ command, onConfirm, onCancel, onEdit }) {
    // isEditing and editedCommandText state, and handleReInterpret function removed
    // as per the outline's intent to externalize editing via `onEdit` callback.

    const riskColors = {
        low: 'text-green-600 bg-green-50 border-green-200',
        medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        high: 'text-red-600 bg-red-50 border-red-200',
    };

    return (
        <Dialog open={true} onOpenChange={onCancel}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <CheckCircle className="w-6 h-6 text-indigo-600" />
                        Confirm AI Action Plan
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Risk Badge */}
                    <Alert className={`${riskColors[command.risk_level]} border`}>
                        <div className="flex items-center gap-2">
                            {getRiskIcon(command.risk_level)}
                            <AlertTitle className="mb-0">
                                This command is considered <span className="font-bold">{command.risk_level}</span> risk.
                            </AlertTitle>
                        </div>
                    </Alert>

                    {/* Command Text */}
                    <Card className="bg-slate-50">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Your Command:</CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onEdit}
                                    className="h-8"
                                >
                                    <Edit2 className="w-4 h-4 mr-1" />
                                    Edit Command
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-700 italic">"{command.command_text}"</p>
                        </CardContent>
                    </Card>

                    {/* Target Platforms - Enhanced Display */}
                    <Card className="border-indigo-200 bg-indigo-50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-indigo-600" />
                                Target Platforms
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {command.platform_targets && command.platform_targets.length > 0 ? (
                                    command.platform_targets.map((platform, index) => (
                                        <Badge 
                                            key={index}
                                            className="bg-indigo-600 text-white px-3 py-1.5 text-sm hover:bg-indigo-700"
                                        >
                                            {platform}
                                        </Badge>
                                    ))
                                ) : (
                                    <span className="text-sm text-slate-600 italic">All connected platforms</span>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Product filters info removed as per outline */}
                    
                    {/* Risk Warning */}
                    {command.risk_warning && (
                        <Alert className="border-yellow-300 bg-yellow-50">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <AlertTitle>Risk Warning</AlertTitle>
                            <AlertDescription className="text-yellow-800">
                                {command.risk_warning}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Execution Plan */}
                    <div>
                        <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <List className="w-5 h-5 text-indigo-600" />
                            Execution Plan:
                        </h3>
                        {command.actions_planned && command.actions_planned.length > 0 ? (
                            <div className="space-y-2">
                                {command.actions_planned.filter(action => action).map((action, index) => (
                                    <Card key={index} className="border-slate-200">
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">
                                                        {index + 1}
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-semibold text-slate-900">{action.title || action.action_type || 'Action'}</h4>
                                                        {action.platform && <Badge variant="outline" className="text-xs">
                                                            {action.platform}
                                                        </Badge>}
                                                    </div>
                                                    <p className="text-sm text-slate-600">{action.description || ''}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 italic">No specific actions planned</p>
                        )}
                    </div>
                </div>

                <DialogFooter className="mt-6 gap-2">
                    <Button variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button
                        onClick={onConfirm}
                        className="bg-indigo-600 hover:bg-indigo-700"
                    >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Execute Plan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
