import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Catches uncaught render errors anywhere below it and shows a friendly
 *  recovery screen instead of a blank white page. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Uncaught UI error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-paper flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <div className="text-[28px] mb-3 select-none">⚡</div>
            <h1 className="display text-[22px] sm:text-[26px] text-ink mb-2">Something went wrong.</h1>
            <p className="text-[13.5px] text-ink-muted mb-6 leading-relaxed">
              An unexpected error broke this page. Reloading usually fixes it — your
              bookmarks and settings are safe.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-md bg-ink text-paper text-[13px] font-medium hover:bg-ink-soft transition-colors"
              >
                Reload page
              </button>
              <a
                href="/"
                className="px-4 py-2 rounded-md border border-line text-ink-muted text-[13px] hover:text-ink hover:border-ink/30 transition-colors"
              >
                Go home
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
