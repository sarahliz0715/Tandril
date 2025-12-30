import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Bug, ExternalLink } from 'lucide-react';
import { api } from '@/api/apiClient';

export default function EbayConfigChecker() {
    const [checking, setChecking] = useState(false);
    const [config, setConfig] = useState(null);
    const [debug, setDebug] = useState(null);

    const checkConfig = async () => {
        setChecking(true);
        try {
            const response = await api.functions.invoke('checkEbayConfig');
            console.log('eBay Config Check Response:', response.data);
            setConfig(response.data);
        } catch (error) {
            console.error('Failed to check config:', error);
            setConfig({
                error: true,
                message: error.message
            });
        } finally {
            setChecking(false);
        }
    };

    const debugAuth = async () => {
        setChecking(true);
        try {
            const response = await api.functions.invoke('debugEbayAuth');
            console.log('eBay Debug Response:', response.data);
            setDebug(response.data);
        } catch (error) {
            console.error('Failed to debug:', error);
            setDebug({
                error: true,
                message: error.message
            });
        } finally {
            setChecking(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <Button 
                    onClick={checkConfig} 
                    disabled={checking}
                    variant="outline"
                    size="sm"
                >
                    {checking ? (
                        <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Checking...
                        </>
                    ) : (
                        <>
                            <AlertCircle className="w-4 h-4 mr-2" />
                            Check Configuration
                        </>
                    )}
                </Button>

                <Button 
                    onClick={debugAuth} 
                    disabled={checking}
                    variant="outline"
                    size="sm"
                >
                    {checking ? (
                        <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Debugging...
                        </>
                    ) : (
                        <>
                            <Bug className="w-4 h-4 mr-2" />
                            Debug eBay Auth
                        </>
                    )}
                </Button>
            </div>

            {config && !config.error && (
                <Alert variant={config.allConfigured ? "default" : "destructive"}>
                    <AlertTitle className="flex items-center gap-2">
                        {config.allConfigured ? (
                            <>
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                eBay Configuration Status: OK
                            </>
                        ) : (
                            <>
                                <XCircle className="w-4 h-4" />
                                eBay Configuration: INCOMPLETE
                            </>
                        )}
                    </AlertTitle>
                    <AlertDescription>
                        <div className="mt-3 space-y-2 text-sm font-mono">
                            <div className="flex items-center gap-2">
                                {config.config.EBAY_CLIENT_ID.exists ? (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : (
                                    <XCircle className="w-4 h-4 text-red-600" />
                                )}
                                <span>EBAY_CLIENT_ID: {config.config.EBAY_CLIENT_ID.preview}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {config.config.EBAY_CLIENT_SECRET.exists ? (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : (
                                    <XCircle className="w-4 h-4 text-red-600" />
                                )}
                                <span>EBAY_CLIENT_SECRET: {config.config.EBAY_CLIENT_SECRET.preview}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {config.config.EBAY_REDIRECT_URI.exists ? (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : (
                                    <XCircle className="w-4 h-4 text-red-600" />
                                )}
                                <span>EBAY_REDIRECT_URI: {config.config.EBAY_REDIRECT_URI.exists ? '✓' : '✗'}</span>
                            </div>
                            
                            {config.config.EBAY_REDIRECT_URI.exists && (
                                <div className="mt-3 p-2 bg-black/5 rounded">
                                    <div className="text-xs mb-1">Current value:</div>
                                    <div className="break-all">{config.config.EBAY_REDIRECT_URI.value}</div>
                                    <div className="text-xs mt-2 mb-1">Expected value:</div>
                                    <div className="break-all">{config.config.EBAY_REDIRECT_URI.expectedValue}</div>
                                    <div className="mt-2">
                                        Match: {config.config.EBAY_REDIRECT_URI.matches ? (
                                            <span className="text-green-600 font-semibold">✓ YES</span>
                                        ) : (
                                            <span className="text-red-600 font-semibold">✗ NO</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {debug && !debug.error && (
                <Alert>
                    <Bug className="w-4 h-4" />
                    <AlertTitle>eBay Authentication Debug Info</AlertTitle>
                    <AlertDescription>
                        <div className="mt-3 space-y-3 text-sm">
                            <div className="p-3 bg-slate-50 rounded">
                                <div className="font-semibold mb-2">Configuration:</div>
                                <div className="space-y-1 font-mono text-xs">
                                    <div>Client ID: {debug.configuration.client_id}</div>
                                    <div>Client Secret: {debug.configuration.client_secret}</div>
                                    <div>Redirect URI: {debug.configuration.redirect_uri}</div>
                                    <div className="mt-2">
                                        URI Match: {debug.configuration.redirect_uri_matches_expected ? (
                                            <span className="text-green-600 font-semibold">✓ YES</span>
                                        ) : (
                                            <span className="text-red-600 font-semibold">✗ NO</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 bg-amber-50 rounded border border-amber-200">
                                <div className="font-semibold mb-2 text-amber-900">Setup Instructions:</div>
                                <ol className="space-y-2 text-xs text-amber-800">
                                    {Object.entries(debug.instructions).map(([key, value]) => (
                                        <li key={key}>{value}</li>
                                    ))}
                                </ol>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-3"
                                    onClick={() => window.open('https://developer.ebay.com/my/keys', '_blank')}
                                >
                                    <ExternalLink className="w-3 h-3 mr-2" />
                                    Open eBay Developer Console
                                </Button>
                            </div>

                            <details className="cursor-pointer">
                                <summary className="font-semibold hover:underline">View Auth URLs</summary>
                                <div className="mt-2 p-2 bg-slate-50 rounded font-mono text-xs space-y-2">
                                    <div>
                                        <div className="text-slate-600">Production:</div>
                                        <div className="break-all text-blue-600">{debug.auth_urls.production}</div>
                                    </div>
                                    <div>
                                        <div className="text-slate-600">Sandbox:</div>
                                        <div className="break-all text-blue-600">{debug.auth_urls.sandbox}</div>
                                    </div>
                                </div>
                            </details>
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {(config?.error || debug?.error) && (
                <Alert variant="destructive">
                    <XCircle className="w-4 h-4" />
                    <AlertTitle>Check Failed</AlertTitle>
                    <AlertDescription>{config?.message || debug?.message}</AlertDescription>
                </Alert>
            )}
        </div>
    );
}