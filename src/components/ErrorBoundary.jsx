import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col justify-center items-center bg-[#0e0e0e] text-white">
          <h2 className="text-[#f87171] text-2xl mb-2">⚠️ Something went wrong</h2>
          <p className="text-[#94a3b8] mb-4">{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-blue-600 rounded font-bold">Reload App</button>
        </div>
      );
    }
    return this.props.children;
  }
}
export default ErrorBoundary;