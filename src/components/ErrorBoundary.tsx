import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex-center" style={{ minHeight: '30vh', flexDirection: 'column', gap: '1rem', padding: '2rem' }}>
          <h3>Algo salió mal</h3>
          <p className="text-sm text-secondary">{this.state.error?.message || 'Error inesperado'}</p>
          <button className="btn btn-primary" onClick={this.handleRetry}>
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
