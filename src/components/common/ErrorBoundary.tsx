import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'An unexpected rendering error occurred.' };
  }

  componentDidCatch(error: Error) {
    console.error('Application ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center px-6 py-12">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-lg p-8">
            <p className="text-xs font-mono uppercase tracking-widest text-[#9E7B3B] mb-2">
              Portal Notice
            </p>
            <h1 className="font-serif text-2xl font-semibold text-[#0F2342] mb-3">
              Unable to display this view
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              {this.state.message.startsWith('{')
                ? 'A database permission or network check interrupted this request. Please verify your session or reload the page.'
                : this.state.message}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.location.assign('/')}
                className="px-4 py-2 text-sm font-medium bg-[#0F2342] text-white rounded-md hover:bg-[#18345E] transition-colors"
              >
                Return to Home
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-sm font-medium border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
