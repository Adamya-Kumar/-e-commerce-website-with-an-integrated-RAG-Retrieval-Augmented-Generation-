import { Component } from 'react';
import Button from './Button.jsx';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled React error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
          <div className="w-full max-w-lg rounded-[22px] border border-border-light bg-white p-8 shadow-spark-lg">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-muted-green">Something went wrong</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-main">The app hit an unexpected error.</h1>
            <p className="mt-4 text-sm leading-6 text-main/80">
              Please refresh the page and try again. If the problem persists, return to the storefront and retry.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="primary" onClick={this.handleReload}>
                Reload page
              </Button>
              <Button variant="outline" onClick={() => window.location.assign('/')}>
                Go home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
