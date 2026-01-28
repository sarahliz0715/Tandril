
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, ServerCrash, RefreshCw, Trash2, Store, ShoppingCart, Package, Zap, Globe } from 'lucide-react';
import { toast } from 'sonner';
import ShopifyConnectButton from './ShopifyConnectButton';
import EtsyConnectButton from './EtsyConnectButton';
import PrintfulConnectButton from './PrintfulConnectButton';
import TeePublicConnectButton from './TeePublicConnectButton';
import RedbubbleConnectButton from './RedbubbleConnectButton';
import FacebookConnectButton from './FacebookConnectButton';
import EbayConnectButton from './EbayConnectButton';
import AmazonConnectButton from './AmazonConnectButton';
import WooCommerceConnectButton from './WooCommerceConnectButton';
import BigCommerceConnectButton from './BigCommerceConnectButton';
import FaireConnectButton from './FaireConnectButton';
import { Progress } from "@/components/ui/progress";

// Platform-specific icons
const platformIcons = {
  shopify: ShoppingCart,
  etsy: Store,
  printful: Package,
  teepublic: Store,
  redbubble: Store,
  facebook: Globe,
  walmart: Store,
  amazon: ShoppingCart,
  amazon_seller: ShoppingCart,
  ebay: ShoppingCart,
  woocommerce: Store,
  bigcommerce: Store,
  faire: Package,
  squarespace: Store,
  tiktok_shop: Globe
};

export default function PlatformCard({
  platformType,
  connectedPlatform,
  onDisconnect,
  onForceCleanup,
  onConnectionSuccess,
  isBeta = false,
  isComingSoon = false,
  isAtLimit = false, // Added isAtLimit prop
  currentUser // Added currentUser prop
}) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ percentage: 0, message: '' });

  if (!platformType) {
    return null;
  }

  const isConnected = connectedPlatform && connectedPlatform.status === 'connected';
  const isPending = connectedPlatform && connectedPlatform.status === 'pending';
  const isError = connectedPlatform && connectedPlatform.status === 'error';
  const isProcessing = connectedPlatform && connectedPlatform.status === 'processing';
  
  const statusConfig = {
      connected: { icon: CheckCircle, color: 'text-green-600', text: 'Connected' },
      disconnected: { icon: XCircle, color: 'text-slate-500', text: 'Not Connected' },
      pending: { icon: Clock, color: 'text-orange-500', text: 'Pending Action' },
      error: { icon: ServerCrash, color: 'text-red-600', text: 'Connection Error' },
      processing: { icon: RefreshCw, color: 'text-blue-600', text: 'Syncing...', animate: true },
  };
  const currentStatus = connectedPlatform?.status || 'disconnected';
  const { icon: StatusIcon, color, text, animate } = statusConfig[currentStatus];
  
  const statusBadge = (
      <Badge variant="outline" className={`flex items-center gap-1.5 ${color} border-current/30 bg-current/10`}>
          <StatusIcon className={`w-3.5 h-3.5 ${animate ? 'animate-spin' : ''}`} />
          <span>{text}</span>
      </Badge>
  );

  const renderConnectButton = () => {
    // In beta mode, only allow Shopify connections
    if (isBeta && platformType.type_id !== 'shopify') {
      return (
        <Button disabled className="w-full">
          Coming Soon
        </Button>
      );
    }

    if (isComingSoon) {
      return (
        <Button disabled className="w-full">
          Coming Soon
        </Button>
      );
    }

    switch (platformType.type_id) {
      case 'shopify':
        return <ShopifyConnectButton onConnectionSuccess={onConnectionSuccess} />;
      case 'etsy':
        return <EtsyConnectButton />;
      case 'printful':
        return <PrintfulConnectButton onConnectionSuccess={onConnectionSuccess}/>;
      case 'teepublic':
        return <TeePublicConnectButton onConnectionSuccess={onConnectionSuccess}/>
      case 'redbubble':
        return <RedbubbleConnectButton onConnectionSuccess={onConnectionSuccess}/>
      case 'facebook':
        return <FacebookConnectButton onConnectionSuccess={onConnectionSuccess}/>
      case 'ebay':
        return (
          <EbayConnectButton
            onConnectionSuccess={onConnectionSuccess}
            disabled={isAtLimit}
          />
        );
      case 'amazon':
      case 'amazon_seller':
        return (
          <AmazonConnectButton
            onConnectionSuccess={onConnectionSuccess}
            disabled={isAtLimit}
          />
        );
      case 'woocommerce':
        return (
          <WooCommerceConnectButton
            onConnectionSuccess={onConnectionSuccess}
            disabled={isAtLimit}
          />
        );
      case 'bigcommerce':
        return (
          <BigCommerceConnectButton
            onConnectionSuccess={onConnectionSuccess}
            disabled={isAtLimit}
          />
        );
      case 'faire':
        return (
          <FaireConnectButton
            onConnectionSuccess={onConnectionSuccess}
            disabled={isAtLimit}
          />
        );
      default:
        return <Button disabled>Coming Soon</Button>;
    }
  };
  
  // Get platform-specific icon or fallback
  const PlatformIcon = platformIcons[platformType.type_id] || Store;

  return (
    <Card className="flex flex-col h-full bg-white/80 backdrop-blur-sm shadow-lg transition-all duration-200 hover:shadow-xl">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
            <PlatformIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg sm:text-xl">{platformType?.name}</CardTitle>
            <CardDescription className="capitalize">{(platformType?.category || '').replace('_', ' ')}</CardDescription>
          </div>
        </div>
        {!isComingSoon && statusBadge}
        {isComingSoon && (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            Available in Full Version
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-slate-600 line-clamp-3">
          {platformType?.description}
        </p>
        {isProcessing && (
            <div className="mt-4 space-y-2">
                <Progress value={syncProgress.percentage} className="w-full" />
                <p className="text-xs text-blue-600 text-center">{syncProgress.message}</p>
            </div>
        )}
        {isComingSoon && isBeta && (
          <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
            <p className="text-xs text-indigo-700">
              🚀 This platform will be available when we launch the full version. Focusing on Shopify for beta!
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t bg-slate-50/50 p-4">
        {isConnected ? (
          <Button variant="destructive" className="w-full" onClick={() => onDisconnect(connectedPlatform)}>Disconnect</Button>
        ) : isError ? (
            <div className="flex w-full gap-2">
                <Button variant="destructive" className="flex-1" onClick={() => onForceCleanup(platformType)}>
                    <Trash2 className="w-4 h-4 mr-2"/> Cleanup
                </Button>
                {renderConnectButton()}
            </div>
        ) : (
          renderConnectButton()
        )}
      </CardFooter>
    </Card>
  );
}
