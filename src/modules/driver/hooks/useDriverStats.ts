import { useState, useEffect } from 'react';
import { logger } from '../../../lib/logger';
import {
  Driver,
  DriverStats,
  DriverEarningsSummary,
  DriverPerformance,
  DriverEfficiency
} from '../types';

export interface UseDriverStatsResult {
  stats: DriverStats | null;
  earnings: DriverEarningsSummary | null;
  performance: DriverPerformance | null;
  efficiency: DriverEfficiency | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useDriverStats(driverId?: string): UseDriverStatsResult {
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [earnings, setEarnings] = useState<DriverEarningsSummary | null>(null);
  const [performance, setPerformance] = useState<DriverPerformance | null>(null);
  const [efficiency, setEfficiency] = useState<DriverEfficiency | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = async () => {
    if (!driverId) {
      setStats(null);
      setEarnings(null);
      setPerformance(null);
      setEfficiency(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const drivers: Driver[] = JSON.parse(localStorage.getItem('drivers') || '[]');
      const driver = drivers.find(d => d.id === driverId);

      if (!driver) {
        throw new Error('Driver not found');
      }

      const statsData: DriverStats = {
        total_deliveries: driver.total_deliveries || 0,
        successful_deliveries: driver.total_deliveries || 0,
        rating: driver.rating || 5.0,
        success_rate: 100,
        active_orders: 0,
        completed_today: 0,
        revenue_today: 0
      };

      const earningsData: DriverEarningsSummary = {
        totalEarnings: 0,
        baseEarnings: 0,
        tips: 0,
        bonuses: 0,
        deliveryCount: 0,
        avgEarningsPerDelivery: 0
      };

      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const periodEnd = now.toISOString();

      const performanceData: DriverPerformance = {
        driver_id: driverId,
        period_start: periodStart,
        period_end: periodEnd,
        total_deliveries: driver.total_deliveries || 0,
        completed_deliveries: driver.total_deliveries || 0,
        cancelled_deliveries: 0,
        average_rating: driver.rating || 5.0,
        total_earnings: 0,
        average_delivery_time: 35,
        on_time_delivery_rate: 100,
        customer_satisfaction: driver.rating || 5.0,
        completion_rate: 100
      };

      const efficiencyData: DriverEfficiency = {
        deliveriesPerHour: 0,
        utilizationRate: 0,
        avgDistancePerDelivery: 5.5,
        fuelEfficiencyScore: 8.5
      };

      setStats(statsData);
      setEarnings(earningsData);
      setPerformance(performanceData);
      setEfficiency(efficiencyData);

      logger.info('Driver stats fetched:', driverId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch driver stats');
      setError(error);
      logger.error('Failed to fetch driver stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [driverId]);

  return {
    stats,
    earnings,
    performance,
    efficiency,
    isLoading,
    error,
    refetch: fetchStats
  };
}
