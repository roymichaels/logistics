import React, { useState, useEffect } from 'react';
import { DataStore } from '../data/types';
import { logger } from '../lib/logger';

interface KycAdminReviewPanelProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

interface Verification {
  id: string;
  user_id: string;
  verification_status: string;
  verification_level: number;
  submitted_for_review_at: string;
  user: {
    full_name?: string;
    telegram_username?: string;
    email?: string;
  };
}

interface VerificationDetail {
  verification: any;
  documents: any[];
  identity_checks: any[];
  contact_verifications: any[];
  address_verifications: any[];
  review_history: any[];
  completeness_percentage: number;
}

export function KycAdminReviewPanel({ dataStore, onNavigate }: KycAdminReviewPanelProps) {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [selectedVerification, setSelectedVerification] = useState<VerificationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('under_review');
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadVerifications();
  }, [statusFilter]);

  const loadVerifications = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await dataStore.supabase!.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kyc-admin-review?status=${statusFilter}&limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load verifications');
      }

      const data = await response.json();
      setVerifications(data.verifications || []);
    } catch (err) {
      logger.error('Failed to load verifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load verifications');
    } finally {
      setLoading(false);
    }
  };

  const loadVerificationDetail = async (verificationId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await dataStore.supabase!.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kyc-admin-review?verification_id=${verificationId}`,
        {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load verification details');
      }

      const data = await response.json();
      setSelectedVerification(data);
    } catch (err) {
      logger.error('Failed to load verification details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load details');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!selectedVerification || !reviewAction) return;

    if (reviewAction === 'reject' && !rejectionReason) {
      setError('Please select a rejection reason');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await dataStore.supabase!.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kyc-admin-review`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            verification_id: selectedVerification.verification.id,
            action: reviewAction,
            review_notes: reviewNotes,
            rejection_reason: reviewAction === 'reject' ? rejectionReason : undefined,
            verification_level: 2
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Review submission failed');
      }

      setSelectedVerification(null);
      setReviewAction(null);
      setReviewNotes('');
      setRejectionReason('');
      await loadVerifications();
    } catch (err) {
      logger.error('Failed to submit review:', err);
      setError(err instanceof Error ? err.message : 'Review submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (selectedVerification) {
    const { verification, documents, identity_checks, contact_verifications, address_verifications, completeness_percentage } = selectedVerification;

    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backButton} onClick={() => setSelectedVerification(null)}>
            ← Back to List
          </button>
          <h2 style={styles.title}>KYC Verification Review</h2>
        </div>

        <div style={styles.content}>
          <div style={styles.userCard}>
            <h3 style={styles.sectionTitle}>User Information</h3>
            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Name:</span>
                <span style={styles.infoValue}>{verification.user?.full_name || 'N/A'}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Telegram:</span>
                <span style={styles.infoValue}>@{verification.user?.telegram_username || 'N/A'}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Status:</span>
                <span style={{...styles.statusBadge, ...getStatusStyle(verification.verification_status)}}>
                  {verification.verification_status}
                </span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Completeness:</span>
                <span style={styles.infoValue}>{completeness_percentage}%</span>
              </div>
            </div>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Documents ({documents.length})</h3>
            <div style={styles.documentsGrid}>
              {documents.map((doc: any) => (
                <div key={doc.id} style={styles.documentCard}>
                  <div style={styles.documentType}>{doc.document_type.replace('_', ' ')}</div>
                  <div style={styles.documentStatus}>{doc.document_status}</div>
                  {doc.issue_date && <div style={styles.documentInfo}>Issued: {doc.issue_date}</div>}
                  {doc.expiry_date && <div style={styles.documentInfo}>Expires: {doc.expiry_date}</div>}
                  {doc.issuing_country && <div style={styles.documentInfo}>Country: {doc.issuing_country}</div>}
                </div>
              ))}
            </div>
          </div>

          {identity_checks.length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Identity Checks ({identity_checks.length})</h3>
              {identity_checks.map((check: any) => (
                <div key={check.id} style={styles.checkCard}>
                  <div style={styles.checkType}>{check.check_type}</div>
                  <div style={styles.checkDetails}>
                    {check.liveness_passed !== null && (
                      <div>Liveness: {check.liveness_passed ? '✓ Passed' : '✗ Failed'}</div>
                    )}
                    {check.face_match_passed !== null && (
                      <div>Face Match: {check.face_match_passed ? '✓ Passed' : '✗ Failed'}</div>
                    )}
                    {check.liveness_score && (
                      <div>Liveness Score: {check.liveness_score}%</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {contact_verifications.length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Contact Verifications</h3>
              {contact_verifications.map((contact: any) => (
                <div key={contact.id} style={styles.verificationItem}>
                  <span>{contact.contact_type}: {contact.contact_value}</span>
                  <span style={contact.is_verified ? styles.verifiedBadge : styles.unverifiedBadge}>
                    {contact.is_verified ? 'Verified' : 'Unverified'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {address_verifications.length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Address Verification</h3>
              {address_verifications.map((address: any) => (
                <div key={address.id} style={styles.addressCard}>
                  <div>{address.address_line1}</div>
                  {address.address_line2 && <div>{address.address_line2}</div>}
                  <div>{address.city}, {address.postal_code}</div>
                  <div>{address.country}</div>
                  <div style={styles.verificationStatus}>
                    {address.is_verified ? '✓ Verified' : 'Pending Verification'}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={styles.reviewSection}>
            <h3 style={styles.sectionTitle}>Review Decision</h3>

            <div style={styles.actionButtons}>
              <button
                style={{...styles.actionButton, ...styles.approveButton}}
                onClick={() => setReviewAction('approve')}
              >
                ✓ Approve
              </button>
              <button
                style={{...styles.actionButton, ...styles.rejectButton}}
                onClick={() => setReviewAction('reject')}
              >
                ✗ Reject
              </button>
            </div>

            {reviewAction && (
              <div style={styles.reviewForm}>
                {reviewAction === 'reject' && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Rejection Reason</label>
                    <select
                      style={styles.select}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    >
                      <option value="">Select a reason...</option>
                      <option value="document_unclear">Document Unclear</option>
                      <option value="document_expired">Document Expired</option>
                      <option value="document_invalid">Document Invalid</option>
                      <option value="identity_mismatch">Identity Mismatch</option>
                      <option value="liveness_failed">Liveness Check Failed</option>
                      <option value="duplicate_account">Duplicate Account</option>
                      <option value="suspicious_activity">Suspicious Activity</option>
                      <option value="incomplete_information">Incomplete Information</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                )}

                <div style={styles.formGroup}>
                  <label style={styles.label}>Review Notes</label>
                  <textarea
                    style={styles.textarea}
                    rows={4}
                    placeholder="Add notes about your review decision..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                  />
                </div>

                {error && <div style={styles.error}>{error}</div>}

                <div style={styles.submitButtons}>
                  <button
                    style={styles.submitButton}
                    onClick={handleReviewSubmit}
                    disabled={loading}
                  >
                    {loading ? 'Submitting...' : `Submit ${reviewAction === 'approve' ? 'Approval' : 'Rejection'}`}
                  </button>
                  <button
                    style={styles.cancelButton}
                    onClick={() => {
                      setReviewAction(null);
                      setReviewNotes('');
                      setRejectionReason('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>KYC Verification Reviews</h2>
      </div>

      <div style={styles.filters}>
        <button
          style={{...styles.filterButton, ...(statusFilter === 'under_review' ? styles.activeFilter : {})}}
          onClick={() => setStatusFilter('under_review')}
        >
          Under Review
        </button>
        <button
          style={{...styles.filterButton, ...(statusFilter === 'approved' ? styles.activeFilter : {})}}
          onClick={() => setStatusFilter('approved')}
        >
          Approved
        </button>
        <button
          style={{...styles.filterButton, ...(statusFilter === 'rejected' ? styles.activeFilter : {})}}
          onClick={() => setStatusFilter('rejected')}
        >
          Rejected
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <div style={styles.loading}>Loading verifications...</div>
      ) : verifications.length === 0 ? (
        <div style={styles.empty}>
          <p>No verifications found with status: {statusFilter}</p>
        </div>
      ) : (
        <div style={styles.list}>
          {verifications.map((verification) => (
            <div
              key={verification.id}
              style={styles.listItem}
              onClick={() => loadVerificationDetail(verification.id)}
            >
              <div style={styles.listItemContent}>
                <div style={styles.userName}>
                  {verification.user?.full_name || verification.user?.telegram_username || 'Unknown User'}
                </div>
                <div style={styles.listItemMeta}>
                  <span style={styles.metaItem}>
                    Submitted: {new Date(verification.submitted_for_review_at).toLocaleDateString()}
                  </span>
                  <span style={{...styles.statusBadge, ...getStatusStyle(verification.verification_status)}}>
                    {verification.verification_status}
                  </span>
                </div>
              </div>
              <div style={styles.arrow}>→</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const getStatusStyle = (status: string): React.CSSProperties => {
  const styles: Record<string, React.CSSProperties> = {
    under_review: { backgroundColor: '#fff3cd', color: '#856404' },
    approved: { backgroundColor: '#d4edda', color: '#155724' },
    rejected: { backgroundColor: '#f8d7da', color: '#721c24' },
    document_pending: { backgroundColor: '#e0e0e0', color: '#666' }
  };
  return styles[status] || {};
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: 20
  },
  header: {
    marginBottom: 24
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: '#f0f0f0',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    cursor: 'pointer',
    marginBottom: 12
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    margin: 0
  },
  filters: {
    display: 'flex',
    gap: 12,
    marginBottom: 24
  },
  filterButton: {
    padding: '10px 20px',
    border: '1px solid #ddd',
    backgroundColor: '#fff',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  activeFilter: {
    backgroundColor: '#007AFF',
    color: '#fff',
    borderColor: '#007AFF'
  },
  loading: {
    textAlign: 'center',
    padding: 40,
    color: '#666'
  },
  empty: {
    textAlign: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    color: '#666'
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  listItemContent: {
    flex: 1
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333'
  },
  listItemMeta: {
    display: 'flex',
    gap: 12,
    alignItems: 'center'
  },
  metaItem: {
    fontSize: 13,
    color: '#666'
  },
  arrow: {
    fontSize: 20,
    color: '#999'
  },
  content: {
    maxWidth: 1000,
    margin: '0 auto'
  },
  userCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    marginBottom: 20,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4
  },
  infoLabel: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500'
  },
  infoValue: {
    fontSize: 15,
    color: '#333'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600'
  },
  section: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    marginBottom: 20,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  documentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: 16
  },
  documentCard: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    border: '1px solid #e0e0e0'
  },
  documentType: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
    textTransform: 'capitalize'
  },
  documentStatus: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8
  },
  documentInfo: {
    fontSize: 12,
    color: '#999',
    marginTop: 4
  },
  checkCard: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 12
  },
  checkType: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333'
  },
  checkDetails: {
    fontSize: 13,
    color: '#666',
    lineHeight: 1.6
  },
  verificationItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8
  },
  verifiedBadge: {
    padding: '4px 12px',
    backgroundColor: '#d4edda',
    color: '#155724',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600'
  },
  unverifiedBadge: {
    padding: '4px 12px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600'
  },
  addressCard: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    lineHeight: 1.6,
    fontSize: 14,
    color: '#666'
  },
  verificationStatus: {
    marginTop: 12,
    fontWeight: '600',
    color: '#333'
  },
  reviewSection: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  actionButtons: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
    marginBottom: 24
  },
  actionButton: {
    padding: 16,
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s'
  },
  approveButton: {
    backgroundColor: '#4caf50',
    color: '#fff'
  },
  rejectButton: {
    backgroundColor: '#f44336',
    color: '#fff'
  },
  reviewForm: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 8
  },
  formGroup: {
    marginBottom: 16
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333'
  },
  select: {
    width: '100%',
    padding: 12,
    fontSize: 15,
    border: '1px solid #ddd',
    borderRadius: 8,
    backgroundColor: '#fff'
  },
  textarea: {
    width: '100%',
    padding: 12,
    fontSize: 15,
    border: '1px solid #ddd',
    borderRadius: 8,
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  submitButtons: {
    display: 'flex',
    gap: 12
  },
  submitButton: {
    flex: 1,
    padding: 14,
    backgroundColor: '#007AFF',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: '600',
    cursor: 'pointer'
  },
  cancelButton: {
    padding: 14,
    backgroundColor: '#f0f0f0',
    color: '#333',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: '500',
    cursor: 'pointer'
  },
  error: {
    padding: 12,
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14
  }
};
