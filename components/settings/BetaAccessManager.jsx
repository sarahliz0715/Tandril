import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { User } from '@/api/entities';
import { toast } from 'sonner';
import { Sparkles, UserPlus, UserMinus, Search, Shield, Mail, Calendar } from 'lucide-react';

export default function BetaAccessManager({ currentUser }) {
    const [allUsers, setAllUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        // Check if current user is admin
        if (currentUser?.role === 'admin') {
            setIsAdmin(true);
            loadAllUsers();
        }
    }, [currentUser]);

    const loadAllUsers = async () => {
        setIsLoading(true);
        try {
            const users = await User.list('-created_at', 100);
            setAllUsers(users);
        } catch (error) {
            console.error('Failed to load users:', error);
            toast.error('Failed to load users');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleBetaAccess = async (user) => {
        try {
            const newBetaStatus = !user.shopify_beta_access;
            await User.update(user.id, {
                shopify_beta_access: newBetaStatus
            });
            
            toast.success(
                newBetaStatus 
                    ? `✅ Beta access granted to ${user.email}` 
                    : `❌ Beta access revoked from ${user.email}`
            );
            
            loadAllUsers(); // Refresh list
        } catch (error) {
            console.error('Failed to toggle beta access:', error);
            toast.error('Failed to update beta access');
        }
    };

    if (!isAdmin) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-amber-600" />
                        Beta Access Management
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-slate-600">
                        This section is only available to administrators.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const filteredUsers = allUsers.filter(user => 
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const betaUsers = allUsers.filter(u => u.shopify_beta_access === true);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    Beta Access Management
                </CardTitle>
                <CardDescription>
                    Grant or revoke Shopify Beta access for users. {betaUsers.length} user(s) currently have beta access.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Search */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search by email or name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Button variant="outline" onClick={loadAllUsers} disabled={isLoading}>
                        Refresh
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-lg border">
                        <div className="text-2xl font-bold text-slate-900">{allUsers.length}</div>
                        <div className="text-sm text-slate-600">Total Users</div>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="text-2xl font-bold text-purple-900">{betaUsers.length}</div>
                        <div className="text-sm text-purple-700">Beta Testers</div>
                    </div>
                </div>

                {/* User List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {isLoading ? (
                        <div className="text-center py-8 text-slate-500">Loading users...</div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">No users found</div>
                    ) : (
                        filteredUsers.map((user) => (
                            <div
                                key={user.id}
                                className="flex items-center justify-between p-4 bg-white border rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-medium text-slate-900 truncate">
                                            {user.full_name || 'No Name'}
                                        </p>
                                        {user.shopify_beta_access && (
                                            <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                                                <Sparkles className="w-3 h-3 mr-1" />
                                                Beta
                                            </Badge>
                                        )}
                                        {user.role === 'admin' && (
                                            <Badge variant="outline" className="text-xs">
                                                <Shield className="w-3 h-3 mr-1" />
                                                Admin
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <Mail className="w-3 h-3" />
                                            {user.email}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant={user.shopify_beta_access ? "destructive" : "default"}
                                    onClick={() => toggleBetaAccess(user)}
                                    className={user.shopify_beta_access ? "" : "bg-purple-600 hover:bg-purple-700"}
                                >
                                    {user.shopify_beta_access ? (
                                        <>
                                            <UserMinus className="w-4 h-4 mr-2" />
                                            Revoke
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="w-4 h-4 mr-2" />
                                            Grant Beta
                                        </>
                                    )}
                                </Button>
                            </div>
                        ))
                    )}
                </div>

                {/* Quick Actions */}
                <div className="pt-4 border-t">
                    <p className="text-xs text-slate-500 mb-2">Quick Actions:</p>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSearchTerm('')}
                        >
                            Clear Search
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                const betaEmails = betaUsers.map(u => u.email).join(', ');
                                navigator.clipboard.writeText(betaEmails);
                                toast.success('Beta tester emails copied to clipboard');
                            }}
                        >
                            Copy Beta Emails
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}