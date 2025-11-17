import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Play,
    TestTube,
    CheckCircle2,
    XCircle,
    Clock,
    Loader2,
    AlertTriangle,
    Code,
    Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function TestingSandbox({ automation }) {
    const [testData, setTestData] = useState('{\n  "product_name": "Test Product",\n  "total_stock": 5,\n  "sku": "TEST-123",\n  "order_total": 599.99\n}');
    const [isRunning, setIsRunning] = useState(false);
    const [testResult, setTestResult] = useState(null);

    const handleRunTest = async () => {
        setIsRunning(true);
        setTestResult(null);

        try {
            // Parse test data
            let triggerData;
            try {
                triggerData = JSON.parse(testData);
            } catch (e) {
                toast.error('Invalid JSON in test data');
                setIsRunning(false);
                return;
            }

            console.log('[Test] Running automation with test data:', triggerData);

            // Execute automation in test mode
            const { data } = await base44.functions.invoke('executeAutomation', {
                automation_id: automation.id,
                trigger_data: triggerData,
                test_mode: true
            });

            console.log('[Test] Result:', data);

            setTestResult(data);

            if (data.success) {
                toast.success('Test completed successfully!');
            } else {
                toast.warning('Test completed with errors');
            }
        } catch (error) {
            console.error('[Test] Error:', error);
            toast.error('Test execution failed');
            setTestResult({
                success: false,
                execution_log: {
                    status: 'failed',
                    error_message: error.message || 'Test execution failed',
                    actions_executed: []
                }
            });
        } finally {
            setIsRunning(false);
        }
    };

    const handleCopyResult = () => {
        navigator.clipboard.writeText(JSON.stringify(testResult, null, 2));
        toast.success('Result copied to clipboard');
    };

    const getStatusColor = (status) => {
        const colors = {
            success: 'bg-green-100 text-green-800 border-green-200',
            partial_success: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            failed: 'bg-red-100 text-red-800 border-red-200',
            running: 'bg-blue-100 text-blue-800 border-blue-200'
        };
        return colors[status] || 'bg-slate-100 text-slate-800 border-slate-200';
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'success':
                return <CheckCircle2 className="w-5 h-5 text-green-600" />;
            case 'partial_success':
                return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
            case 'failed':
                return <XCircle className="w-5 h-5 text-red-600" />;
            case 'running':
                return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
            default:
                return <Clock className="w-5 h-5 text-slate-600" />;
        }
    };

    // Sample test data templates
    const templates = {
        inventory: '{\n  "product_name": "Sample Product",\n  "product_id": "123",\n  "sku": "PROD-123",\n  "total_stock": 5,\n  "reorder_point": 10\n}',
        order: '{\n  "order_id": "1001",\n  "customer_name": "John Doe",\n  "customer_email": "john@example.com",\n  "order_total": 299.99,\n  "items_count": 3\n}',
        message: '{\n  "customer_name": "Jane Smith",\n  "customer_email": "jane@example.com",\n  "message_text": "When will my order ship?",\n  "priority": "medium"\n}'
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TestTube className="w-5 h-5 text-indigo-600" />
                    Testing Sandbox
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <Alert className="bg-blue-50 border-blue-200">
                    <Code className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800 text-sm">
                        Test your automation with sample data before activating it. Tests run in sandbox mode and won't affect your real data.
                    </AlertDescription>
                </Alert>

                {/* Quick Templates */}
                <div>
                    <Label className="mb-2 block">Quick Templates:</Label>
                    <div className="flex gap-2 flex-wrap">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setTestData(templates.inventory)}
                        >
                            Inventory Event
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setTestData(templates.order)}
                        >
                            Order Event
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setTestData(templates.message)}
                        >
                            Customer Message
                        </Button>
                    </div>
                </div>

                {/* Test Data Input */}
                <div className="space-y-2">
                    <Label>Test Trigger Data (JSON)</Label>
                    <Textarea
                        value={testData}
                        onChange={(e) => setTestData(e.target.value)}
                        className="font-mono text-xs min-h-[200px]"
                        placeholder='{\n  "key": "value"\n}'
                    />
                    <p className="text-xs text-slate-500">
                        Provide sample data that would trigger this automation
                    </p>
                </div>

                {/* Run Test Button */}
                <Button
                    onClick={handleRunTest}
                    disabled={isRunning || !automation.is_active}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                    {isRunning ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Running Test...
                        </>
                    ) : (
                        <>
                            <Play className="w-4 h-4 mr-2" />
                            Run Test
                        </>
                    )}
                </Button>

                {/* Test Results */}
                {testResult && (
                    <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                Test Results
                            </h3>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCopyResult}
                            >
                                <Copy className="w-4 h-4 mr-1" />
                                Copy
                            </Button>
                        </div>

                        {/* Status */}
                        <div className={`p-3 rounded-lg border ${getStatusColor(testResult.execution_log?.status)}`}>
                            <div className="flex items-center gap-2">
                                {getStatusIcon(testResult.execution_log?.status)}
                                <span className="font-semibold">
                                    Status: {testResult.execution_log?.status?.toUpperCase()}
                                </span>
                                {testResult.execution_log?.execution_time_ms && (
                                    <Badge variant="outline" className="ml-auto">
                                        {testResult.execution_log.execution_time_ms}ms
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Actions Executed */}
                        {testResult.execution_log?.actions_executed?.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-slate-900 mb-2 text-sm">
                                    Actions Executed:
                                </h4>
                                <div className="space-y-2">
                                    {testResult.execution_log.actions_executed.map((action, index) => (
                                        <div
                                            key={index}
                                            className={`p-2 rounded border text-sm ${
                                                action.status === 'completed'
                                                    ? 'bg-green-50 border-green-200'
                                                    : 'bg-red-50 border-red-200'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                {action.status === 'completed' ? (
                                                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                                                )}
                                                <span className="font-medium">
                                                    Action {index + 1}
                                                </span>
                                                {action.retries && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {action.retries} retries
                                                    </Badge>
                                                )}
                                            </div>
                                            {action.error && (
                                                <p className="text-xs text-red-700 mt-1 ml-6">
                                                    Error: {action.error}
                                                </p>
                                            )}
                                            {action.output && (
                                                <pre className="text-xs text-slate-600 mt-1 ml-6 whitespace-pre-wrap">
                                                    {JSON.stringify(action.output, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Error Message */}
                        {testResult.execution_log?.error_message && (
                            <Alert className="border-red-200 bg-red-50">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                <AlertDescription className="text-red-800 text-sm">
                                    {testResult.execution_log.error_message}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Full Context Output */}
                        {testResult.context && (
                            <details className="text-xs">
                                <summary className="font-semibold text-slate-900 cursor-pointer">
                                    Full Context Data
                                </summary>
                                <pre className="mt-2 p-2 bg-white rounded border border-slate-200 overflow-auto max-h-60">
                                    {JSON.stringify(testResult.context, null, 2)}
                                </pre>
                            </details>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}