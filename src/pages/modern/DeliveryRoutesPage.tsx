import React, { useEffect, useState } from 'react';
import { MapTemplate } from '@/app/templates';
import { Box } from '@/components/atoms/Box';
import { Typography } from '@/components/atoms/Typography';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';

interface DeliveryRoutesPageProps {
  dataStore: any;
  onNavigate?: (path: string) => void;
}

interface RouteStop {
  id: string;
  order_id: string;
  customer_name: string;
  address: string;
  phone: string;
  status: 'pending' | 'in_progress' | 'completed';
  estimated_time: string;
  order_total: number;
  delivery_fee: number;
  special_instructions?: string;
  lat?: number;
  lng?: number;
}

export function DeliveryRoutesPage({ dataStore, onNavigate }: DeliveryRoutesPageProps) {
  const [routes, setRoutes] = useState<RouteStop[]>([]);
  const [selectedStop, setSelectedStop] = useState<RouteStop | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoutes();
  }, [dataStore]);

  const loadRoutes = async () => {
    let mounted = true;
    try {
      setLoading(true);
      const orders = (await dataStore?.listOrders?.()) ?? [];

      const activeOrders = orders.filter((o: any) =>
        ['ready', 'out_for_delivery'].includes(o.status)
      );

      if (mounted) {
        const stops: RouteStop[] = activeOrders.map((order: any, index: number) => ({
          id: `stop-${index}`,
          order_id: order.id,
          customer_name: order.customer_name,
          address: order.delivery_address || `${order.customer_name}'s Location`,
          phone: order.customer_phone || 'N/A',
          status: order.status === 'out_for_delivery' ? 'in_progress' : 'pending',
          estimated_time: `${10 + index * 5} min`,
          order_total: order.total_amount,
          delivery_fee: order.total_amount * 0.15,
          special_instructions: order.notes,
          lat: 32.0853 + Math.random() * 0.1,
          lng: 34.7818 + Math.random() * 0.1,
        }));

        setRoutes(stops);
        if (stops.length > 0) {
          setSelectedStop(stops[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load routes:', error);
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  };

  const handleMarkComplete = (stopId: string) => {
    setRoutes((prev) =>
      prev.map((stop) =>
        stop.id === stopId ? { ...stop, status: 'completed' as const } : stop
      )
    );
  };

  const handleStartDelivery = (stopId: string) => {
    setRoutes((prev) =>
      prev.map((stop) =>
        stop.id === stopId ? { ...stop, status: 'in_progress' as const } : stop
      )
    );
  };

  const mapMarkers = routes.map((stop) => ({
    id: stop.id,
    lat: stop.lat || 32.0853,
    lng: stop.lng || 34.7818,
    label: stop.customer_name.charAt(0),
    color:
      stop.status === 'completed'
        ? '#10b981'
        : stop.status === 'in_progress'
        ? '#3b82f6'
        : '#f59e0b',
    onClick: () => setSelectedStop(stop),
  }));

  const sidebarContent = (
    <Box style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Box style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
        <Typography variant="body" weight="bold" style={{ marginBottom: '8px' }}>
          Today's Route
        </Typography>
        <Box style={{ display: 'flex', gap: '16px' }}>
          <Box>
            <Typography variant="caption" color="secondary">
              Total Stops
            </Typography>
            <Typography variant="h3">{routes.length}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="secondary">
              Completed
            </Typography>
            <Typography variant="h3">
              {routes.filter((r) => r.status === 'completed').length}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="secondary">
              Remaining
            </Typography>
            <Typography variant="h3">
              {routes.filter((r) => r.status !== 'completed').length}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Typography variant="body" weight="semibold">
        Delivery Stops ({routes.length})
      </Typography>

      {routes.map((stop, index) => (
        <Box
          key={stop.id}
          onClick={() => setSelectedStop(stop)}
          style={{
            padding: '12px',
            border: selectedStop?.id === stop.id ? '2px solid #3b82f6' : '1px solid #e5e7eb',
            borderRadius: '8px',
            cursor: 'pointer',
            backgroundColor: selectedStop?.id === stop.id ? '#f0f9ff' : 'white',
          }}
        >
          <Box style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <Box
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor:
                  stop.status === 'completed'
                    ? '#10b981'
                    : stop.status === 'in_progress'
                    ? '#3b82f6'
                    : '#f59e0b',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                flexShrink: 0,
              }}
            >
              {index + 1}
            </Box>
            <Box style={{ flex: 1 }}>
              <Box style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <Typography variant="body" weight="semibold">
                  {stop.customer_name}
                </Typography>
                <Badge
                  variant={
                    stop.status === 'completed'
                      ? 'success'
                      : stop.status === 'in_progress'
                      ? 'primary'
                      : 'warning'
                  }
                  size="small"
                >
                  {stop.status === 'in_progress' ? 'Active' : stop.status}
                </Badge>
              </Box>
              <Typography variant="small" color="secondary" style={{ marginBottom: '4px' }}>
                {stop.address}
              </Typography>
              <Typography variant="caption" color="secondary">
                ETA: {stop.estimated_time} • ₪{stop.delivery_fee.toFixed(2)}
              </Typography>
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );

  const detailsPanel = selectedStop ? (
    <Box style={{ padding: '20px' }}>
      <Box style={{ marginBottom: '20px' }}>
        <Typography variant="h3" style={{ marginBottom: '8px' }}>
          {selectedStop.customer_name}
        </Typography>
        <Badge
          variant={
            selectedStop.status === 'completed'
              ? 'success'
              : selectedStop.status === 'in_progress'
              ? 'primary'
              : 'warning'
          }
        >
          {selectedStop.status === 'in_progress' ? 'In Progress' : selectedStop.status}
        </Badge>
      </Box>

      <Box style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <Box>
          <Typography variant="small" color="secondary" style={{ marginBottom: '4px' }}>
            Delivery Address
          </Typography>
          <Typography variant="body">{selectedStop.address}</Typography>
        </Box>
        <Box>
          <Typography variant="small" color="secondary" style={{ marginBottom: '4px' }}>
            Phone Number
          </Typography>
          <Typography variant="body">{selectedStop.phone}</Typography>
        </Box>
        <Box>
          <Typography variant="small" color="secondary" style={{ marginBottom: '4px' }}>
            Order Total
          </Typography>
          <Typography variant="body">₪{selectedStop.order_total.toFixed(2)}</Typography>
        </Box>
        <Box>
          <Typography variant="small" color="secondary" style={{ marginBottom: '4px' }}>
            Your Earnings
          </Typography>
          <Typography variant="body" weight="bold" style={{ color: '#10b981' }}>
            ₪{selectedStop.delivery_fee.toFixed(2)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="small" color="secondary" style={{ marginBottom: '4px' }}>
            Estimated Time
          </Typography>
          <Typography variant="body">{selectedStop.estimated_time}</Typography>
        </Box>
        {selectedStop.special_instructions && (
          <Box
            style={{
              padding: '12px',
              backgroundColor: '#fef3c7',
              borderRadius: '6px',
              borderLeft: '4px solid #f59e0b',
            }}
          >
            <Typography variant="small" weight="semibold" style={{ marginBottom: '4px' }}>
              Special Instructions
            </Typography>
            <Typography variant="small">{selectedStop.special_instructions}</Typography>
          </Box>
        )}
      </Box>

      <Box style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {selectedStop.status === 'pending' && (
          <Button
            variant="primary"
            fullWidth
            onClick={() => handleStartDelivery(selectedStop.id)}
          >
            Start Delivery
          </Button>
        )}
        {selectedStop.status === 'in_progress' && (
          <>
            <Button
              variant="primary"
              fullWidth
              onClick={() => handleMarkComplete(selectedStop.id)}
            >
              Mark as Delivered
            </Button>
            <Button variant="secondary" fullWidth>
              Call Customer
            </Button>
          </>
        )}
        {selectedStop.status === 'completed' && (
          <Box
            style={{
              padding: '12px',
              backgroundColor: '#f0fdf4',
              borderRadius: '6px',
              textAlign: 'center',
            }}
          >
            <Typography variant="body" weight="semibold" style={{ color: '#10b981' }}>
              ✅ Completed
            </Typography>
          </Box>
        )}
        <Button variant="secondary" fullWidth>
          Get Directions
        </Button>
      </Box>
    </Box>
  ) : null;

  const stats = [
    {
      label: 'Total Distance',
      value: '24.5 km',
      icon: '📍',
    },
    {
      label: 'Est. Time',
      value: '1h 45m',
      icon: '⏱️',
    },
    {
      label: 'Total Earnings',
      value: `₪${routes.reduce((sum, r) => sum + r.delivery_fee, 0).toFixed(2)}`,
      icon: '💰',
    },
  ];

  return (
    <MapTemplate
      title="Delivery Routes"
      subtitle="Your optimized delivery route for today"
      markers={mapMarkers}
      center={{ lat: 32.0853, lng: 34.7818 }}
      zoom={13}
      sidebar={sidebarContent}
      detailsPanel={detailsPanel}
      stats={stats}
      loading={loading}
      actions={
        <Box style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" size="small" onClick={loadRoutes}>
            Refresh
          </Button>
          <Button variant="primary" size="small">
            Optimize Route
          </Button>
        </Box>
      }
    />
  );
}
