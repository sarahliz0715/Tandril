import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PurchaseOrder, PurchaseOrderItem, Supplier, User } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Plus, Eye, Pencil, Trash2, Send, PackageCheck, Ban, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function PurchaseOrders() {
  const location = useLocation();
  const [pos, setPOs] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [poItems, setPOItems] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    supplier_id: '',
    expected_delivery_date: '',
    notes: '',
    lineItems: []
  });
  const [newLineItem, setNewLineItem] = useState({
    product_name: '',
    sku: '',
    quantity_ordered: 1,
    cost_per_unit: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  // Handle navigation state for auto-opening create modal with low stock items
  useEffect(() => {
    if (location.state?.autoOpenCreate && location.state?.lowStockItems) {
      const lowStockItems = location.state.lowStockItems;

      // Convert low stock items to line items format
      const lineItems = lowStockItems.map(item => ({
        id: Date.now() + Math.random(),
        product_name: item.product_name || item.name,
        sku: item.sku || '',
        quantity_ordered: Math.max(item.reorder_quantity || 10, 10), // Default to 10 or reorder quantity
        cost_per_unit: 0 // User will need to fill this in
      }));

      setCreateFormData(prev => ({
        ...prev,
        lineItems: lineItems,
        notes: `Reorder for ${lowStockItems.length} low stock items`
      }));

      setShowCreateModal(true);

      // Clear the navigation state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [posData, suppliersData] = await Promise.all([
        PurchaseOrder.list('-created_at'),
        Supplier.list('name')
      ]);
      setPOs(posData || []);
      setSuppliers(suppliersData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load purchase orders');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPOItems = async (poId) => {
    try {
      const items = await PurchaseOrderItem.filter({ po_id: poId });
      setPOItems(items || []);
    } catch (error) {
      console.error('Error loading PO items:', error);
      toast.error('Failed to load PO items');
    }
  };

  const handleViewPO = async (po) => {
    setSelectedPO(po);
    await loadPOItems(po.id);
    setShowDetailModal(true);
  };

  const handleUpdateStatus = async (poId, newStatus) => {
    try {
      const updateData = { status: newStatus };

      if (newStatus === 'sent') {
        updateData.sent_at = new Date().toISOString();
      } else if (newStatus === 'confirmed') {
        updateData.confirmed_at = new Date().toISOString();
      } else if (newStatus === 'received') {
        updateData.received_at = new Date().toISOString();
        updateData.actual_delivery_date = new Date().toISOString().split('T')[0];
      } else if (newStatus === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
      }

      await PurchaseOrder.update(poId, updateData);

      toast.success(`PO marked as ${newStatus}`);

      // If marked as received, trigger Shopify inventory sync
      if (newStatus === 'received') {
        try {
          const { data: { user } } = await supabase.auth.getUser();

          if (user) {
            toast.loading('Syncing inventory to Shopify...', { id: 'sync-inventory' });

            const { data, error } = await supabase.functions.invoke('sync-po-inventory', {
              body: {
                po_id: poId,
                user_id: user.id
              }
            });

            if (error) throw error;

            if (data?.success) {
              const summary = data.summary;
              toast.success(
                `Inventory synced! ${summary.success} items updated, ${summary.skipped} skipped, ${summary.errors} errors`,
                { id: 'sync-inventory' }
              );
            } else {
              toast.warning('Inventory sync completed with issues', { id: 'sync-inventory' });
            }
          }
        } catch (syncError) {
          console.error('Inventory sync error:', syncError);
          toast.error('Failed to sync inventory to Shopify. You may need to update manually.', { id: 'sync-inventory' });
        }
      }

      loadData();

      if (showDetailModal && selectedPO?.id === poId) {
        const updatedPO = await PurchaseOrder.get(poId);
        setSelectedPO(updatedPO);
      }
    } catch (error) {
      console.error('Error updating PO status:', error);
      toast.error('Failed to update PO status');
    }
  };

  const handleDeletePO = async (poId) => {
    if (!confirm('Are you sure you want to delete this purchase order?')) return;

    try {
      await PurchaseOrder.delete(poId);
      toast.success('Purchase order deleted');
      loadData();
      if (showDetailModal && selectedPO?.id === poId) {
        setShowDetailModal(false);
      }
    } catch (error) {
      console.error('Error deleting PO:', error);
      toast.error('Failed to delete purchase order');
    }
  };

  const handleAddLineItem = () => {
    if (!newLineItem.product_name || newLineItem.quantity_ordered <= 0 || newLineItem.cost_per_unit <= 0) {
      toast.error('Please fill in all line item fields');
      return;
    }

    setCreateFormData({
      ...createFormData,
      lineItems: [...createFormData.lineItems, { ...newLineItem, id: Date.now() }]
    });

    setNewLineItem({
      product_name: '',
      sku: '',
      quantity_ordered: 1,
      cost_per_unit: 0
    });
  };

  const handleRemoveLineItem = (itemId) => {
    setCreateFormData({
      ...createFormData,
      lineItems: createFormData.lineItems.filter(item => item.id !== itemId)
    });
  };

  const calculatePOTotal = () => {
    return createFormData.lineItems.reduce((sum, item) => {
      return sum + (item.quantity_ordered * item.cost_per_unit);
    }, 0);
  };

  const handleCreatePO = async (e) => {
    e.preventDefault();

    if (!createFormData.supplier_id) {
      toast.error('Please select a supplier');
      return;
    }

    if (createFormData.lineItems.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }

    try {
      // Get current user to generate PO number
      const { data: { user } } = await supabase.auth.getUser();

      // Generate PO number using the database function
      const { data: poNumberData, error: poNumberError } = await supabase
        .rpc('generate_po_number', { p_user_id: user.id });

      if (poNumberError) throw poNumberError;

      const total = calculatePOTotal();

      // Create the PO
      const poData = {
        po_number: poNumberData,
        supplier_id: createFormData.supplier_id,
        status: 'draft',
        total_cost: total,
        expected_delivery_date: createFormData.expected_delivery_date || null,
        notes: createFormData.notes || null
      };

      const newPO = await PurchaseOrder.create(poData);

      // Create line items
      for (const item of createFormData.lineItems) {
        await PurchaseOrderItem.create({
          po_id: newPO.id,
          product_id: item.sku || item.product_name,
          product_name: item.product_name,
          sku: item.sku || null,
          quantity_ordered: item.quantity_ordered,
          cost_per_unit: item.cost_per_unit
        });
      }

      toast.success(`Purchase order ${poNumberData} created successfully`);
      setShowCreateModal(false);
      resetCreateForm();
      loadData();
    } catch (error) {
      console.error('Error creating PO:', error);
      toast.error('Failed to create purchase order');
    }
  };

  const resetCreateForm = () => {
    setCreateFormData({
      supplier_id: '',
      expected_delivery_date: '',
      notes: '',
      lineItems: []
    });
    setNewLineItem({
      product_name: '',
      sku: '',
      quantity_ordered: 1,
      cost_per_unit: 0
    });
  };

  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.name || 'Unknown Supplier';
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-yellow-100 text-yellow-800',
      received: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.draft;
  };

  const filterPOs = (status) => {
    if (status === 'all') return pos;
    return pos.filter(po => po.status === status);
  };

  const getStatusCounts = () => {
    return {
      all: pos.length,
      draft: pos.filter(po => po.status === 'draft').length,
      sent: pos.filter(po => po.status === 'sent').length,
      confirmed: pos.filter(po => po.status === 'confirmed').length,
      received: pos.filter(po => po.status === 'received').length,
      cancelled: pos.filter(po => po.status === 'cancelled').length,
    };
  };

  const counts = getStatusCounts();
  const filteredPOs = filterPOs(activeTab);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Purchase Orders</h1>
          <p className="text-slate-600 mt-1">Manage inventory purchase orders and supplier deliveries</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create PO
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full max-w-3xl">
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="draft">Draft ({counts.draft})</TabsTrigger>
          <TabsTrigger value="sent">Sent ({counts.sent})</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed ({counts.confirmed})</TabsTrigger>
          <TabsTrigger value="received">Received ({counts.received})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({counts.cancelled})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
              <p className="text-slate-600 mt-2">Loading purchase orders...</p>
            </div>
          ) : filteredPOs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  No {activeTab !== 'all' ? activeTab : ''} purchase orders
                </h3>
                <p className="text-slate-600 mb-4">
                  {activeTab === 'all'
                    ? 'Create your first purchase order to start managing inventory restocking'
                    : `No purchase orders with status "${activeTab}"`
                  }
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First PO
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredPOs.map((po) => (
                <Card key={po.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-xl">{po.po_number}</CardTitle>
                          <Badge className={getStatusColor(po.status)}>
                            {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">
                          Supplier: <span className="font-semibold">{getSupplierName(po.supplier_id)}</span>
                        </p>
                        <p className="text-sm text-slate-500">
                          Created: {format(new Date(po.created_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-slate-900">
                          ${(po.total_cost || 0).toFixed(2)}
                        </p>
                        {po.expected_delivery_date && (
                          <p className="text-sm text-slate-600 mt-1">
                            Expected: {format(new Date(po.expected_delivery_date), 'MMM dd, yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => handleViewPO(po)}>
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>

                      {po.status === 'draft' && (
                        <>
                          <Button variant="outline" size="sm">
                            <Pencil className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(po.id, 'sent')}>
                            <Send className="w-4 h-4 mr-1" />
                            Mark as Sent
                          </Button>
                        </>
                      )}

                      {po.status === 'sent' && (
                        <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(po.id, 'confirmed')}>
                          <PackageCheck className="w-4 h-4 mr-1" />
                          Confirm Order
                        </Button>
                      )}

                      {(po.status === 'sent' || po.status === 'confirmed') && (
                        <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(po.id, 'received')}>
                          <PackageCheck className="w-4 h-4 mr-1" />
                          Mark as Received
                        </Button>
                      )}

                      {po.status === 'draft' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(po.id, 'cancelled')}
                          >
                            <Ban className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeletePO(po.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                    {po.notes && (
                      <p className="text-sm text-slate-600 mt-3 italic">{po.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create PO Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        setShowCreateModal(open);
        if (!open) resetCreateForm();
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreatePO} className="space-y-6">
            {/* Supplier Selection */}
            <div>
              <Label htmlFor="supplier">Supplier *</Label>
              <Select
                value={createFormData.supplier_id}
                onValueChange={(value) => setCreateFormData({ ...createFormData, supplier_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Expected Delivery Date */}
            <div>
              <Label htmlFor="expected_delivery_date">Expected Delivery Date</Label>
              <Input
                id="expected_delivery_date"
                type="date"
                value={createFormData.expected_delivery_date}
                onChange={(e) => setCreateFormData({ ...createFormData, expected_delivery_date: e.target.value })}
              />
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={createFormData.notes}
                onChange={(e) => setCreateFormData({ ...createFormData, notes: e.target.value })}
                placeholder="Any special instructions or notes..."
                rows={2}
              />
            </div>

            {/* Line Items */}
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-lg">Order Items</h3>

              {/* Add Line Item Form */}
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  <Label htmlFor="product_name" className="text-xs">Product Name *</Label>
                  <Input
                    id="product_name"
                    value={newLineItem.product_name}
                    onChange={(e) => setNewLineItem({ ...newLineItem, product_name: e.target.value })}
                    placeholder="Product name"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="sku" className="text-xs">SKU</Label>
                  <Input
                    id="sku"
                    value={newLineItem.sku}
                    onChange={(e) => setNewLineItem({ ...newLineItem, sku: e.target.value })}
                    placeholder="SKU"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="quantity" className="text-xs">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={newLineItem.quantity_ordered}
                    onChange={(e) => setNewLineItem({ ...newLineItem, quantity_ordered: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="cost" className="text-xs">Cost/Unit *</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newLineItem.cost_per_unit}
                    onChange={(e) => setNewLineItem({ ...newLineItem, cost_per_unit: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="col-span-2">
                  <Button type="button" onClick={handleAddLineItem} className="w-full">
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Line Items Table */}
              {createFormData.lineItems.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left p-3">Product</th>
                        <th className="text-left p-3">SKU</th>
                        <th className="text-right p-3">Qty</th>
                        <th className="text-right p-3">Cost/Unit</th>
                        <th className="text-right p-3">Total</th>
                        <th className="text-center p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {createFormData.lineItems.map((item) => (
                        <tr key={item.id}>
                          <td className="p-3">{item.product_name}</td>
                          <td className="p-3 text-slate-600">{item.sku || '-'}</td>
                          <td className="p-3 text-right">{item.quantity_ordered}</td>
                          <td className="p-3 text-right">${item.cost_per_unit.toFixed(2)}</td>
                          <td className="p-3 text-right font-semibold">
                            ${(item.quantity_ordered * item.cost_per_unit).toFixed(2)}
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveLineItem(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50">
                      <tr>
                        <td colSpan="4" className="p-3 text-right font-semibold">Total:</td>
                        <td className="p-3 text-right font-bold text-lg">
                          ${calculatePOTotal().toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-center text-slate-500 py-6">No items added yet. Add your first item above.</p>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Create Purchase Order
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* PO Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedPO?.po_number}
              {selectedPO && (
                <Badge className={getStatusColor(selectedPO.status)}>
                  {selectedPO.status.charAt(0).toUpperCase() + selectedPO.status.slice(1)}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedPO && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Supplier</p>
                  <p className="font-semibold">{getSupplierName(selectedPO.supplier_id)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Created Date</p>
                  <p className="font-semibold">{format(new Date(selectedPO.created_at), 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <p className="text-slate-500">Expected Delivery</p>
                  <p className="font-semibold">
                    {selectedPO.expected_delivery_date
                      ? format(new Date(selectedPO.expected_delivery_date), 'MMM dd, yyyy')
                      : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Total Cost</p>
                  <p className="font-semibold text-lg">${(selectedPO.total_cost || 0).toFixed(2)}</p>
                </div>
              </div>

              {selectedPO.notes && (
                <div>
                  <p className="text-slate-500 text-sm mb-1">Notes</p>
                  <p className="text-slate-700">{selectedPO.notes}</p>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-lg mb-3">Order Items</h3>
                {poItems.length === 0 ? (
                  <p className="text-slate-500 text-center py-6">No items in this purchase order</p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-3">Product</th>
                          <th className="text-left p-3">SKU</th>
                          <th className="text-right p-3">Quantity</th>
                          <th className="text-right p-3">Cost/Unit</th>
                          <th className="text-right p-3">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {poItems.map((item) => (
                          <tr key={item.id}>
                            <td className="p-3">{item.product_name}</td>
                            <td className="p-3 text-slate-600">{item.sku || '-'}</td>
                            <td className="p-3 text-right">{item.quantity_ordered}</td>
                            <td className="p-3 text-right">${item.cost_per_unit.toFixed(2)}</td>
                            <td className="p-3 text-right font-semibold">
                              ${(item.quantity_ordered * item.cost_per_unit).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
