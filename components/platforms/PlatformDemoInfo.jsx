import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Info, ExternalLink, FlaskConical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const platformDemoGuides = {
    shopify: {
        title: 'Shopify Development Store',
        description: 'Create a free development store to test without affecting real data',
        steps: [
            'Go to partners.shopify.com and create a Partner account (free)',
            'Click "Stores" then "Add store"',
            'Select "Development store"',
            'Fill in your store details and click "Save"',
            'Your development store is ready! Use it to test Tandril safely.'
        ],
        link: 'https://partners.shopify.com/signup'
    },
    etsy: {
        title: 'Etsy Sandbox Account',
        description: 'Etsy doesn\'t have a sandbox, but you can use a separate shop for testing',
        steps: [
            'Create a new Etsy account with a different email',
            'Set up a test shop (you don\'t need to list real products)',
            'Connect this test shop to Tandril',
            'Use demo mode to avoid making unwanted changes'
        ],
        link: 'https://www.etsy.com/sell'
    },
    printful: {
        title: 'Printful Test Mode',
        description: 'Printful has built-in test mode functionality',
        steps: [
            'Create a Printful account',
            'In your store settings, enable "Test mode"',
            'Connect to Tandril - all orders will be test orders',
            'No real charges will be made in test mode'
        ],
        link: 'https://www.printful.com/dashboard'
    }
};

export default function PlatformDemoInfo({ platformType, userInDemoMode }) {
    const guide = platformDemoGuides[platformType];

    if (!guide) return null;

    return (
        <Card className="border-indigo-200 bg-indigo-50">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <FlaskConical className="w-5 h-5 text-indigo-600" />
                    {guide.title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-sm text-slate-700">{guide.description}</p>
                
                {userInDemoMode && (
                    <Alert className="border-amber-300 bg-amber-50">
                        <Info className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-900">Demo Mode Active</AlertTitle>
                        <AlertDescription className="text-amber-800">
                            You're in demo mode. You can connect to real stores to test the OAuth flow,
                            but all data operations will use sample data instead of real API calls.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-900">Setup Steps:</p>
                    <ol className="text-sm text-slate-700 space-y-1 list-decimal list-inside">
                        {guide.steps.map((step, i) => (
                            <li key={i}>{step}</li>
                        ))}
                    </ol>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(guide.link, '_blank')}
                    className="w-full"
                >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Go to {guide.title}
                </Button>
            </CardContent>
        </Card>
    );
}