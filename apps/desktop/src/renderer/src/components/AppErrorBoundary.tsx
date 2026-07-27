import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('RENDERER_UNCAUGHT_ERROR', {
      message: error.message,
      componentStack: info.componentStack,
    });
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return <main className="page">
      <section className="panel" role="alert">
        <p className="eyebrow">CLIENT RENDER ERROR</p>
        <h1>页面加载失败</h1>
        <p>{this.state.error.message || '客户端遇到了未预期的页面错误。'}</p>
        <div className="button-row">
          <button className="button primary" onClick={() => window.location.reload()}>重新加载客户端</button>
        </div>
      </section>
    </main>;
  }
}
