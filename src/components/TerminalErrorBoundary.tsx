'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  isActive?: boolean;
}

interface State {
  hasError: boolean;
}

export default class TerminalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Standard console.error is used here for diagnostic purposes.
    console.error("Terminal component error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError || this.props.isActive) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#09090b] text-[#38bdf8] font-mono p-4 select-none z-50">
          <div className="flex flex-col items-center gap-3 border border-[#38bdf8]/20 bg-[#38bdf8]/5 px-6 py-6 rounded max-w-sm text-center shadow-[0_0_15px_rgba(56,189,248,0.15)]">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 bg-[#38bdf8] rounded-full animate-ping"></span>
              <span className="text-[10px] font-black tracking-widest text-[#38bdf8] uppercase">
                SYSTEM FEED OFFLINE
              </span>
            </div>
            <span className="text-xs font-semibold text-zinc-200">
              Reconnecting to Node...
            </span>
            <div className="text-[9px] text-zinc-500 font-light flex items-center gap-1">
              <span>ERR_CONN_TIMEOUT</span>
              <span className="animate-pulse">|</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
