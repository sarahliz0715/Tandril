import React, { useState } from 'react';
import { PlatformRequest } from '@/api/entities';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Send, Plus } from 'lucide-react';

export default function RequestPlatformModal({ open, onOpenChange }) {
    const [formData, setFormData] = useState({
        platform_name: '',
        platform_url: '',
        business_justification: '',
        api_documentation: '',
        estimated_users: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            await PlatformRequest.create(formData);
            toast.success("Platform request submitted! We'll review it and get back to you.");
            onOpenChange(false);
            setFormData({
                platform_name: '',
                platform_url: '',
                business_justification: '',
                api_documentation: '',
                estimated_users: ''
            });
        } catch (error) {
            toast.error("Failed to submit request. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plus className="w-5 h-5 text-blue-600" />
                        Request a New Platform Integration
                    </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="platform_name">Platform Name *</Label>
                            <Input 
                                id="platform_name"
                                placeholder="e.g., Minocqua Marketplace"
                                value={formData.platform_name}
                                onChange={(e) => setFormData({...formData, platform_name: e.target.value})}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="platform_url">Platform Website</Label>
                            <Input 
                                id="platform_url"
                                placeholder="https://example.com"
                                value={formData.platform_url}
                                onChange={(e) => setFormData({...formData, platform_url: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="business_justification">Why do you need this platform? *</Label>
                        <Textarea 
                            id="business_justification"
                            placeholder="I sell on this platform and would love to automate my operations there. It would help me..."
                            value={formData.business_justification}
                            onChange={(e) => setFormData({...formData, business_justification: e.target.value})}
                            rows={4}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="api_documentation">API Documentation (if known)</Label>
                            <Input 
                                id="api_documentation"
                                placeholder="Link to developer docs"
                                value={formData.api_documentation}
                                onChange={(e) => setFormData({...formData, api_documentation: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="estimated_users">How many users would benefit?</Label>
                            <Select value={formData.estimated_users} onValueChange={(value) => setFormData({...formData, estimated_users: value})}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select range" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="just_me">Just me</SelectItem>
                                    <SelectItem value="few_users">A few users (2-10)</SelectItem>
                                    <SelectItem value="many_users">Many users (10-100)</SelectItem>
                                    <SelectItem value="hundreds">Hundreds of users</SelectItem>
                                    <SelectItem value="thousands">Thousands of users</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-blue-900 mb-2">What happens next?</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• We'll review your request within 48 hours</li>
                            <li>• If it's a good fit, we'll research the platform's API</li>
                            <li>• Popular requests get prioritized for development</li>
                            <li>• You'll be the first to know when it's ready!</li>
                        </ul>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Submitting...' : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Submit Request
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}