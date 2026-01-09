/**
 * Catalog Audit Log Component
 *
 * Displays comprehensive audit trail for all catalog operations.
 * Shows who did what, when, and what changed.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { hasPermission } from '@/lib/rolePermissions';

interface AuditLogEntry {
  id: string;
  business_id: string;
  entity_type: string;
  entity_id?: string;
  action: string;
  action_category: string;
  description: string;
  before_value?: any;
  after_value?: any;
  changes_made?: any;
  performed_by: string;
  performed_at: string;
  user_role: string;
  ip_address?: string;
  status: string;
  error_message?: string;
}

interface CatalogAuditLogProps {
  userId: string;
  userRole: string;
  businessId: string;
}

export function CatalogAuditLog({ userId, userRole, businessId }: CatalogAuditLogProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const canViewLogs = hasPermission(userRole, 'permissions:audit_logs') ||
                      ['business_owner', 'manager', 'admin', 'superadmin'].includes(userRole);

  useEffect(() => {
    if (canViewLogs) {
      loadAuditLogs();
    }
  }, [filter, dateRange]);

  async function loadAuditLogs() {
    setLoading(true);
    try {
      let query = supabase
        .from('catalog_audit_logs')
        .select('*')
        .eq('business_id', businessId)
        .order('performed_at', { ascending: false })
        .limit(100);

      // Apply action filter
      if (filter !== 'all') {
        query = query.eq('action', filter);
      }

      // Apply date range filter
      const now = new Date();
      let startDate: Date | null = null;

      if (dateRange === 'today') {
        startDate = new Date(now.setHours(0, 0, 0, 0));
      } else if (dateRange === 'week') {
        startDate = new Date(now.setDate(now.getDate() - 7));
      } else if (dateRange === 'month') {
        startDate = new Date(now.setMonth(now.getMonth() - 1));
      }

      if (startDate) {
        query = query.gte('performed_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  }

  function getActionColor(action: string): string {
    const colors: Record<string, string> = {
      create: 'bg-green-100 text-green-800',
      update: 'bg-blue-100 text-blue-800',
      delete: 'bg-red-100 text-red-800',
      publish: 'bg-purple-100 text-purple-800',
      unpublish: 'bg-orange-100 text-orange-800',
      export: 'bg-gray-100 text-gray-800',
      import: 'bg-indigo-100 text-indigo-800',
      approve: 'bg-green-100 text-green-800',
      reject: 'bg-red-100 text-red-800',
      bulk_update: 'bg-blue-100 text-blue-800',
      bulk_delete: 'bg-red-100 text-red-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  }

  function getStatusIcon(status: string): string {
    if (status === 'success') return '✓';
    if (status === 'failed') return '✗';
    return '!';
  }

  if (!canViewLogs) {
    return (
      <div className="p-4">
        <div className="p-8 bg-yellow-50 border border-yellow-200 rounded text-center">
          <p className="text-yellow-800">
            You do not have permission to view audit logs.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="p-4">Loading audit logs...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Catalog Audit Log</h1>
        <div className="text-sm text-gray-600">
          {logs.length} entries
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border rounded"
        >
          <option value="all">All Actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="publish">Publish</option>
          <option value="unpublish">Unpublish</option>
          <option value="export">Export</option>
          <option value="import">Import</option>
          <option value="approve">Approve</option>
          <option value="reject">Reject</option>
        </select>

        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as any)}
          className="px-4 py-2 border rounded"
        >
          <option value="today">Today</option>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
          <option value="all">All Time</option>
        </select>

        <button
          onClick={loadAuditLogs}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {/* Audit Log Entries */}
      <div className="space-y-2">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No audit log entries found for the selected filters.
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="p-4 bg-white border rounded hover:border-blue-300 transition-colors cursor-pointer"
              onClick={() => setSelectedLog(log)}
            >
              <div className="flex items-start gap-3">
                {/* Status Icon */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-white ${
                    log.status === 'success'
                      ? 'bg-green-600'
                      : log.status === 'failed'
                      ? 'bg-red-600'
                      : 'bg-orange-600'
                  }`}
                >
                  {getStatusIcon(log.status)}
                </div>

                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                        {log.entity_type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(log.performed_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm mb-2">{log.description}</p>

                  {/* Metadata */}
                  <div className="text-xs text-gray-500">
                    By: <span className="font-medium">{log.user_role}</span>
                    {log.ip_address && ` from ${log.ip_address}`}
                  </div>

                  {/* Error Message */}
                  {log.error_message && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                      Error: {log.error_message}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Audit Log Details</h2>

            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong className="text-sm">Action:</strong>
                  <div className="text-sm">{selectedLog.action}</div>
                </div>
                <div>
                  <strong className="text-sm">Entity Type:</strong>
                  <div className="text-sm">{selectedLog.entity_type}</div>
                </div>
                <div>
                  <strong className="text-sm">Status:</strong>
                  <div className="text-sm">{selectedLog.status}</div>
                </div>
                <div>
                  <strong className="text-sm">Category:</strong>
                  <div className="text-sm">{selectedLog.action_category}</div>
                </div>
                <div>
                  <strong className="text-sm">Performed By:</strong>
                  <div className="text-sm">{selectedLog.user_role}</div>
                </div>
                <div>
                  <strong className="text-sm">Date & Time:</strong>
                  <div className="text-sm">{new Date(selectedLog.performed_at).toLocaleString()}</div>
                </div>
              </div>

              {/* Description */}
              <div>
                <strong className="text-sm">Description:</strong>
                <p className="text-sm text-gray-700 mt-1">{selectedLog.description}</p>
              </div>

              {/* Before Value */}
              {selectedLog.before_value && (
                <div>
                  <strong className="text-sm">Before:</strong>
                  <pre className="text-xs bg-gray-100 p-3 rounded mt-1 overflow-x-auto">
                    {JSON.stringify(selectedLog.before_value, null, 2)}
                  </pre>
                </div>
              )}

              {/* After Value */}
              {selectedLog.after_value && (
                <div>
                  <strong className="text-sm">After:</strong>
                  <pre className="text-xs bg-gray-100 p-3 rounded mt-1 overflow-x-auto">
                    {JSON.stringify(selectedLog.after_value, null, 2)}
                  </pre>
                </div>
              )}

              {/* Changes Made */}
              {selectedLog.changes_made && (
                <div>
                  <strong className="text-sm">Changes:</strong>
                  <pre className="text-xs bg-blue-50 p-3 rounded mt-1 overflow-x-auto">
                    {JSON.stringify(selectedLog.changes_made, null, 2)}
                  </pre>
                </div>
              )}

              {/* Error Message */}
              {selectedLog.error_message && (
                <div>
                  <strong className="text-sm">Error Message:</strong>
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded mt-1">
                    {selectedLog.error_message}
                  </div>
                </div>
              )}

              {/* Technical Details */}
              <div className="pt-4 border-t">
                <strong className="text-sm">Technical Details:</strong>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-600">
                  <div>Log ID: {selectedLog.id}</div>
                  <div>Entity ID: {selectedLog.entity_id || 'N/A'}</div>
                  <div>Business ID: {selectedLog.business_id}</div>
                  {selectedLog.ip_address && <div>IP Address: {selectedLog.ip_address}</div>}
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
