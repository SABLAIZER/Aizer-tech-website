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
          <div className="ios-glass max-w-lg w-full rounded-2xl p-8">
            <p className="text-xs text-accent font-medium mb-3">
              Application Recovery
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink mb-3">
              Something went wrong while rendering this view.
            </h1>
            <p className="text-sm text-ink-muted leading-relaxed mb-6 break-words">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="haptic-tap px-5 py-2.5 rounded-lg bg-accent-btn text-accent-ink text-sm font-semibold hover:bg-accent-hover cursor-pointer"
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
