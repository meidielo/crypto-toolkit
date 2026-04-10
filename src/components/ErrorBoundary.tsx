import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  // When this key changes (e.g. the user navigates to a different page) the
  // boundary resets. Without this, one broken computation leaves the user
  // stuck on the error screen even after they pick a different tool.
  resetKey?: string | number;
}
interface State { hasError: boolean; error: string; stack: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: '', stack: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message, stack: '' };
  }

  // componentDidCatch receives the React component stack. Logging it to the
  // console (in addition to surfacing a friendly UI) means developers running
  // the app locally get the full stack trace instead of a silently-swallowed
  // error. In production this lands in browser devtools — no external sink.
  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] caught error:', error, '\ncomponent stack:', info.componentStack);
    this.setState({ stack: info.componentStack ?? '' });
  }

  componentDidUpdate(prevProps: Props): void {
    // Reset on navigation: when resetKey changes, clear the error state so the
    // new page gets a fresh render. This is why App.tsx passes `page` as the
    // resetKey — one broken tool shouldn't poison the others.
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: '', stack: '' });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center space-y-3"
        >
          <p className="text-sm font-semibold text-destructive">Computation Error</p>
          <p className="text-xs text-muted-foreground break-all">{this.state.error}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: '', stack: '' })}
            className="text-xs underline text-primary"
          >
            Try Again
          </button>
          <p className="text-[10px] text-muted-foreground/60">
            Navigating to another tool will also clear this error.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
