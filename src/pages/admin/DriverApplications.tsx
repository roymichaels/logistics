import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../lib/logger';
import { driverService, DriverApplication } from '../../services/driver';
import { undergroundTheme } from '../../styles/undergroundTheme';
import {
  UndergroundCard,
  UndergroundButton,
  UndergroundInput,
  UndergroundSelect,
  UndergroundTable,
  UndergroundSection,
  UndergroundBadge,
  UndergroundLoadingSpinner,
  UndergroundModal
} from '../../components/underground';

type ApplicationFilter = 'all' | 'pending' | 'approved' | 'rejected';

const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'secondary' => {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'error';
  if (status === 'pending') return 'warning';
  return 'secondary';
};

export default function DriverApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<DriverApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ApplicationFilter>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [reviewModal, setReviewModal] = useState<{
    application: DriverApplication | null;
    action: 'approve' | 'reject' | null;
    notes: string;
  }>({
    application: null,
    action: null,
    notes: ''
  });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const { data, error } = await driverService.getPendingApplications();

      if (error) {
        logger.error('Failed to load driver applications', { error });
        return;
      }

      setApplications(data || []);
      logger.info('Loaded driver applications', { count: data.length });
    } catch (error) {
      logger.error('Exception loading driver applications', error);
    } finally {
      setLoading(false);
    }
  };

  const openReviewModal = (application: DriverApplication, action: 'approve' | 'reject') => {
    setReviewModal({
      application,
      action,
      notes: ''
    });
  };

  const closeReviewModal = () => {
    setReviewModal({
      application: null,
      action: null,
      notes: ''
    });
  };

  const handleApprove = async () => {
    if (!reviewModal.application || !user?.id) return;

    try {
      setProcessing(true);
      const { error } = await driverService.approveDriverApplication(
        reviewModal.application.id,
        user.id,
        reviewModal.notes || undefined
      );

      if (error) {
        logger.error('Failed to approve application', { error });
        return;
      }

      closeReviewModal();
      loadApplications();
    } catch (error) {
      logger.error('Exception approving application', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!reviewModal.application || !user?.id) return;

    if (!reviewModal.notes.trim()) {
      return;
    }

    try {
      setProcessing(true);
      const { error } = await driverService.rejectDriverApplication(
        reviewModal.application.id,
        user.id,
        reviewModal.notes
      );

      if (error) {
        logger.error('Failed to reject application', { error });
        return;
      }

      closeReviewModal();
      loadApplications();
    } catch (error) {
      logger.error('Exception rejecting application', error);
    } finally {
      setProcessing(false);
    }
  };

  const filteredApplications = applications.filter((app) => {
    const matchesFilter = filter === 'all' || app.status === filter;
    const matchesSearch = !searchTerm ||
      app.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.phone?.includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: undergroundTheme.colors.gradient.primary
      }}>
        <UndergroundLoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: undergroundTheme.colors.gradient.primary,
      padding: undergroundTheme.spacing.xl,
      paddingBottom: undergroundTheme.spacing['8xl']
    }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <UndergroundSection
          title="Driver Applications"
          icon="🚗"
          style={{ marginBottom: undergroundTheme.spacing.xl }}
        >
          <UndergroundCard style={{ marginBottom: undergroundTheme.spacing.lg }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: undergroundTheme.spacing.md,
              marginBottom: undergroundTheme.spacing.lg
            }}>
              <UndergroundInput
                type="text"
                placeholder="Search applications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon="🔍"
              />

              <UndergroundSelect
                value={filter}
                onChange={(e) => setFilter(e.target.value as ApplicationFilter)}
              >
                <option value="all">All Applications</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </UndergroundSelect>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{
                fontSize: undergroundTheme.typography.fontSize.sm,
                color: undergroundTheme.colors.text.secondary
              }}>
                Showing {filteredApplications.length} of {applications.length} applications
              </div>

              <UndergroundButton
                variant="secondary"
                size="small"
                onClick={loadApplications}
              >
                Refresh
              </UndergroundButton>
            </div>
          </UndergroundCard>

          <UndergroundCard>
            <UndergroundTable
              headers={['Applicant', 'Contact', 'Status', 'Applied', 'Actions']}
              rows={filteredApplications.map((app) => [
                <div key="applicant">
                  <div style={{
                    fontWeight: undergroundTheme.typography.fontWeight.semibold,
                    color: undergroundTheme.colors.text.primary,
                    marginBottom: undergroundTheme.spacing.xs
                  }}>
                    {app.full_name || 'No name'}
                  </div>
                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize.xs,
                    color: undergroundTheme.colors.text.tertiary
                  }}>
                    {app.license_number || 'No license'}
                  </div>
                </div>,

                <div key="contact">
                  {app.email && (
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.primary,
                      marginBottom: undergroundTheme.spacing.xs
                    }}>
                      {app.email}
                    </div>
                  )}
                  {app.phone && (
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.xs,
                      color: undergroundTheme.colors.text.tertiary
                    }}>
                      {app.phone}
                    </div>
                  )}
                </div>,

                <UndergroundBadge key="status" variant={getStatusVariant(app.status)}>
                  {app.status}
                </UndergroundBadge>,

                <div key="applied" style={{
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  color: undergroundTheme.colors.text.secondary
                }}>
                  {new Date(app.created_at).toLocaleDateString()}
                </div>,

                <div key="actions" style={{ display: 'flex', gap: undergroundTheme.spacing.sm }}>
                  {app.status === 'pending' && (
                    <>
                      <UndergroundButton
                        variant="primary"
                        size="small"
                        onClick={() => openReviewModal(app, 'approve')}
                      >
                        Approve
                      </UndergroundButton>
                      <UndergroundButton
                        variant="ghost"
                        size="small"
                        onClick={() => openReviewModal(app, 'reject')}
                      >
                        Reject
                      </UndergroundButton>
                    </>
                  )}
                  {app.status !== 'pending' && (
                    <UndergroundButton
                      variant="ghost"
                      size="small"
                      disabled
                    >
                      {app.status}
                    </UndergroundButton>
                  )}
                </div>
              ])}
            />
          </UndergroundCard>
        </UndergroundSection>
      </div>

      <UndergroundModal
        isOpen={!!reviewModal.application}
        onClose={closeReviewModal}
        title={`${reviewModal.action === 'approve' ? 'Approve' : 'Reject'} Application`}
      >
        {reviewModal.application && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: undergroundTheme.spacing.lg
          }}>
            <div>
              <div style={{
                fontSize: undergroundTheme.typography.fontSize.sm,
                color: undergroundTheme.colors.text.tertiary,
                marginBottom: undergroundTheme.spacing.xs
              }}>
                Applicant
              </div>
              <div style={{
                fontSize: undergroundTheme.typography.fontSize.lg,
                fontWeight: undergroundTheme.typography.fontWeight.bold,
                color: undergroundTheme.colors.text.primary
              }}>
                {reviewModal.application.full_name}
              </div>
            </div>

            <UndergroundInput
              type="text"
              label={reviewModal.action === 'approve' ? 'Optional Notes' : 'Rejection Reason (Required)'}
              placeholder={reviewModal.action === 'approve' ? 'Add notes...' : 'Explain why...'}
              value={reviewModal.notes}
              onChange={(e) => setReviewModal({ ...reviewModal, notes: e.target.value })}
              multiline
              rows={4}
            />

            <div style={{
              display: 'flex',
              gap: undergroundTheme.spacing.md,
              marginTop: undergroundTheme.spacing.lg
            }}>
              <UndergroundButton
                variant={reviewModal.action === 'approve' ? 'primary' : 'error'}
                onClick={reviewModal.action === 'approve' ? handleApprove : handleReject}
                disabled={processing}
                style={{ flex: 1 }}
              >
                {processing ? 'Processing...' : (reviewModal.action === 'approve' ? 'Approve' : 'Reject')}
              </UndergroundButton>
              <UndergroundButton
                variant="ghost"
                onClick={closeReviewModal}
                disabled={processing}
                style={{ flex: 1 }}
              >
                Cancel
              </UndergroundButton>
            </div>
          </div>
        )}
      </UndergroundModal>
    </div>
  );
}
