import React, { useState, useEffect } from 'react';
import { useTelegramUI } from '../hooks/useTelegramUI';

interface DebugLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  data?: any;
}

let debugLogs: DebugLog[] = [];
let logListeners: ((logs: DebugLog[]) => void)[] = [];

export const debugLog = {
  info: (message: string, data?: any) => addLog('info', message, data),
  warn: (message: string, data?: any) => addLog('warn', message, data),
  error: (message: string, data?: any) => addLog('error', message, data),
  success: (message: string, data?: any) => addLog('success', message, data),
  clear: () => {
    debugLogs = [];
    notifyListeners();
  }
};

function addLog(level: DebugLog['level'], message: string, data?: any) {
  const log: DebugLog = {
    timestamp: new Date().toLocaleTimeString('he-IL'),
    level,
    message,
    data
  };
  debugLogs.push(log);
  if (debugLogs.length > 50) {
    debugLogs.shift();
  }
  console.log(`[${level.toUpperCase()}]`, message, data || '');
  notifyListeners();
}

function notifyListeners() {
  logListeners.forEach(listener => listener([...debugLogs]));
}

export function DebugPanel() {
  const [logs, setLogs] = useState<DebugLog[]>([...debugLogs]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showData, setShowData] = useState<number | null>(null);
  const [isPinned, setIsPinned] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const { theme } = useTelegramUI();

  useEffect(() => {
    const listener = (newLogs: DebugLog[]) => setLogs(newLogs);
    logListeners.push(listener);
    return () => {
      logListeners = logListeners.filter(l => l !== listener);
    };
  }, []);

  const getLevelColor = (level: DebugLog['level']) => {
    switch (level) {
      case 'error': return '#ff3b30';
      case 'warn': return '#ff9500';
      case 'success': return '#34c759';
      default: return theme.text_color;
    }
  };

  const getLevelIcon = (level: DebugLog['level']) => {
    switch (level) {
      case 'error': return '❌';
      case 'warn': return '⚠️';
      case 'success': return '✅';
      default: return 'ℹ️';
    }
  };

  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '10px',
          backgroundColor: theme.button_color,
          color: theme.button_text_color,
          padding: '10px 16px',
          borderRadius: '20px',
          fontSize: '13px',
          fontWeight: '600',
          cursor: 'pointer',
          zIndex: 9999,
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        🐛 Debug ({logs.length})
      </div>
    );
  }

  if (!isExpanded && !isPinned) {
    return (
      <div
        onClick={() => setIsExpanded(true)}
        style={{
          position: 'fixed',
          bottom: '10px',
          left: '10px',
          backgroundColor: theme.button_color,
          color: theme.button_text_color,
          padding: '8px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '600',
          cursor: 'pointer',
          zIndex: 9999,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        🐛 Debug ({logs.length})
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '10px',
        left: '10px',
        right: '10px',
        maxHeight: '60vh',
        backgroundColor: theme.bg_color,
        border: `1px solid ${theme.hint_color}30`,
        borderRadius: '12px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          padding: '12px',
          borderBottom: `1px solid ${theme.hint_color}30`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: theme.secondary_bg_color || theme.bg_color
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>🐛</span>
          <span style={{ fontSize: '14px', fontWeight: '600', color: theme.text_color }}>
            Debug Logs ({logs.length})
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => debugLog.clear()}
            style={{
              padding: '4px 8px',
              backgroundColor: 'transparent',
              color: theme.hint_color,
              border: `1px solid ${theme.hint_color}30`,
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            Clear
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            style={{
              padding: '4px 8px',
              backgroundColor: 'transparent',
              color: theme.hint_color,
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: 'pointer',
              lineHeight: '1'
            }}
            title="Minimize"
          >
            −
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '8px',
          fontSize: '11px',
          fontFamily: 'monospace',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', color: theme.hint_color, padding: '20px' }}>
            No logs yet
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              style={{
                marginBottom: '6px',
                padding: '8px',
                backgroundColor: theme.secondary_bg_color || `${theme.hint_color}10`,
                borderRadius: '6px',
                borderLeft: `3px solid ${getLevelColor(log.level)}`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <span style={{ fontSize: '14px' }}>{getLevelIcon(log.level)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: getLevelColor(log.level), fontWeight: '600' }}>
                      {log.level.toUpperCase()}
                    </span>
                    <span style={{ color: theme.hint_color, fontSize: '10px' }}>
                      {log.timestamp}
                    </span>
                  </div>
                  <div style={{ color: theme.text_color, wordBreak: 'break-word' }}>
                    {log.message}
                  </div>
                  {log.data && (
                    <div style={{ marginTop: '6px' }}>
                      <button
                        onClick={() => setShowData(showData === index ? null : index)}
                        style={{
                          padding: '2px 6px',
                          backgroundColor: theme.button_color,
                          color: theme.button_text_color,
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '10px',
                          cursor: 'pointer'
                        }}
                      >
                        {showData === index ? 'Hide' : 'Show'} Data
                      </button>
                      {showData === index && (
                        <pre
                          style={{
                            marginTop: '6px',
                            padding: '6px',
                            backgroundColor: theme.bg_color,
                            borderRadius: '4px',
                            fontSize: '10px',
                            color: theme.text_color,
                            overflow: 'auto',
                            maxHeight: '150px'
                          }}
                        >
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
