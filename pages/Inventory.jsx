import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { InventoryItem } from '@/api/entities';
import { User } from '@/api/entities';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Plus,
  Search,
  Filter,
  Package,
  AlertTriangle,
  TrendingDown,
  Download,
  Upload,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import InventoryTable from '../components/inventory/InventoryTable';
import InventoryItemFormModal from '../components/inventory/InventoryItemFormModal';
import SmartInventoryActions from '../components/inventory/SmartInventoryActions';
import InventoryAnalytics from '../components/inventory/InventoryAnalytics';
import { handleAuthError } from '@/utils/authHelpers';
import { useConfirmDialog, ConfirmDialog } from '@/hooks/useConfirmDialog';
import { NoDataEmptyState, NoResultsEmptyState } from '../components/common/EmptyState';

export default function Inventory() {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const { isOpen, config, confirm, cancel } = useConfirmDialog();

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async (showLoadingToast = false) => {
    setIsLoading(true);
    if (showLoadingToast) {
      toast.info('Syncing inventory from Shopify...');
    }

    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      // Fetch real inventory from Shopify via edge function
      const { data, error } = await base44.functions.invoke('sync-shopify-inventory', {});

      if (error) {
        throw new Error(error);
      }

      if (data && data.inventory) {
        setInventory(data.inventory);

        if (showLoadingToast) {
          toast.success(`Synced ${data.inventory.length} items from ${data.platforms_synced} store(s)`);
        }
      } else {
        setInventory([]);
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
      handleAuthError(error, navigate);
      toast.error('Failed to sync inventory', {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-trigger inventory automations
  useEffect(() => {
    const checkInventoryTriggers = async () => {
      if (!inventory || inventory.length === 0) return;

      const lowStockItems = inventory.filter(item => 
        item.status === 'low_stock' && item.total_stock <= (item.reorder_point || 10)
      );
      
      const outOfStockItems = inventory.filter(item => 
        item.status === 'out_of_stock' || item.total_stock === 0
      );

      if (lowStockItems.length > 0) {
        for (const item of lowStockItems) {
          try {
            await base44.functions.invoke('evaluateTriggers', {
              trigger_type: 'inventory_low',
              trigger_data: {
                product_name: item.product_name,
                sku: item.sku,
                total_stock: item.total_stock,
                reorder_point: item.reorder_point,
                product_id: item.id
              }
            });
          } catch (error) {
            console.error('Error triggering low stock automation:', error);
          }
        }
      }

      if (outOfStockItems.length > 0) {
        for (const item of outOfStockItems) {
          try {
            await base44.functions.invoke('evaluateTriggers', {
              trigger_type: 'inventory_out_of_stock',
              trigger_data: {
                product_name: item.product_name,
                sku: item.sku,
                product_id: item.id
              }
            });
          } catch (error) {
            console.error('Error triggering out of stock automation:', error);
          }
        }
      }
    };

    checkInventoryTriggers();
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    let filtered = inventory;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.product_name?.toLowerCase().includes(query) ||
        item.sku?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    return filtered;
  }, [inventory, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: inventory.length,
      lowStock: inventory.filter(i => i.status === 'low_stock').length,
      outOfStock: inventory.filter(i => i.status === 'out_of_stock').length,
      totalValue: inventory.reduce((sum, i) => sum + (i.total_stock * (i.cost_per_unit || 0)), 0)
    };
  }, [inventory]);

  const handleSaveItem = async (itemData) => {
    try {
      if (editingItem) {
        // Update inventory in Shopify
        const { data, error } = await base44.functions.invoke('update-shopify-inventory', {
          platform_id: editingItem.platform_id,
          inventory_item_id: editingItem.inventory_item_id,
          location_id: editingItem.location_id,
          quantity: itemData.total_stock
        });

        if (error) {
          throw new Error(error);
        }

        toast.success('Inventory updated in Shopify');
      } else {
        // For new items, we can't create them here - they must be created in Shopify first
        toast.error('New products must be created in Shopify', {
          description: 'Please create the product in your Shopify admin, then sync inventory.'
        });
        return;
      }

      // Reload inventory to reflect changes
      loadInventory();
      setShowAddModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Failed to update inventory', {
        description: error.message
      });
    }
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setShowAddModal(true);
  };

  const handleDeleteItem = async (item) => {
    // Products cannot be deleted from inventory management
    // They must be deleted in Shopify admin
    toast.error('Cannot delete products from here', {
      description: 'Please delete the product in your Shopify admin, then sync inventory.'
    });
  };

  const handleExport = () => {
    const csv = [
      ['Product Name', 'SKU', 'Total Stock', 'Status', 'Cost Per Unit', 'Reorder Point'].join(','),
      ...filteredInventory.map(item => [
        item.product_name,
        item.sku,
        item.total_stock,
        item.status,
        item.cost_per_unit || 0,
        item.reorder_point || 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Inventory exported');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Inventory Management</h1>
          <p className="text-slate-600 mt-1">Track and manage your product inventory</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => loadInventory(true)}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Sync from Shopify
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={filteredInventory.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Items</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Low Stock</p>
                <p className="text-2xl font-bold text-amber-600">{stats.lowStock}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Value</p>
                <p className="text-2xl font-bold text-green-600">
                  ${stats.totalValue.toLocaleString()}
                </p>
              </div>
              <Sparkles className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by product name or SKU..."
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredInventory.length === 0 ? (
            searchQuery || statusFilter !== 'all' ? (
              <NoResultsEmptyState
                title="No items found"
                description="Try adjusting your search or filters"
                onReset={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
              />
            ) : (
              <NoDataEmptyState
                icon={Package}
                title="No inventory items"
                description="Start by adding your first product to track inventory"
                action={{
                  label: 'Add Item',
                  onClick: () => setShowAddModal(true)
                }}
              />
            )
          ) : (
            <InventoryTable
              items={filteredInventory}
              onEdit={handleEditItem}
              onDelete={handleDeleteItem}
            />
          )}
        </CardContent>
      </Card>

      {inventory.length > 0 && (
        <>
          <SmartInventoryActions inventory={inventory} onRefresh={loadInventory} />
          <InventoryAnalytics inventory={inventory} />
        </>
      )}

      {showAddModal && (
        <InventoryItemFormModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setEditingItem(null);
          }}
          onSave={handleSaveItem}
          item={editingItem}
        />
      )}

      <ConfirmDialog
        isOpen={isOpen}
        onConfirm={confirm}
        onCancel={cancel}
        {...config}
      />
    </div>
  );
}