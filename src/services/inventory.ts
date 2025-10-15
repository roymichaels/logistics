import { ensureSession, callEdgeFunction } from './serviceHelpers';

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
  const { supabase } = await ensureSession();

  const response = await callEdgeFunction<AllocationResponse>(supabase, 'allocate-stock', {
    from_warehouse_id: payload.fromWarehouseId,
    to_warehouse_id: payload.toWarehouseId,
    to_business_id: payload.toBusinessId,
    product_id: payload.productId,
    requested_quantity: payload.requestedQuantity,
    priority: payload.priority,
    notes: payload.notes,
  });

  return response;
}

export async function approveAllocation(
  payload: AllocationApprovalRequest
): Promise<AllocationApprovalResponse> {
  const { supabase } = await ensureSession();

  const response = await callEdgeFunction<AllocationApprovalResponse>(supabase, 'approve-allocation', {
    allocation_id: payload.allocationId,
    action: payload.action,
    approved_quantity: payload.approvedQuantity,
    rejection_reason: payload.rejectionReason,
    auto_fulfill: payload.autoFulfill,
  });

  return response;
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
  const { supabase } = await ensureSession();

  const response = await callEdgeFunction<DeliverOrderResponse>(supabase, 'deliver-order', {
    order_id: payload.orderId,
    proof_url: payload.proofUrl,
    notes: payload.notes,
    gps_location: payload.gpsLocation,
  });

  return response;
}
