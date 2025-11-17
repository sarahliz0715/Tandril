
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Image as ImageIcon, ExternalLink } from 'lucide-react';
// diffChars is no longer used in the updated DiffViewer component

const DiffViewer = ({ before, after }) => {
    // If both are null/undefined, there's nothing to display
    if (!before && !after) return null;

    // Handle creation (only 'after' exists, meaning something was added)
    // We assume 'before' would be null or undefined if it's a new entry
    if (!before) {
        return (
            <div className="text-sm bg-green-50 p-3 rounded-md border border-green-200 text-green-900">
                {after}
            </div>
        );
    }
    
    // Handle deletion (only 'before' exists, meaning something was removed)
    // We assume 'after' would be null or undefined if it's a deleted entry
    if (!after) {
        return (
            <div className="text-sm bg-red-50 p-3 rounded-md border border-red-200 text-red-900 line-through">
                {before}
            </div>
        );
    }

    // Standard before & after view for updates where both exist
    // Displays the "before" value with a strikethrough and the "after" value.
    return (
        <div className="space-y-2 text-sm">
            <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Before</p>
                <p className="bg-slate-100 p-2 rounded-md border text-slate-600 line-through">{before}</p>
            </div>
             <div>
                <p className="text-xs font-medium text-green-700 mb-1">After</p>
                <p className="bg-green-50 p-2 rounded-md border border-green-200 text-green-900">{after}</p>
            </div>
        </div>
    );
};

export default function ProductPreviewModal({ result, onClose }) {
    if (!result || !result.product_data) return null;

    const { before, after, change_type, shopify_admin_url } = result.product_data;
    const title = after?.title || before?.title || "Product Update";

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        {title}
                        {shopify_admin_url && (
                            <a href={shopify_admin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                View on Shopify <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {change_type === 'price_update' && (
                        <div>
                            <h3 className="font-semibold mb-2">Price Change</h3>
                            <div className="flex items-center justify-center gap-4 text-center">
                                <div className="p-4 rounded-lg bg-slate-100">
                                    <p className="text-xs text-slate-500">Before</p>
                                    <p className="text-lg font-bold text-slate-700">${before.price.toFixed(2)}</p>
                                </div>
                                <ArrowRight className="w-6 h-6 text-slate-400" />
                                <div className="p-4 rounded-lg bg-green-100">
                                    <p className="text-xs text-green-700">After</p>
                                    <p className="text-lg font-bold text-green-800">${after.price.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    {(change_type === 'seo_update' || change_type === 'product_creation') && (after?.title || before?.title) && (
                        <div>
                            <h3 className="font-semibold mb-2">Title</h3>
                            <DiffViewer before={before?.title} after={after?.title} />
                        </div>
                    )}
                     {(change_type === 'description_update' || change_type === 'seo_update' || change_type === 'product_creation') && (after?.description || before?.description) && (
                        <div>
                            <h3 className="font-semibold mb-2">Description</h3>
                            <DiffViewer before={before?.description} after={after?.description} />
                        </div>
                    )}
                    {change_type === 'seo_update' && (after?.tags || before?.tags) && (
                         <div>
                            <h3 className="font-semibold mb-2">Tags</h3>
                            <DiffViewer before={before?.tags} after={after?.tags} />
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
