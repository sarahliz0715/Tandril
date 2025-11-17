import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, CheckCircle, Pause, TrendingUp } from 'lucide-react';

export default function AutomationStats({ stats }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 rounded-lg">
                            <Activity className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <div className="text-sm text-slate-600">Total Automations</div>
                            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <div className="text-sm text-slate-600">Active</div>
                            <div className="text-2xl font-bold text-slate-900">{stats.active}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-100 rounded-lg">
                            <Pause className="w-6 h-6 text-slate-600" />
                        </div>
                        <div>
                            <div className="text-sm text-slate-600">Paused</div>
                            <div className="text-2xl font-bold text-slate-900">{stats.paused}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <div className="text-sm text-slate-600">Success Rate</div>
                            <div className="text-2xl font-bold text-slate-900">{stats.successRate}%</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}