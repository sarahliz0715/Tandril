
import React, { useState, useEffect } from "react";
import { EmailSignup } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Mail, 
  Download, 
  Search, 
  Filter,
  TrendingUp,
  Users,
  Calendar,
  ExternalLink
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function EmailSignups() {
  const [signups, setSignups] = useState([]);
  const [filteredSignups, setFilteredSignups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');

  useEffect(() => {
    loadSignups();
  }, []);

  useEffect(() => {
    let filtered = signups;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(signup => 
        signup.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by source
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(signup => signup.source === sourceFilter);
    }

    setFilteredSignups(filtered);
  }, [signups, searchTerm, sourceFilter]); // This effect now directly contains the filtering logic

  const loadSignups = async () => {
    setIsLoading(true);
    try {
      const data = await EmailSignup.list('-created_date');
      setSignups(data);
    } catch (error) {
      console.error('Error loading email signups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportSignups = () => {
    const csvContent = [
      ['Email', 'Source', 'Date', 'Status'],
      ...filteredSignups.map(signup => [
        signup.email,
        signup.source,
        new Date(signup.created_date).toLocaleDateString(),
        signup.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tandril-email-signups-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Analytics calculations
  const totalSignups = signups.length;
  const todaySignups = signups.filter(signup => {
    const today = new Date().toDateString();
    const signupDate = new Date(signup.created_date).toDateString();
    return signupDate === today;
  }).length;

  const sourceBreakdown = signups.reduce((acc, signup) => {
    acc[signup.source] = (acc[signup.source] || 0) + 1;
    return acc;
  }, {});

  const getSourceColor = (source) => {
    const colors = {
      landing_page: "bg-blue-100 text-blue-800 border-blue-200",
      pricing_page: "bg-green-100 text-green-800 border-green-200",
      beta_signup: "bg-purple-100 text-purple-800 border-purple-200",
      newsletter: "bg-yellow-100 text-yellow-800 border-yellow-200"
    };
    return colors[source] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse text-xl font-medium text-slate-500 text-center">
            Loading email signups...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Email Signups</h1>
          <p className="text-slate-600 text-lg">Manage your waitlist and beta signups</p>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase">Total Signups</p>
                  <p className="text-3xl font-bold text-slate-900">{totalSignups}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase">Today</p>
                  <p className="text-3xl font-bold text-slate-900">{todaySignups}</p>
                </div>
                <Calendar className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase">Growth Rate</p>
                  <p className="text-3xl font-bold text-slate-900">+{Math.round(totalSignups / 7)}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Source Breakdown */}
        <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 mb-8">
          <CardHeader>
            <CardTitle>Signup Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(sourceBreakdown).map(([source, count]) => (
                <div key={source} className="text-center p-4 rounded-lg bg-slate-50">
                  <p className="text-2xl font-bold text-slate-900">{count}</p>
                  <Badge className={`${getSourceColor(source)} mt-2`}>
                    {source.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filters and Export */}
        <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 mb-8">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle>Email List ({filteredSignups.length} signups)</CardTitle>
              <Button onClick={exportSignups} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by email address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="landing_page">Landing Page</SelectItem>
                  <SelectItem value="pricing_page">Pricing Page</SelectItem>
                  <SelectItem value="beta_signup">Beta Signup</SelectItem>
                  <SelectItem value="newsletter">Newsletter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Email List */}
            <div className="space-y-3">
              {filteredSignups.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  {signups.length === 0 ? 'No signups yet' : 'No signups match your filters'}
                </div>
              ) : (
                filteredSignups.map((signup) => (
                  <div key={signup.id} className="flex items-center justify-between p-4 rounded-lg border border-slate-200 bg-white">
                    <div className="flex items-center gap-4">
                      <Mail className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="font-medium text-slate-900">{signup.email}</p>
                        <p className="text-sm text-slate-500">
                          {formatDistanceToNow(new Date(signup.created_date), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getSourceColor(signup.source)}>
                        {signup.source.replace('_', ' ')}
                      </Badge>
                      {signup.signup_context?.utm_source && (
                        <Badge variant="outline" className="text-xs">
                          {signup.signup_context.utm_source}
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(`mailto:${signup.email}`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
