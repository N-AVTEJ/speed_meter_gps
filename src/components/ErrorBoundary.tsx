import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('Apex Moto Speedo ErrorBoundary caught error:', error, errorInfo);
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const errorMsg =
        this.state.error?.message || String(this.state.error || 'Unknown application error');
      const rawStack =
        this.state.error?.stack || this.state.errorInfo?.componentStack || '';
      const stackLines = rawStack
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 8)
        .join('\n');
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown User-Agent';

      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: '#07070A',
            color: '#ffffff',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            padding: '24px 16px',
            overflowY: 'auto',
            zIndex: 999999,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ maxWidth: '640px', margin: '0 auto', width: '100%' }}>
            <div
              style={{
                color: '#ff3b30',
                fontSize: '18px',
                fontWeight: 'bold',
                marginBottom: '12px',
                letterSpacing: '0.5px',
              }}
            >
              Application Error
            </div>
            <div
              style={{
                fontSize: '14px',
                lineHeight: '1.4',
                marginBottom: '16px',
                wordBreak: 'break-word',
                color: '#ff9500',
              }}
            >
              {errorMsg}
            </div>

            {stackLines ? (
              <div style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    color: '#8e8e93',
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                    letterSpacing: '0.5px',
                  }}
                >
                  Stack Trace (first 8 lines):
                </div>
                <pre
                  style={{
                    backgroundColor: '#16161d',
                    padding: '12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    lineHeight: '1.4',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                    color: '#e5e5ea',
                    margin: 0,
                    border: '1px solid #2c2c36',
                  }}
                >
                  {stackLines}
                </pre>
              </div>
            ) : null}

            <div style={{ marginBottom: '24px' }}>
              <div
                style={{
                  fontSize: '11px',
                  color: '#8e8e93',
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                  letterSpacing: '0.5px',
                }}
              >
                User Agent:
              </div>
              <div
                style={{
                  backgroundColor: '#16161d',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  lineHeight: '1.3',
                  wordBreak: 'break-all',
                  color: '#aeaeb2',
                  border: '1px solid #2c2c36',
                }}
              >
                {ua}
              </div>
            </div>

            <button
              onClick={this.handleReload}
              style={{
                backgroundColor: '#ff6d00',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 28px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
