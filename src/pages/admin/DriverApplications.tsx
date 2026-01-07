import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/molecules/Card';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Modal } from '../../components/molecules/Modal';
import { logger } from '../../lib/logger';
import { Toast } from '../../components/Toast';
import { driverService, DriverApplication } from '../../services/driver';
import { spacing, colors } from '../../styles/design-system';

type ApplicationFilter = 'all' | 'pending' | 'approved' | 'rejected';

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
        Toast.error('Failed to load applications');
        return;
      }

      setApplications(data || []);
      logger.info('Loaded driver applications', { count: data.length });
    } catch (error) {
      logger.error('Exception loading driver applications', error);
      Toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
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
        Toast.error('Failed to approve application');
        return;
      }

      Toast.success('Driver application approved');
      closeReviewModal();
      loadApplications();
    } catch (error) {
      logger.error('Exception approving application', error);
      Toast.error('Failed to approve application');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!reviewModal.application || !user?.id) return;

    if (!reviewModal.notes.trim()) {
      Toast.error('Please provide a reason for rejection');
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
        Toast.error('Failed to reject application');
        return;
      }

      Toast.success('Driver application rejected');
      closeReviewModal();
      loadApplications();
    } catch (error) {
      logger.error('Exception rejecting application', error);
      Toast.error('Failed to reject application');
    } finally {
      setProcessing(false);
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

  const filteredApplications = applications.filter((app) => {
    if (filter !== 'all' && app.status !== filter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        app.phone?.toLowerCase().includes(search) ||
        app.license_number?.toLowerCase().includes(search) ||
        app.vehicle_plate?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return colors.status.success;
      case 'rejected':
        return colors.status.error;
      case 'pending':
        return colors.status.warning;
      default:
        return colors.text.tertiary;
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'approved':
        return colors.status.successFaded;
      case 'rejected':
        return colors.status.errorFaded;
      case 'pending':
        return colors.status.warningFaded;
      default:
        return colors.border.primary;
    }
  };

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType) {
      case 'motorcycle':
        return '🏍️';
      case 'car':
        return '🚗';
      case 'van':
        return '🚐';
      case 'truck':
        return '🚚';
      default:
        return '🚗';
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title="Driver Applications" />
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Driver Applications"
        subtitle="Review and approve driver applications"
      />

      <div style={{ padding: spacing.lg }}>
        <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.lg, flexWrap: 'wrap' }}>
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by phone, license, or plate..."
            style={{ flex: 1, minWidth: '200px' }}
          />

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as ApplicationFilter)}
            style={{
              padding: spacing.sm,
              borderRadius: '8px',
              border: `1px solid ${colors.border.secondary}`,
              minWidth: '150px',
              background: colors.background.primary,
              color: colors.text.primary
            }}
          >
            <option value="all">All Applications</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: spacing.md, marginBottom: spacing.lg }}>
          <Card style={{ padding: spacing.md, textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: colors.status.warning }}>
              {applications.filter((a) => a.status === 'pending').length}
            </div>
            <div style={{ fontSize: '0.875rem', color: colors.text.secondary, marginTop: spacing.xs }}>
              Pending
            </div>
          </Card>

          <Card style={{ padding: spacing.md, textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: colors.status.success }}>
              {applications.filter((a) => a.status === 'approved').length}
            </div>
            <div style={{ fontSize: '0.875rem', color: colors.text.secondary, marginTop: spacing.xs }}>
              Approved
            </div>
          </Card>

          <Card style={{ padding: spacing.md, textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: colors.status.error }}>
              {applications.filter((a) => a.status === 'rejected').length}
            </div>
            <div style={{ fontSize: '0.875rem', color: colors.text.secondary, marginTop: spacing.xs }}>
              Rejected
            </div>
          </Card>
        </div>

        {filteredApplications.length === 0 ? (
          <Card>
            <div style={{ padding: spacing.xl, textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: spacing.md }}>📋</div>
              <p style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: spacing.sm, color: colors.text.primary }}>
                No applications found
              </p>
              <p style={{ color: colors.text.tertiary, fontSize: '0.875rem' }}>
                {searchTerm ? 'Try adjusting your search' : 'Driver applications will appear here'}
              </p>
            </div>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            {filteredApplications.map((application) => (
              <Card key={application.id}>
                <div style={{ padding: spacing.lg }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: spacing.lg }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm }}>
                        <div style={{ fontSize: '2rem' }}>{getVehicleIcon(application.vehicle_type)}</div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: colors.text.primary }}>
                              {application.vehicle_type.toUpperCase()} Driver
                            </h3>
                            <span
                              style={{
                                padding: `${spacing.xs} ${spacing.sm}`,
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: getStatusColor(application.status),
                                backgroundColor: getStatusBgColor(application.status),
                                textTransform: 'uppercase'
                              }}
                            >
                              {application.status}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.875rem', color: colors.text.secondary }}>
                            Applied {new Date(application.submitted_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: spacing.sm,
                          marginTop: spacing.md,
                          fontSize: '0.875rem',
                          color: colors.text.secondary
                        }}
                      >
                        <div>
                          <strong style={{ color: colors.text.primary }}>Phone:</strong> {application.phone}
                        </div>
                        <div>
                          <strong style={{ color: colors.text.primary }}>License:</strong> {application.license_number}
                        </div>
                        <div>
                          <strong style={{ color: colors.text.primary }}>Vehicle Plate:</strong> {application.vehicle_plate}
                        </div>
                        <div>
                          <strong style={{ color: colors.text.primary }}>Availability:</strong> {application.availability}
                        </div>
                      </div>

                      {application.notes && (
                        <div
                          style={{
                            marginTop: spacing.md,
                            padding: spacing.md,
                            background: colors.background.secondary,
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            color: colors.text.secondary
                          }}
                        >
                          <strong style={{ color: colors.text.primary }}>Notes:</strong> {application.notes}
                        </div>
                      )}

                      {application.review_notes && (
                        <div
                          style={{
                            marginTop: spacing.md,
                            padding: spacing.md,
                            background: colors.background.secondary,
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            color: colors.text.secondary
                          }}
                        >
                          <strong style={{ color: colors.text.primary }}>Review Notes:</strong> {application.review_notes}
                        </div>
                      )}
                    </div>

                    {application.status === 'pending' && (
                      <div style={{ display: 'flex', gap: spacing.sm }}>
                        <Button onClick={() => openReviewModal(application, 'approve')} variant="primary">
                          Approve
                        </Button>
                        <Button onClick={() => openReviewModal(application, 'reject')} variant="danger">
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={reviewModal.application !== null}
        onClose={closeReviewModal}
        title={reviewModal.action === 'approve' ? 'Approve Driver Application' : 'Reject Driver Application'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          {reviewModal.application && (
            <div
              style={{
                padding: spacing.md,
                background: colors.background.secondary,
                borderRadius: '8px',
                fontSize: '0.875rem'
              }}
            >
              <p style={{ margin: 0, marginBottom: spacing.xs, color: colors.text.primary }}>
                <strong>Driver:</strong> {reviewModal.application.phone}
              </p>
              <p style={{ margin: 0, marginBottom: spacing.xs, color: colors.text.primary }}>
                <strong>Vehicle:</strong> {reviewModal.application.vehicle_type} ({reviewModal.application.vehicle_plate})
              </p>
              <p style={{ margin: 0, color: colors.text.primary }}>
                <strong>License:</strong> {reviewModal.application.license_number}
              </p>
            </div>
          )}

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: spacing.sm,
                fontSize: '0.875rem',
                fontWeight: 600,
                color: colors.text.primary
              }}
            >
              {reviewModal.action === 'approve' ? 'Notes (optional)' : 'Reason for rejection *'}
            </label>
            <textarea
              value={reviewModal.notes}
              onChange={(e) => setReviewModal({ ...reviewModal, notes: e.target.value })}
              placeholder={
                reviewModal.action === 'approve'
                  ? 'Add any notes for this approval...'
                  : 'Provide a reason for rejection...'
              }
              rows={4}
              style={{
                width: '100%',
                padding: spacing.md,
                border: `1px solid ${colors.border.secondary}`,
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                background: colors.background.primary,
                color: colors.text.primary
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: spacing.md, marginTop: spacing.md }}>
            {reviewModal.action === 'approve' ? (
              <Button onClick={handleApprove} variant="primary" style={{ flex: 1 }} disabled={processing}>
                {processing ? 'Processing...' : 'Approve Application'}
              </Button>
            ) : (
              <Button onClick={handleReject} variant="danger" style={{ flex: 1 }} disabled={processing}>
                {processing ? 'Processing...' : 'Reject Application'}
              </Button>
            )}
            <Button onClick={closeReviewModal} style={{ flex: 1 }} disabled={processing}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
