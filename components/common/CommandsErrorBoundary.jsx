import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

class CommandsErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Commands Page Error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-4xl mx-auto p-6">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-6 h-6" />
                Commands Page Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-red-700">
                The Commands page encountered an error. This has been logged for debugging.
              </p>
              <div className="bg-white p-4 rounded border border-red-200 text-sm font-mono text-slate-800 overflow-auto max-h-96">
                <p className="font-bold mb-2">Error Details:</p>
                <p className="text-red-600 mb-4">{this.state.error && this.state.error.toString()}</p>
                {this.state.errorInfo && (
                  <>
                    <p className="font-bold mb-2">Component Stack:</p>
                    <pre className="text-xs whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    // Clear any localStorage that might be causing issues
                    try {
                      localStorage.removeItem('currentCommand');
                      localStorage.removeItem('commandState');
                    } catch (e) {
                      console.error('Error clearing localStorage:', e);
                    }
                    this.setState({ hasError: false, error: null, errorInfo: null });
                  }}
                  variant="default"
                >
                  Try Again
                </Button>
                <Button
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                >
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CommandsErrorBoundary;
