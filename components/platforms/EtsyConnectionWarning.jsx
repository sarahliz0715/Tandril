import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EtsyConnectionWarning() {
    return (
        <Alert className="border-amber-500 bg-amber-50">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <AlertTitle className="text-amber-900 font-semibold">
                Etsy Does Not Allow AI-Powered Apps
            </AlertTitle>
            <AlertDescription className="text-amber-800 space-y-2">
                <p>
                    As of October 2024, Etsy has officially stated they do not allow apps that rely on 
                    AI generative content, LLM tools, or machine learning. This means TANDRIL cannot 
                    connect to or automate Etsy stores at this time.
                </p>
                <p className="text-sm">
                    We're monitoring their policy changes and will enable Etsy integration if their 
                    stance on AI tools changes in the future.
                </p>
                <Button 
                    variant="outline" 
                    size="sm"
                    className="mt-2"
                    onClick={() => window.open('https://www.etsy.com/legal/api/', '_blank')}
                >
                    <ExternalLink className="w-3 h-3 mr-2" />
                    View Etsy API Policy
                </Button>
            </AlertDescription>
        </Alert>
    );
}