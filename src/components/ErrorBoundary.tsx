import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected application error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-canvas text-ink flex items-center justify-center px-6 py-12">
          <div className="bg-surface border border-hairline-strong max-w-lg w-full rounded-2xl p-8">
            <p className="text-xs font-medium text-neon mb-3">
              Application Recovery
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-white mb-3">
              Something went wrong while rendering this view.
            </h1>
            <p className="text-sm text-ink-muted leading-relaxed mb-6 break-words">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="tap-feedback px-5 py-2.5 rounded-lg bg-neon text-neon-ink text-sm font-semibold hover:bg-neon-hover cursor-pointer"
            >
              Restore Interface
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
