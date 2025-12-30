import React, { useEffect, useState } from 'react';
import { logger } from '../lib/logger';

interface Business {
  id: string;
  name: string;
  business_type: string;
  active: boolean;
}

interface SupportOverrideSession {
  id: string;
  business_id: string;
  reason: string;
  status: string;
  activated_at: string;
  expires_at: string;
  actions_count: number;
  last_action_at: string | null;
  business?: Business;
}

interface OverrideAction {
  id: string;
  action_type: string;
  target_entity_type: string;
  target_entity_id: string | null;
  action_details: string | null;
  performed_at: string;
}

export function InfrastructureManagerDashboard() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeSessions, setActiveSessions] = useState<SupportOverrideSession[]>([]);
  const [sessionHistory, setSessionHistory] = useState<SupportOverrideSession[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionActions, setSessionActions] = useState<OverrideAction[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadActiveSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedSession) {
      loadSessionActions(selectedSession);
    }
  }, [selectedSession]);

  async function loadData() {
    try {
      setLoading(true);
      await Promise.all([
        loadBusinesses(),
        loadActiveSessions(),
        loadSessionHistory()
      ]);
    } catch (err) {
      logger.error('Failed to load data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  async function loadBusinesses() {
    const mockData: Business[] = [
      { id: 'biz1', name: 'Security Shop', business_type: 'Retail', active: true },
      { id: 'biz2', name: 'Privacy Vault', business_type: 'Enterprise', active: true },
      { id: 'biz3', name: 'CryptoGuard', business_type: 'B2B', active: true }
    ];
    setBusinesses(mockData);
  }

  async function loadActiveSessions() {
    setActiveSessions([]);
  }

  async function loadSessionHistory() {
    setSessionHistory([]);
  }

  async function loadSessionActions(sessionId: string) {
    setSessionActions([]);
  }

  async function handleActivateOverride() {
    if (!selectedBusiness || !overrideReason.trim()) {
      setError('Please select a business and provide a reason');
      return;
    }

    if (overrideReason.trim().length < 10) {
      setError('Reason must be at least 10 characters');
      return;
    }

    try {
      setActivating(true);
      setError(null);

      setOverrideReason('');
      setSelectedBusiness('');
      await loadActiveSessions();
      alert('Support override activated successfully (mock mode)');
    } catch (err: any) {
      logger.error('Failed to activate override:', err);
      setError(err.message || 'Failed to activate support override');
    } finally {
      setActivating(false);
    }
  }

  async function handleDeactivateOverride(sessionId: string) {
    if (!confirm('Are you sure you want to deactivate this support override session?')) {
      return;
    }

    try {
      await loadActiveSessions();
      await loadSessionHistory();
      alert('Support override deactivated (mock mode)');
    } catch (err: any) {
      logger.error('Failed to deactivate override:', err);
      setError(err.message || 'Failed to deactivate override');
    }
  }

  function getTimeRemaining(expiresAt: string): string {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();

    if (diffMs <= 0) return 'Expired';

    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m remaining`;
    }
    return `${mins}m remaining`;
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading Infrastructure Manager Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="infrastructure-manager-dashboard">
      <div className="dashboard-header">
        <h1>Infrastructure Manager Dashboard</h1>
        <p className="subtitle">Support Access & Cross-Business Operations</p>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      <div className="dashboard-grid">
        {/* Activate Support Override Panel */}
        <div className="panel activate-override-panel">
          <h2>Activate Support Override</h2>
          <p className="panel-description">
            Request temporary elevated access to assist a specific business.
            All actions will be audited and business owners will be notified.
          </p>

          <div className="form-group">
            <label>Select Business</label>
            <select
              value={selectedBusiness}
              onChange={(e) => setSelectedBusiness(e.target.value)}
              disabled={activating}
            >
              <option value="">-- Select a business --</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name} ({business.business_type})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Duration (minutes)</label>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
              disabled={activating}
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
            </select>
          </div>

          <div className="form-group">
            <label>Reason for Support Access (minimum 10 characters)</label>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Describe why you need support access to this business..."
              rows={3}
              disabled={activating}
            />
            <small>{overrideReason.length} / 10 characters minimum</small>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleActivateOverride}
            disabled={activating || !selectedBusiness || overrideReason.trim().length < 10}
          >
            {activating ? 'Activating...' : 'Activate Support Override'}
          </button>
        </div>

        {/* Active Sessions Panel */}
        <div className="panel active-sessions-panel">
          <h2>Active Override Sessions</h2>
          {activeSessions.length === 0 ? (
            <div className="empty-state">
              <p>No active support override sessions</p>
            </div>
          ) : (
            <div className="sessions-list">
              {activeSessions.map((session) => (
                <div key={session.id} className="session-card active">
                  <div className="session-header">
                    <div className="session-business">
                      <strong>{session.business?.name}</strong>
                      <span className="business-type">{session.business?.business_type}</span>
                    </div>
                    <div className="session-status">
                      <span className="status-badge active">ACTIVE</span>
                      <span className="time-remaining">
                        {getTimeRemaining(session.expires_at)}
                      </span>
                    </div>
                  </div>

                  <div className="session-details">
                    <div className="detail-row">
                      <span className="label">Reason:</span>
                      <span className="value">{session.reason}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Activated:</span>
                      <span className="value">
                        {new Date(session.activated_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Actions Performed:</span>
                      <span className="value">{session.actions_count}</span>
                    </div>
                  </div>

                  <div className="session-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedSession(session.id)}
                    >
                      View Actions
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeactivateOverride(session.id)}
                    >
                      Deactivate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Session History Panel */}
        <div className="panel session-history-panel">
          <h2>Recent Session History</h2>
          {sessionHistory.length === 0 ? (
            <div className="empty-state">
              <p>No historical sessions</p>
            </div>
          ) : (
            <div className="sessions-list">
              {sessionHistory.map((session) => (
                <div key={session.id} className={`session-card ${session.status}`}>
                  <div className="session-header">
                    <div className="session-business">
                      <strong>{session.business?.name}</strong>
                    </div>
                    <span className={`status-badge ${session.status}`}>
                      {session.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="session-details">
                    <div className="detail-row">
                      <span className="label">Reason:</span>
                      <span className="value">{session.reason}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Duration:</span>
                      <span className="value">
                        {new Date(session.activated_at).toLocaleString()} →{' '}
                        {new Date(session.expires_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Actions:</span>
                      <span className="value">{session.actions_count}</span>
                    </div>
                  </div>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedSession(session.id)}
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions Modal */}
      {selectedSession && (
        <div className="modal-overlay" onClick={() => setSelectedSession(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Session Actions Log</h3>
              <button className="close-btn" onClick={() => setSelectedSession(null)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              {sessionActions.length === 0 ? (
                <p>No actions recorded for this session</p>
              ) : (
                <div className="actions-log">
                  {sessionActions.map((action) => (
                    <div key={action.id} className="action-entry">
                      <div className="action-header">
                        <span className={`action-type ${action.action_type}`}>
                          {action.action_type}
                        </span>
                        <span className="action-time">
                          {new Date(action.performed_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="action-details">
                        <div>
                          <strong>Entity:</strong> {action.target_entity_type}
                        </div>
                        {action.target_entity_id && (
                          <div>
                            <strong>ID:</strong> {action.target_entity_id}
                          </div>
                        )}
                        {action.action_details && (
                          <div>
                            <strong>Details:</strong> {action.action_details}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .infrastructure-manager-dashboard {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .dashboard-header {
          margin-bottom: 32px;
        }

        .dashboard-header h1 {
          margin: 0 0 8px 0;
          font-size: 28px;
          color: #111827;
        }

        .subtitle {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }

        .error-banner {
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .error-banner button {
          background: none;
          border: none;
          color: #dc2626;
          font-size: 20px;
          cursor: pointer;
          padding: 0 8px;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
          gap: 24px;
        }

        .panel {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .panel h2 {
          margin: 0 0 8px 0;
          font-size: 18px;
          color: #111827;
        }

        .panel-description {
          margin: 0 0 20px 0;
          font-size: 14px;
          color: #6b7280;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
        }

        .form-group textarea {
          resize: vertical;
        }

        .form-group small {
          display: block;
          margin-top: 4px;
          font-size: 12px;
          color: #6b7280;
        }

        .btn {
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-primary {
          background: #667eea;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #5568d3;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn-secondary:hover {
          background: #f9fafb;
        }

        .btn-danger {
          background: #dc2626;
          color: white;
        }

        .btn-danger:hover {
          background: #b91c1c;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 13px;
        }

        .sessions-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .session-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          background: white;
        }

        .session-card.active {
          border-color: #10b981;
          background: #ecfdf5;
        }

        .session-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .session-business strong {
          display: block;
          font-size: 16px;
          color: #111827;
          margin-bottom: 4px;
        }

        .business-type {
          font-size: 12px;
          color: #6b7280;
        }

        .session-status {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }

        .status-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-badge.active {
          background: #10b981;
          color: white;
        }

        .status-badge.expired {
          background: #6b7280;
          color: white;
        }

        .status-badge.deactivated {
          background: #f59e0b;
          color: white;
        }

        .time-remaining {
          font-size: 12px;
          color: #059669;
          font-weight: 600;
        }

        .session-details {
          margin-bottom: 16px;
        }

        .detail-row {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 13px;
        }

        .detail-row .label {
          font-weight: 600;
          color: #6b7280;
          min-width: 100px;
        }

        .detail-row .value {
          color: #111827;
          flex: 1;
        }

        .session-actions {
          display: flex;
          gap: 8px;
        }

        .empty-state {
          padding: 40px 20px;
          text-align: center;
          color: #6b7280;
        }

        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f4f6;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: white;
          border-radius: 12px;
          max-width: 800px;
          width: 90%;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 18px;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          color: #6b7280;
          cursor: pointer;
          padding: 0 8px;
        }

        .modal-body {
          padding: 24px;
          overflow-y: auto;
        }

        .actions-log {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .action-entry {
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 12px;
        }

        .action-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .action-type {
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .action-type.read {
          background: #dbeafe;
          color: #1e40af;
        }

        .action-type.update {
          background: #fef3c7;
          color: #92400e;
        }

        .action-type.create {
          background: #d1fae5;
          color: #065f46;
        }

        .action-time {
          font-size: 12px;
          color: #6b7280;
        }

        .action-details {
          font-size: 13px;
        }

        .action-details div {
          margin-bottom: 4px;
        }

        .action-details strong {
          color: #6b7280;
          margin-right: 6px;
        }
      `}</style>
    </div>
  );
}
