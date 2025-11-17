import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export default function ExportReports({ data }) {
    const [isExporting, setIsExporting] = useState(null);

    const handleExport = async (type) => {
        setIsExporting(type);
        // Simulate an API call to generate a report
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // This is where you would actually generate a CSV or PDF
        // For now, we'll just show a success message.
        
        toast.success(`${type} report generated`, {
            description: "Your download would start automatically in a real environment.",
        });
        setIsExporting(null);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Export
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export Report As</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('Sales CSV')}>
                    {isExporting === 'Sales CSV' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Sales Data (.csv)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('Product CSV')}>
                    {isExporting === 'Product CSV' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Product Catalog (.csv)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('Summary PDF')}>
                    {isExporting === 'Summary PDF' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Summary Report (.pdf)
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}