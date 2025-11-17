import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { generateQAPDF } from '@/api/functions';
import { toast } from 'sonner';

export default function PDFDownloadButton() {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleDownload = async () => {
        setIsGenerating(true);
        try {
            const response = await generateQAPDF();
            
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'multiple-user-access-qa.pdf';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            
            toast.success('PDF downloaded successfully!');
        } catch (error) {
            toast.error('Failed to generate PDF');
            console.error('PDF generation error:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Button 
            onClick={handleDownload} 
            disabled={isGenerating}
            className="gap-2"
        >
            {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <FileDown className="w-4 h-4" />
            )}
            {isGenerating ? 'Generating PDF...' : 'Download Q&A as PDF'}
        </Button>
    );
}