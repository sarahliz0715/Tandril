import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function BetaInviteModal({ isOpen, onClose }) {
    const [email, setEmail] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [inviteUrl, setInviteUrl] = useState('');

    const handleSendInvite = async () => {
        if (!email || !email.includes('@')) {
            toast.error('Please enter a valid email address');
            return;
        }

        setIsSending(true);
        try {
            const response = await base44.functions.invoke('sendBetaInvite', { email });
            
            if (response.data.success) {
                setInviteUrl(response.data.invite_url);
                toast.success(`Beta invitation sent to ${email}!`);
                setEmail('');
            } else {
                toast.error(response.data.error || 'Failed to send invitation');
            }
        } catch (error) {
            console.error('Error sending beta invite:', error);
            toast.error('Failed to send invitation. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    const handleClose = () => {
        setEmail('');
        setInviteUrl('');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-green-600" />
                        Invite Beta Tester
                    </DialogTitle>
                </DialogHeader>

                {!inviteUrl ? (
                    <>
                        <div className="space-y-4 py-4">
                            <Alert className="bg-blue-50 border-blue-200">
                                <AlertDescription className="text-sm text-blue-800">
                                    Send a beta invitation to give someone exclusive early access to Tandril's Shopify integration.
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-2">
                                <Label htmlFor="invite-email">Email Address</Label>
                                <Input
                                    id="invite-email"
                                    type="email"
                                    placeholder="seller@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !isSending) {
                                            handleSendInvite();
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={handleClose} disabled={isSending}>
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleSendInvite} 
                                disabled={isSending || !email}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {isSending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Mail className="w-4 h-4 mr-2" />
                                        Send Invitation
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <div className="space-y-4 py-4">
                            <Alert className="bg-green-50 border-green-200">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-sm text-green-800">
                                    Invitation sent successfully! They'll receive an email with instructions to join.
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-2">
                                <Label>Invitation Link (if needed)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={inviteUrl}
                                        readOnly
                                        className="text-xs"
                                    />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            navigator.clipboard.writeText(inviteUrl);
                                            toast.success('Link copied!');
                                        }}
                                    >
                                        Copy
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button onClick={handleClose} className="bg-green-600 hover:bg-green-700">
                                Done
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}