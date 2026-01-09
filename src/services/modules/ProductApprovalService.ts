/**
 * Product Approval Workflow Service
 *
 * Handles product change requests, approvals, and workflow management.
 * Supports create/edit/delete/price/publish approval workflows.
 */

import { supabase } from '@/lib/supabase';
import { hasPermission } from '@/lib/rolePermissions';

export interface ProductChangeRequest {
  id: string;
  business_id: string;
  product_id?: string;
  change_type: 'create' | 'edit' | 'delete' | 'price' | 'publish' | 'bulk';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  description?: string;
  reason?: string;
  before_data?: any;
  after_data: any;
  affected_product_ids?: string[];
  requested_by: string;
  requested_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface ApprovalStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

export class ProductApprovalService {
  private userId: string;
  private userRole: string;
  private businessId: string;

  constructor(userId: string, userRole: string, businessId: string) {
    this.userId = userId;
    this.userRole = userRole;
    this.businessId = businessId;
  }

  /**
   * Check if user has permission
   */
  private canApprove(): boolean {
    return hasPermission(this.userRole, 'catalog:approve_changes');
  }

  private canRequestChanges(): boolean {
    return hasPermission(this.userRole, 'catalog:request_changes');
  }

  /**
   * Create a change request
   */
  async createChangeRequest(
    changeType: 'create' | 'edit' | 'delete' | 'price' | 'publish' | 'bulk',
    data: {
      productId?: string;
      title: string;
      description?: string;
      reason?: string;
      beforeData?: any;
      afterData: any;
      affectedProductIds?: string[];
      priority?: 'low' | 'normal' | 'high' | 'urgent';
    }
  ): Promise<ProductChangeRequest> {
    // Check if user needs approval or can make changes directly
    const needsApproval = this.requiresApproval(changeType);

    if (!needsApproval) {
      // User can make changes directly, no approval needed
      throw new Error('You can make this change directly without approval');
    }

    if (!this.canRequestChanges()) {
      throw new Error('You do not have permission to request changes');
    }

    const request = {
      business_id: this.businessId,
      product_id: data.productId,
      change_type: changeType,
      status: 'pending' as const,
      priority: data.priority || 'normal',
      title: data.title,
      description: data.description,
      reason: data.reason,
      before_data: data.beforeData,
      after_data: data.afterData,
      affected_product_ids: data.affectedProductIds,
      requested_by: this.userId,
      requested_at: new Date().toISOString(),
    };

    const { data: createdRequest, error } = await supabase
      .from('product_change_requests')
      .insert(request)
      .select()
      .single();

    if (error) throw error;

    return createdRequest;
  }

  /**
   * Determine if a change requires approval
   */
  private requiresApproval(changeType: string): boolean {
    // Business owners and managers typically don't need approval
    if (['business_owner', 'admin', 'superadmin', 'manager'].includes(this.userRole)) {
      return false;
    }

    // All other roles need approval for catalog changes
    return true;
  }

  /**
   * Get all change requests
   */
  async getChangeRequests(filters?: {
    status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
    changeType?: string;
    requestedBy?: string;
  }): Promise<ProductChangeRequest[]> {
    let query = supabase
      .from('product_change_requests')
      .select('*')
      .eq('business_id', this.businessId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.changeType) {
      query = query.eq('change_type', filters.changeType);
    }

    if (filters?.requestedBy) {
      query = query.eq('requested_by', filters.requestedBy);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Get a single change request
   */
  async getChangeRequest(requestId: string): Promise<ProductChangeRequest | null> {
    const { data, error } = await supabase
      .from('product_change_requests')
      .select('*')
      .eq('id', requestId)
      .eq('business_id', this.businessId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Approve a change request
   */
  async approveRequest(requestId: string, comment?: string): Promise<void> {
    if (!this.canApprove()) {
      throw new Error('You do not have permission to approve changes');
    }

    // Get the request
    const request = await this.getChangeRequest(requestId);
    if (!request) {
      throw new Error('Change request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Only pending requests can be approved');
    }

    // Update request status
    const { error: updateError } = await supabase
      .from('product_change_requests')
      .update({
        status: 'approved',
        reviewed_by: this.userId,
        reviewed_at: new Date().toISOString(),
        metadata: {
          ...request.metadata,
          approval_comment: comment,
        },
      })
      .eq('id', requestId);

    if (updateError) throw updateError;

    // Apply the change
    await this.applyChange(request);
  }

  /**
   * Reject a change request
   */
  async rejectRequest(requestId: string, reason: string): Promise<void> {
    if (!this.canApprove()) {
      throw new Error('You do not have permission to reject changes');
    }

    const request = await this.getChangeRequest(requestId);
    if (!request) {
      throw new Error('Change request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Only pending requests can be rejected');
    }

    const { error } = await supabase
      .from('product_change_requests')
      .update({
        status: 'rejected',
        reviewed_by: this.userId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq('id', requestId);

    if (error) throw error;
  }

  /**
   * Cancel a change request (by requester)
   */
  async cancelRequest(requestId: string): Promise<void> {
    const request = await this.getChangeRequest(requestId);
    if (!request) {
      throw new Error('Change request not found');
    }

    if (request.requested_by !== this.userId && !this.canApprove()) {
      throw new Error('You can only cancel your own requests');
    }

    if (request.status !== 'pending') {
      throw new Error('Only pending requests can be cancelled');
    }

    const { error } = await supabase
      .from('product_change_requests')
      .update({
        status: 'cancelled',
      })
      .eq('id', requestId);

    if (error) throw error;
  }

  /**
   * Apply an approved change
   */
  private async applyChange(request: ProductChangeRequest): Promise<void> {
    switch (request.change_type) {
      case 'create':
        await this.applyCreateChange(request);
        break;
      case 'edit':
        await this.applyEditChange(request);
        break;
      case 'delete':
        await this.applyDeleteChange(request);
        break;
      case 'price':
        await this.applyPriceChange(request);
        break;
      case 'publish':
        await this.applyPublishChange(request);
        break;
      case 'bulk':
        await this.applyBulkChange(request);
        break;
    }
  }

  private async applyCreateChange(request: ProductChangeRequest): Promise<void> {
    const { error } = await supabase
      .from('products')
      .insert({
        ...request.after_data,
        business_id: this.businessId,
      });

    if (error) throw error;
  }

  private async applyEditChange(request: ProductChangeRequest): Promise<void> {
    if (!request.product_id) {
      throw new Error('Product ID is required for edit changes');
    }

    const { error } = await supabase
      .from('products')
      .update(request.after_data)
      .eq('id', request.product_id)
      .eq('business_id', this.businessId);

    if (error) throw error;
  }

  private async applyDeleteChange(request: ProductChangeRequest): Promise<void> {
    if (!request.product_id) {
      throw new Error('Product ID is required for delete changes');
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', request.product_id)
      .eq('business_id', this.businessId);

    if (error) throw error;
  }

  private async applyPriceChange(request: ProductChangeRequest): Promise<void> {
    if (!request.product_id) {
      throw new Error('Product ID is required for price changes');
    }

    const { error } = await supabase
      .from('products')
      .update({
        price: request.after_data.price,
        cost: request.after_data.cost,
        compare_at_price: request.after_data.compare_at_price,
      })
      .eq('id', request.product_id)
      .eq('business_id', this.businessId);

    if (error) throw error;
  }

  private async applyPublishChange(request: ProductChangeRequest): Promise<void> {
    if (!request.product_id) {
      throw new Error('Product ID is required for publish changes');
    }

    const { error } = await supabase
      .from('products')
      .update({
        metadata: { is_visible: request.after_data.is_visible },
      })
      .eq('id', request.product_id)
      .eq('business_id', this.businessId);

    if (error) throw error;
  }

  private async applyBulkChange(request: ProductChangeRequest): Promise<void> {
    if (!request.affected_product_ids || request.affected_product_ids.length === 0) {
      throw new Error('Product IDs are required for bulk changes');
    }

    const { error } = await supabase
      .from('products')
      .update(request.after_data)
      .in('id', request.affected_product_ids)
      .eq('business_id', this.businessId);

    if (error) throw error;
  }

  /**
   * Get approval statistics
   */
  async getApprovalStats(): Promise<ApprovalStats> {
    const { data: requests } = await supabase
      .from('product_change_requests')
      .select('status')
      .eq('business_id', this.businessId);

    if (!requests) {
      return {
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0,
      };
    }

    return {
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      total: requests.length,
    };
  }

  /**
   * Get my pending requests
   */
  async getMyPendingRequests(): Promise<ProductChangeRequest[]> {
    const { data, error } = await supabase
      .from('product_change_requests')
      .select('*')
      .eq('business_id', this.businessId)
      .eq('requested_by', this.userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}
