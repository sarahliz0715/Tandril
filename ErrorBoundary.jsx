import React from 'react';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error Boundary caught error:', error, errorInfo);
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.href = '/';
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
                    <Card className="max-w-lg w-full shadow-lg">
                        <CardContent className="p-6 sm:p-8">
                            <div className="text-center">
                                <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-red-600 mx-auto mb-4" />
                                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                                    Something Went Wrong
                                </h2>
                                <p className="text-sm sm:text-base text-slate-600 mb-4">
                                    We encountered an unexpected error. Don't worry, your data is safe.
                                </p>
                                
                                {this.state.error && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4 text-left">
                                        <p className="text-xs sm:text-sm font-mono text-red-800 break-all">
                                            {this.state.error.toString()}
                                        </p>
                                    </div>
                                )}
                                
                                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                    <Button 
                                        onClick={this.handleReload}
                                        variant="outline"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Reload Page
                                    </Button>
                                    <Button 
                                        onClick={this.handleReset}
                                        className="bg-indigo-600 hover:bg-indigo-700"
                                    >
                                        <Home className="w-4 h-4 mr-2" />
                                        Go to Home
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;