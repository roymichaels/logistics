import React, { useState, useEffect } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { DashboardSkeleton } from '../../components/loading/UniversalSkeleton';
import { logger } from '../../lib/logger';
import { auditLog } from '../../services/auditLog';
import { useAuth } from '../../context/AuthContext';

interface KYCSubmission {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  submittedAt: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  priority: 'high' | 'medium' | 'low';
  verificationType: 'individual' | 'business';
  documents: {
    idDocument?: string;
    selfie?: string;
    proofOfAddress?: string;
    businessRegistration?: string;
  };
  notes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export default function KYCReviewQueue() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<KYCSubmission[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'under_review' | 'approved' | 'rejected'>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<KYCSubmission | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    loadSubmissions();
  }, [filter]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      logger.info('[KYCReviewQueue] Loading submissions', { filter });

      // TODO: Replace with actual DataClient call
      // Mock data for now
      const mockSubmissions: KYCSubmission[] = [
        {
          id: 'kyc_1',
          userId: 'user_1',
          userName: 'John Doe',
          userEmail: 'john@example.com',
          submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          priority: 'high',
          verificationType: 'individual',
          documents: {
            idDocument: '/uploads/id_1.jpg',
            selfie: '/uploads/selfie_1.jpg',
            proofOfAddress: '/uploads/address_1.pdf',
          },
        },
        {
          id: 'kyc_2',
          userId: 'user_2',
          userName: 'Jane Smith',
          userEmail: 'jane@example.com',
          submittedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          status: 'under_review',
          priority: 'medium',
          verificationType: 'business',
          documents: {
            idDocument: '/uploads/id_2.jpg',
            selfie: '/uploads/selfie_2.jpg',
            businessRegistration: '/uploads/business_2.pdf',
          },
          reviewedBy: 'Admin User',
        },
        {
          id: 'kyc_3',
          userId: 'user_3',
          userName: 'Bob Johnson',
          userEmail: 'bob@example.com',
          submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          status: 'approved',
          priority: 'low',
          verificationType: 'individual',
          documents: {
            idDocument: '/uploads/id_3.jpg',
            selfie: '/uploads/selfie_3.jpg',
          },
          reviewedBy: 'Admin User',
          reviewedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
        },
      ];

      const filtered = filter === 'all'
        ? mockSubmissions
        : mockSubmissions.filter(sub => sub.status === filter);

      setSubmissions(filtered);
    } catch (error) {
      logger.error('[KYCReviewQueue] Failed to load submissions', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (submissionId: string, action: 'approve' | 'reject') => {
    try {
      logger.info('[KYCReviewQueue] Reviewing submission', { submissionId, action });

      // TODO: Implement actual review logic with DataClient
      // await DataClient.kyc.reviewSubmission(submissionId, action, reviewNotes);

      if (user) {
        auditLog.logEvent(
          action === 'approve' ? 'user.update' : 'security.suspicious_activity',
          `KYC ${action === 'approve' ? 'approved' : 'rejected'}`,
          { submissionId, notes: reviewNotes },
          action === 'reject' ? 'warning' : 'info',
          user.id
        );
      }

      // Update local state
      setSubmissions(prev =>
        prev.map(sub =>
          sub.id === submissionId
            ? {
                ...sub,
                status: action === 'approve' ? 'approved' : 'rejected',
                reviewedBy: user?.email || 'Admin',
                reviewedAt: new Date().toISOString(),
                notes: reviewNotes,
              }
            : sub
        )
      );

      setSelectedSubmission(null);
      setReviewNotes('');
    } catch (error) {
      logger.error('[KYCReviewQueue] Failed to review submission', error);
    }
  };

  const handleStartReview = (submission: KYCSubmission) => {
    setSelectedSubmission(submission);
    setReviewNotes(submission.notes || '');

    // Update status to under_review
    setSubmissions(prev =>
      prev.map(sub =>
        sub.id === submission.id
          ? { ...sub, status: 'under_review' as const, reviewedBy: user?.email || 'Admin' }
          : sub
      )
    );
  };

  const getStatusColor = (status: KYCSubmission['status']) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'under_review':
        return '#3b82f6';
      case 'approved':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getPriorityColor = (priority: KYCSubmission['priority']) => {
    switch (priority) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <PageContainer>
        <DashboardSkeleton />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="KYC Review Queue"
        subtitle={`${submissions.filter(s => s.status === 'pending').length} pending submissions`}
      />

      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {(['all', 'pending', 'under_review', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: filter === status
                  ? 'rgba(59, 130, 246, 0.2)'
                  : 'rgba(255, 255, 255, 0.05)',
                color: filter === status ? '#60a5fa' : 'rgba(255, 255, 255, 0.7)',
                fontSize: '14px',
                fontWeight: filter === status ? '600' : '500',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.15s ease',
              }}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Submissions List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {submissions.length === 0 ? (
            <div style={{
              padding: '60px 20px',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.5)',
            }}>
              No submissions found
            </div>
          ) : (
            submissions.map((submission) => (
              <div
                key={submission.id}
                style={{
                  padding: '20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => handleStartReview(submission)}
              >
                {/* Priority Indicator */}
                <div
                  style={{
                    width: '4px',
                    height: '60px',
                    backgroundColor: getPriorityColor(submission.priority),
                    borderRadius: '2px',
                  }}
                />

                {/* User Info */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: 'rgba(255, 255, 255, 0.95)',
                    marginBottom: '4px',
                  }}>
                    {submission.userName}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    marginBottom: '8px',
                  }}>
                    {submission.userEmail}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.6)',
                    }}>
                      {submission.verificationType}
                    </span>
                    <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>•</span>
                    <span style={{
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.6)',
                    }}>
                      {formatTimeAgo(submission.submittedAt)}
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: `${getStatusColor(submission.status)}20`,
                    color: getStatusColor(submission.status),
                    fontSize: '12px',
                    fontWeight: '600',
                    textTransform: 'capitalize',
                  }}
                >
                  {submission.status.replace('_', ' ')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Review Modal */}
      {selectedSubmission && (
        <>
          <div
            onClick={() => setSelectedSubmission(null)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
              zIndex: 10000,
            }}
          />

          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '90vh',
              backgroundColor: 'rgba(17, 24, 39, 0.98)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              zIndex: 10001,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '600',
                color: 'rgba(255, 255, 255, 0.95)',
              }}>
                Review KYC Submission
              </h2>
            </div>

            {/* Content */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}>
              {/* User Details */}
              <div>
                <h3 style={{
                  margin: '0 0 12px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'rgba(255, 255, 255, 0.7)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  User Information
                </h3>
                <div style={{
                  padding: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '10px',
                  display: 'grid',
                  gap: '12px',
                }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>Name</div>
                    <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>{selectedSubmission.userName}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>Email</div>
                    <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>{selectedSubmission.userEmail}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>Type</div>
                    <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)', textTransform: 'capitalize' }}>
                      {selectedSubmission.verificationType}
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div>
                <h3 style={{
                  margin: '0 0 12px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'rgba(255, 255, 255, 0.7)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Submitted Documents
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  {Object.entries(selectedSubmission.documents).map(([key, value]) => (
                    value && (
                      <div
                        key={key}
                        style={{
                          padding: '16px',
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                          borderRadius: '10px',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{
                          fontSize: '12px',
                          color: 'rgba(255, 255, 255, 0.5)',
                          marginBottom: '8px',
                          textTransform: 'capitalize',
                        }}>
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        <div style={{
                          fontSize: '32px',
                          marginBottom: '8px',
                        }}>
                          📄
                        </div>
                        <button
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: 'rgba(59, 130, 246, 0.15)',
                            color: '#60a5fa',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: 'pointer',
                          }}
                        >
                          View
                        </button>
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* Review Notes */}
              <div>
                <h3 style={{
                  margin: '0 0 12px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'rgba(255, 255, 255, 0.7)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Review Notes
                </h3>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes about this review..."
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{
              padding: '20px 24px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setSelectedSubmission(null)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleReview(selectedSubmission.id, 'reject')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Reject
              </button>
              <button
                onClick={() => handleReview(selectedSubmission.id, 'approve')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#10b981',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Approve
              </button>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}
