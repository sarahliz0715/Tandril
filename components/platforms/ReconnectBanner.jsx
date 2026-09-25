import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

// Shown when a connected store rejected Tandril's saved login (platforms.status =
// 'needs_reconnect', or get_inventory reported a connection issue this load), so the
// page explains the missing products instead of silently showing an empty list.
export default function ReconnectBanner({ stores = [] }) {
  const navigate = useNavigate();
  if (stores.length === 0) return null;

  const names = stores.map((s) => s.shop || s.platform_type).join(', ');
  return (
    <Alert className="mb-4 border-amber-300 bg-amber-50">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-900">
        {stores.length === 1 ? 'A store needs to be reconnected' : `${stores.length} stores need to be reconnected`}
      </AlertTitle>
      <AlertDescription className="text-amber-800">
        <p className="mb-2">
          {names} stopped accepting Tandril's connection, so {stores.length === 1 ? 'its' : 'their'} products
          can't load here and inventory isn't syncing to your other platforms.
        </p>
        <Button size="sm" variant="outline" onClick={() => navigate(createPageUrl('Platforms'))}>
          Go to Platforms to reconnect
        </Button>
      </AlertDescription>
    </Alert>
  );
}

// Merges stores flagged in the DB with ones get_inventory just reported, de-duplicated.
export function storesNeedingReconnect(platforms = [], connectionIssues = []) {
  const byId = new Map();
  for (const p of platforms) {
    if (p?.status === 'needs_reconnect') {
      byId.set(p.id, { platform_id: p.id, platform_type: p.platform_type, shop: p.shop_name || p.shop_domain || p.name });
    }
  }
  for (const issue of connectionIssues) {
    if (!byId.has(issue.platform_id)) byId.set(issue.platform_id, issue);
  }
  return [...byId.values()];
}
