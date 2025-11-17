import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function ListingStatusTable({ listings, platforms, selectedListings, setSelectedListings }) {

    const handleSelectRow = (id) => {
        const newSelected = selectedListings.includes(id)
            ? selectedListings.filter(rowId => rowId !== id)
            : [...selectedListings, id];
        setSelectedListings(newSelected);
    };

    const handleSelectAll = (checked) => {
        setSelectedListings(checked ? listings.map(item => item.id) : []);
    };
    
    // Create a map of platform names to their listing status for each product
    const listingsWithPlatformStatus = listings.map(listing => {
        const platformStatus = {};
        platforms.forEach(platform => {
            const platformListing = listing.platform_listings.find(p => p.platform === platform.name);
            platformStatus[platform.name] = platformListing ? (platformListing.is_active ? 'Active' : 'Draft') : 'Not Listed';
        });
        return { ...listing, platformStatus };
    });

    return (
        <div className="w-full overflow-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12">
                            <Checkbox 
                                checked={selectedListings.length === listings.length && listings.length > 0}
                                onCheckedChange={handleSelectAll}
                            />
                        </TableHead>
                        <TableHead>Product</TableHead>
                        {platforms.map(p => <TableHead key={p.id}>{p.name}</TableHead>)}
                        <TableHead className="w-12"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {listingsWithPlatformStatus.map(item => (
                        <TableRow key={item.id} data-state={selectedListings.includes(item.id) && "selected"}>
                            <TableCell>
                                <Checkbox 
                                    checked={selectedListings.includes(item.id)}
                                    onCheckedChange={() => handleSelectRow(item.id)}
                                />
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <img src={item.image_url} alt={item.product_name} className="w-10 h-10 rounded-md object-cover" />
                                    <div>
                                        <p className="font-medium text-sm">{item.product_name}</p>
                                        <p className="text-xs text-slate-500">SKU: {item.sku}</p>
                                    </div>
                                </div>
                            </TableCell>
                            {platforms.map(p => (
                                <TableCell key={p.id}>
                                    <Badge variant={
                                        item.platformStatus[p.name] === 'Active' ? 'success' : 
                                        item.platformStatus[p.name] === 'Draft' ? 'secondary' : 'outline'
                                    }>
                                        {item.platformStatus[p.name]}
                                    </Badge>
                                </TableCell>
                            ))}
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem>Edit Master Listing</DropdownMenuItem>
                                        <DropdownMenuItem>Optimize with AI</DropdownMenuItem>
                                        <DropdownMenuItem>View Analytics</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}