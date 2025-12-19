import { logger } from '../lib/logger';

export type AllocationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface AllocationRequest {
  fromWarehouseId: string;
  toWarehouseId: string;
  toBusinessId: string;
  productId: string;
  requestedQuantity: number;
  priority?: AllocationPriority;
  notes?: string;
}

export interface AllocationResponse {
  success: boolean;
  allocation: Record<string, unknown>;
}

export interface AllocationApprovalRequest {
  allocationId: string;
  action: 'approve' | 'reject';
  approvedQuantity?: number;
  rejectionReason?: string;
  autoFulfill?: boolean;
}

export interface AllocationApprovalResponse {
  success: boolean;
  message: string;
}

export interface DeliverOrderRequest {
  orderId: string;
  proofUrl?: string;
  notes?: string;
  gpsLocation?: { lat: number; lng: number };
}

export interface DeliverOrderResponse {
  success: boolean;
  order_id: string;
  status: string;
  delivered_at: string;
  inventory_updates: Array<Record<string, unknown>>;
}

export async function requestAllocation(payload: AllocationRequest): Promise<AllocationResponse> {
  logger.warn('[FRONTEND-ONLY] requestAllocation called - edge functions not available');

  throw new Error('Edge functions not available in frontend-only mode: allocate-stock');
}

export async function approveAllocation(
  payload: AllocationApprovalRequest
): Promise<AllocationApprovalResponse> {
  logger.warn('[FRONTEND-ONLY] approveAllocation called - edge functions not available');

  throw new Error('Edge functions not available in frontend-only mode: approve-allocation');
}

export async function rejectAllocation(
  allocationId: string,
  options: { reason?: string } = {}
): Promise<AllocationApprovalResponse> {
  return approveAllocation({
    allocationId,
    action: 'reject',
    rejectionReason: options.reason,
  });
}

export async function fulfillAllocation(payload: {
  allocationId: string;
  approvedQuantity: number;
  notes?: string;
}): Promise<AllocationApprovalResponse> {
  return approveAllocation({
    allocationId: payload.allocationId,
    action: 'approve',
    approvedQuantity: payload.approvedQuantity,
    autoFulfill: true,
  });
}

export async function deliverOrder(payload: DeliverOrderRequest): Promise<DeliverOrderResponse> {
  logger.warn('[FRONTEND-ONLY] deliverOrder called - edge functions not available');

  throw new Error('Edge functions not available in frontend-only mode: deliver-order');
}
