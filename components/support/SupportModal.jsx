import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, LifeBuoy } from 'lucide-react';
import { api } from '@/api/apiClient';
import { toast } from 'sonner';

export default function SupportModal({ isOpen, onClose }) {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [category, setCategory] = useState('help');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!subject.trim() || !message.trim()) {
            toast.error('Please fill in both subject and message');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await api.functions.invoke('sendSupportRequest', {
                subject,
                message,
                category
            });

            if (response.data.success) {
                setIsSubmitted(true);
                toast.success('Support request sent!', {
                    description: 'We\'ll get back to you as soon as possible.'
                });
                
                // Reset form after 2 seconds and close
                setTimeout(() => {
                    handleClose();
                }, 2000);
            } else {
                throw new Error(response.data.error || 'Failed to submit');
            }
        } catch (error) {
            console.error('Error submitting support request:', error);
            toast.error('Failed to send support request', {
                description: 'Please try again or email us directly at support@tandril.com'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setSubject('');
        setMessage('');
        setCategory('help');
        setIsSubmitted(false);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <LifeBuoy className="w-5 h-5 text-blue-600" />
                        Get Support
                    </DialogTitle>
                    <DialogDescription>
                        Having issues or questions? We're here to help!
                    </DialogDescription>
                </DialogHeader>

                {isSubmitted ? (
                    <div className="py-8 text-center">
                        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">
                            Request Submitted! ✅
                        </h3>
                        <p className="text-slate-600">
                            We've received your support request and will get back to you soon.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Alert className="bg-blue-50 border-blue-200">
                            <AlertDescription className="text-sm text-blue-800">
                                💡 <strong>Tip:</strong> The more details you provide, the faster we can help you!
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger id="category">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="help">I need help with something</SelectItem>
                                    <SelectItem value="bug">I found a bug</SelectItem>
                                    <SelectItem value="feature_request">Feature request</SelectItem>
                                    <SelectItem value="feedback">General feedback</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Input
                                id="subject"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Brief description of your issue"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="message">Message</Label>
                            <Textarea
                                id="message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Please describe your issue in detail. Include any error messages, steps to reproduce, or screenshots if relevant."
                                className="min-h-[150px]"
                                required
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleClose}
                                disabled={isSubmitting}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || !subject.trim() || !message.trim()}
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    'Submit Request'
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}