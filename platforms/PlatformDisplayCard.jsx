
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Briefcase, ChevronRight, Package, Clock, Settings, RotateCw, Info } from 'lucide-react';
import PlatformConnectionManager from './PlatformConnectionManager';

export default function PlatformDisplayCard({
    platform,
    platformType,
    onDisconnect,
    onConnectionSuccess,
    isDemoMode = false
}) {
    const isConnected = platform && platform.status === 'connected';
    const hasError = platform && platform.status === 'error';
    const isAvailable = !platform;

    // Status configuration with better styling
    const statusConfig = {
        connected: {
            icon: CheckCircle,
            label: 'Connected',
            badgeClasses: 'bg-green-100 text-green-800 border-green-200',
        },
        error: {
            icon: AlertCircle,
            label: 'Action Required',
            badgeClasses: 'bg-red-100 text-red-800 border-red-200',
        },
        available: {
            icon: Briefcase,
            label: 'Available',
            badgeClasses: 'bg-slate-100 text-slate-800 border-slate-200',
        }
    };

    const currentStatusKey = isConnected ? 'connected' : hasError ? 'error' : 'available';
    const { label, badgeClasses } = statusConfig[currentStatusKey];

    return (
        <Card className={`hover:shadow-lg transition-all ${
            platform?.status === 'error' ? 'border-red-300 bg-red-50' :
            platform?.status === 'connected' ? 'border-green-300 bg-green-50' :
            'border-slate-200 bg-white'
        }`}>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        {platformType.logo && (
                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border p-1 shadow-sm">
                                <img src={platformType.logo} alt={platformType.name} className="w-10 h-10 object-contain" />
                            </div>
                        )}
                        <CardTitle className="text-xl font-bold text-slate-900">{platformType.name}</CardTitle>
                        {platform?.is_demo_data && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                                🎭 Demo
                            </Badge>
                        )}
                        {isDemoMode && !platform && (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                Test Mode
                            </Badge>
                        )}
                    </div>
                    <Badge className={badgeClasses}>{label}</Badge>
                </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between pt-0">
                {platform ? (
                    <div className="flex-grow flex flex-col">
                        {isDemoMode && (
                            <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                                <Info className="w-3 h-3 inline mr-1" />
                                Demo mode: Using sample data
                            </div>
                        )}
                        <div className="min-h-[4.5rem] flex flex-col justify-center py-2">
                            {isConnected && (
                                <div>
                                    <p className="text-sm font-medium text-slate-700 mb-3">{platform.name}</p>
                                    <div className="space-y-2 text-sm text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <Package className="w-4 h-4 text-slate-400" />
                                            <span>{platform.store_info?.total_products || 0} Products</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-slate-400" />
                                            <span>Last sync: {platform.last_sync ? new Date(platform.last_sync).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {hasError && (
                                <p className="text-sm text-red-700 font-medium">Connection failed. Please review your credentials and try reconnecting.</p>
                            )}
                        </div>
                        <div className="mt-4 pt-4 border-t flex flex-wrap gap-2 items-center">
                            {isConnected && (
                                <>
                                    <Button size="sm">
                                        <Settings className="w-4 h-4 mr-2" />
                                        Settings
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-slate-600">
                                        <RotateCw className="w-4 h-4 mr-2" />
                                        Sync Now
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 ml-auto" onClick={() => onDisconnect(platform)}>
                                        Disconnect
                                    </Button>
                                </>
                            )}
                            {hasError && (
                                <>
                                    <PlatformConnectionManager platformType={platformType} onConnectionSuccess={onConnectionSuccess}>
                                        Reconnect Now
                                    </PlatformConnectionManager>
                                    <Button variant="outline" size="sm" onClick={() => onDisconnect(platform)}>Remove</Button>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-grow flex flex-col">
                        {isDemoMode && (
                            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                                <Info className="w-3 h-3 inline mr-1" />
                                You can test the OAuth flow safely
                            </div>
                        )}
                        <div className="min-h-[4.5rem] flex flex-col justify-center py-2">
                            {isAvailable && (
                                <p className="text-sm text-slate-600">
                                    Connect your {platformType.name} store to start automating tasks and gaining insights.
                                </p>
                            )}
                        </div>
                        <div className="mt-4 pt-4 border-t flex flex-wrap gap-2 items-center">
                            {isAvailable && (
                                <PlatformConnectionManager platformType={platformType} onConnectionSuccess={onConnectionSuccess}>
                                    Connect Platform <ChevronRight className="w-4 h-4 ml-1" />
                                </PlatformConnectionManager>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
