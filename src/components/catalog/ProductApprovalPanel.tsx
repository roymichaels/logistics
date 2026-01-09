/**
 * Product Approval Panel Component
 *
 * Displays pending change requests and approval interface.
 * For managers and business owners to review and approve/reject changes.
 */

import { useState, useEffect } from 'react';
import { ProductApprovalService, type ProductChangeRequest, type ApprovalStats } from '@/services/modules/ProductApprovalService';
import { hasPermission } from '@/lib/rolePermissions';

interface ProductApprovalPanelProps {
  userId: string;
  userRole: string;
  businessId: string;
}

export function ProductApprovalPanel({ userId, userRole, businessId }: ProductApprovalPanelProps) {
  const [requests, setRequests] = useState<ProductChangeRequest[]>([]);
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ProductChangeRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const approvalService = new ProductApprovalService(userId, userRole, businessId);
  const canApprove = hasPermission(userRole, 'catalog:approve_changes');

  useEffect(() => {
    loadData();
  }, [filter]);

  async function loadData() {
    setLoading(true);
    try {
      const filters: any = {};
      if (filter !== 'all') {
        filters.status = filter;
      }

      const [requestsData, statsData] = await Promise.all([
        approvalService.getChangeRequests(filters),
        approvalService.getApprovalStats(),
      ]);

      setRequests(requestsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading approval data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(requestId: string) {
    if (!canApprove) {
      alert('You do not have permission to approve requests');
      return;
    }

    const confirmed = confirm('Are you sure you want to approve this change?');
    if (!confirmed) return;

    try {
      await approvalService.approveRequest(requestId);
      await loadData();
      setSelectedRequest(null);
      alert('Change request approved successfully');
    } catch (error: any) {
      console.error('Error approving request:', error);
      alert(error.message || 'Failed to approve request');
    }
  }

  async function handleReject(requestId: string) {
    if (!canApprove) {
      alert('You do not have permission to reject requests');
      return;
    }

    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      await approvalService.rejectRequest(requestId, rejectionReason);
      await loadData();
      setSelectedRequest(null);
      setRejectionReason('');
      alert('Change request rejected');
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      alert(error.message || 'Failed to reject request');
    }
  }

  async function handleCancel(requestId: string) {
    const confirmed = confirm('Are you sure you want to cancel this request?');
    if (!confirmed) return;

    try {
      await approvalService.cancelRequest(requestId);
      await loadData();
      setSelectedRequest(null);
    } catch (error: any) {
      console.error('Error cancelling request:', error);
      alert(error.message || 'Failed to cancel request');
    }
  }

  function getChangeTypeLabel(changeType: string): string {
    const labels: Record<string, string> = {
      create: 'Create Product',
      edit: 'Edit Product',
      delete: 'Delete Product',
      price: 'Price Change',
      publish: 'Publish/Unpublish',
      bulk: 'Bulk Operation',
    };
    return labels[changeType] || changeType;
  }

  function getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      normal: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };
    return colors[priority] || colors.normal;
  }

  if (loading) {
    return <div className="p-4">Loading approval requests...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Product Approval Requests</h1>
        {!canApprove && (
          <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
            View Only
          </div>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded border">
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="p-4 bg-white rounded border">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-gray-600">Approved</div>
          </div>
          <div className="p-4 bg-white rounded border">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-gray-600">Rejected</div>
          </div>
          <div className="p-4 bg-white rounded border">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="px-4 py-2 border rounded"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {requests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No {filter !== 'all' && filter} requests found.
          </div>
        ) : (
          requests.map((request) => (
            <div
              key={request.id}
              className="p-4 bg-white border rounded hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-2">
                    <span className={`px-2 py-1 text-xs rounded ${getPriorityColor(request.priority)}`}>
                      {request.priority}
                    </span>
                    <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                      {getChangeTypeLabel(request.change_type)}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        request.status === 'pending'
                          ? 'bg-orange-100 text-orange-800'
                          : request.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {request.status}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-semibold text-lg mb-1">{request.title}</h3>
                  {request.description && (
                    <p className="text-sm text-gray-600 mb-2">{request.description}</p>
                  )}
                  {request.reason && (
                    <p className="text-sm text-gray-500 italic mb-2">
                      Reason: {request.reason}
                    </p>
                  )}

                  {/* Metadata */}
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>
                      Requested: {new Date(request.requested_at).toLocaleString()}
                    </div>
                    {request.reviewed_at && (
                      <div>
                        Reviewed: {new Date(request.reviewed_at).toLocaleString()}
                      </div>
                    )}
                    {request.rejection_reason && (
                      <div className="text-red-600">
                        Rejection Reason: {request.rejection_reason}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {request.status === 'pending' && (
                    <div className="mt-3 flex gap-2">
                      {canApprove && (
                        <>
                          <button
                            onClick={() => handleApprove(request.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setSelectedRequest(request)}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleCancel(request.id)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Rejection Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {getChangeTypeLabel(selectedRequest.change_type)} - {selectedRequest.title}
            </h2>

            {/* Request Details */}
            <div className="space-y-4 mb-6">
              <div>
                <strong className="text-sm">Description:</strong>
                <p className="text-sm text-gray-600">{selectedRequest.description || 'N/A'}</p>
              </div>

              {selectedRequest.reason && (
                <div>
                  <strong className="text-sm">Reason:</strong>
                  <p className="text-sm text-gray-600">{selectedRequest.reason}</p>
                </div>
              )}

              {/* Before/After Data */}
              {selectedRequest.before_data && (
                <div>
                  <strong className="text-sm">Before:</strong>
                  <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                    {JSON.stringify(selectedRequest.before_data, null, 2)}
                  </pre>
                </div>
              )}

              <div>
                <strong className="text-sm">Proposed Changes:</strong>
                <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                  {JSON.stringify(selectedRequest.after_data, null, 2)}
                </pre>
              </div>
            </div>

            {/* Rejection Reason */}
            {selectedRequest.status === 'pending' && canApprove && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Rejection Reason (required for rejection)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                  placeholder="Explain why this request is being rejected..."
                />
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex gap-2 justify-end">
              {selectedRequest.status === 'pending' && canApprove && (
                <>
                  <button
                    onClick={() => handleApprove(selectedRequest.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(selectedRequest.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Reject
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setRejectionReason('');
                }}
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
