import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CommandsMinimal() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Commands - Test Page</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600">
            This is a minimal test page with no data loading, no components, nothing.
            If this crashes, the issue is in Layout or routing, not the Commands page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
