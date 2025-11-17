
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreVertical, Edit } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const statusColors = {
  active: 'bg-green-100 text-green-800 border-green-200',
  low_stock: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  out_of_stock: 'bg-red-100 text-red-800 border-red-200',
  discontinued: 'bg-slate-100 text-slate-800 border-slate-200',
};

export default function InventoryTable({ inventory, onEdit }) {
  if (!inventory || inventory.length === 0) {
    return <p className="text-center text-slate-500 py-8">No products match your filters.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total Stock</TableHead>
            <TableHead className="text-right">Base Price</TableHead>
            <TableHead>Platforms</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inventory.map(item => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  <img 
                    src={item.image_url || 'https://placehold.co/40x40/e2e8f0/e2e8f0'} 
                    alt={item.product_name} 
                    className="w-10 h-10 object-cover rounded-md" 
                  />
                  <div>
                    <p className="font-semibold">{item.product_name}</p>
                    <p className="text-xs text-slate-500">{item.category}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>{item.sku}</TableCell>
              <TableCell>
                <Badge className={statusColors[item.status] || statusColors.discontinued}>
                  {item.status.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{item.total_stock}</TableCell>
              <TableCell className="text-right">${item.base_price.toFixed(2)}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {item.platform_listings.map(p => (
                    <Badge key={p.listing_id} variant="secondary">{p.platform}</Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
