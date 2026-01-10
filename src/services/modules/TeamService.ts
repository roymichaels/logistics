import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { BaseService } from '../base/BaseService';
import type { UserRole } from '../../shells/types';

export interface TeamMember {
  id: string;
  user_id: string;
  business_id: string;
  role: UserRole;
  email?: string;
  name?: string;
  avatar_url?: string;
  invited_at: string;
  joined_at?: string;
  status: 'pending' | 'active' | 'suspended';
  permissions?: string[];
  last_active?: string;
}

export interface TeamInvitation {
  id: string;
  business_id: string;
  email: string;
  role: UserRole;
  invited_by: string;
  invited_at: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  token: string;
}

export interface CreateInvitationInput {
  email: string;
  role: UserRole;
  permissions?: string[];
  expiresInDays?: number;
}

export interface UpdateMemberInput {
  role?: UserRole;
  permissions?: string[];
  status?: 'active' | 'suspended';
}

export interface TeamStats {
  totalMembers: number;
  activeMembers: number;
  pendingInvitations: number;
  byRole: Record<UserRole, number>;
}

export class TeamService extends BaseService {
  /**
   * Get all team members for a business
   */
  async getTeamMembers(businessId: string): Promise<TeamMember[]> {
    try {
      const { data, error } = await supabase
        .from('user_business_roles')
        .select(`
          id,
          user_id,
          business_id,
          role,
          created_at,
          profiles!inner(email, name, avatar_url)
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('[TeamService] Error fetching team members:', error);
        throw error;
      }

      return (data || []).map(member => ({
        id: member.id,
        user_id: member.user_id,
        business_id: member.business_id,
        role: member.role as UserRole,
        email: (member as any).profiles?.email,
        name: (member as any).profiles?.name,
        avatar_url: (member as any).profiles?.avatar_url,
        invited_at: member.created_at,
        status: 'active' as const
      }));
    } catch (error) {
      logger.error('[TeamService] Failed to get team members:', error);
      throw error;
    }
  }

  /**
   * Get team statistics
   */
  async getTeamStats(businessId: string): Promise<TeamStats> {
    try {
      const members = await this.getTeamMembers(businessId);

      const byRole: Record<string, number> = {};
      members.forEach(member => {
        byRole[member.role] = (byRole[member.role] || 0) + 1;
      });

      const { data: invitations } = await supabase
        .from('team_invitations')
        .select('status')
        .eq('business_id', businessId)
        .eq('status', 'pending');

      return {
        totalMembers: members.length,
        activeMembers: members.filter(m => m.status === 'active').length,
        pendingInvitations: invitations?.length || 0,
        byRole: byRole as Record<UserRole, number>
      };
    } catch (error) {
      logger.error('[TeamService] Failed to get team stats:', error);
      throw error;
    }
  }

  /**
   * Invite a new team member
   */
  async inviteTeamMember(
    businessId: string,
    invitedBy: string,
    input: CreateInvitationInput
  ): Promise<TeamInvitation> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (input.expiresInDays || 7));

      const token = this.generateInvitationToken();

      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', input.email)
        .maybeSingle();

      if (existing) {
        const { data: existingMember } = await supabase
          .from('user_business_roles')
          .select('id')
          .eq('business_id', businessId)
          .eq('user_id', existing.id)
          .maybeSingle();

        if (existingMember) {
          throw new Error('User is already a member of this business');
        }
      }

      const { data, error } = await supabase
        .from('team_invitations')
        .insert({
          business_id: businessId,
          email: input.email,
          role: input.role,
          invited_by: invitedBy,
          expires_at: expiresAt.toISOString(),
          token,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        logger.error('[TeamService] Error creating invitation:', error);
        throw error;
      }

      logger.info('[TeamService] Team invitation created:', {
        email: input.email,
        role: input.role
      });

      return data;
    } catch (error) {
      logger.error('[TeamService] Failed to invite team member:', error);
      throw error;
    }
  }

  /**
   * Accept a team invitation
   */
  async acceptInvitation(token: string, userId: string): Promise<TeamMember> {
    try {
      const { data: invitation, error: inviteError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (inviteError || !invitation) {
        throw new Error('Invalid or expired invitation');
      }

      if (new Date(invitation.expires_at) < new Date()) {
        await supabase
          .from('team_invitations')
          .update({ status: 'expired' })
          .eq('id', invitation.id);
        throw new Error('Invitation has expired');
      }

      const { data: member, error: memberError } = await supabase
        .from('user_business_roles')
        .insert({
          user_id: userId,
          business_id: invitation.business_id,
          role: invitation.role
        })
        .select()
        .single();

      if (memberError) {
        logger.error('[TeamService] Error adding team member:', memberError);
        throw memberError;
      }

      await supabase
        .from('team_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id);

      logger.info('[TeamService] Invitation accepted:', {
        userId,
        businessId: invitation.business_id,
        role: invitation.role
      });

      return {
        ...member,
        invited_at: invitation.invited_at,
        status: 'active'
      };
    } catch (error) {
      logger.error('[TeamService] Failed to accept invitation:', error);
      throw error;
    }
  }

  /**
   * Update team member role and permissions
   */
  async updateTeamMember(
    businessId: string,
    memberId: string,
    updates: UpdateMemberInput
  ): Promise<TeamMember> {
    try {
      const updateData: any = {};

      if (updates.role) {
        updateData.role = updates.role;
      }

      const { data, error } = await supabase
        .from('user_business_roles')
        .update(updateData)
        .eq('id', memberId)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) {
        logger.error('[TeamService] Error updating team member:', error);
        throw error;
      }

      logger.info('[TeamService] Team member updated:', {
        memberId,
        updates
      });

      const members = await this.getTeamMembers(businessId);
      const updatedMember = members.find(m => m.id === memberId);

      if (!updatedMember) {
        throw new Error('Member not found after update');
      }

      return updatedMember;
    } catch (error) {
      logger.error('[TeamService] Failed to update team member:', error);
      throw error;
    }
  }

  /**
   * Remove a team member
   */
  async removeTeamMember(businessId: string, memberId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_business_roles')
        .delete()
        .eq('id', memberId)
        .eq('business_id', businessId);

      if (error) {
        logger.error('[TeamService] Error removing team member:', error);
        throw error;
      }

      logger.info('[TeamService] Team member removed:', { memberId });
    } catch (error) {
      logger.error('[TeamService] Failed to remove team member:', error);
      throw error;
    }
  }

  /**
   * Cancel a pending invitation
   */
  async cancelInvitation(businessId: string, invitationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('team_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId)
        .eq('business_id', businessId);

      if (error) {
        logger.error('[TeamService] Error cancelling invitation:', error);
        throw error;
      }

      logger.info('[TeamService] Invitation cancelled:', { invitationId });
    } catch (error) {
      logger.error('[TeamService] Failed to cancel invitation:', error);
      throw error;
    }
  }

  /**
   * Get pending invitations
   */
  async getPendingInvitations(businessId: string): Promise<TeamInvitation[]> {
    try {
      const { data, error } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('business_id', businessId)
        .eq('status', 'pending')
        .order('invited_at', { ascending: false });

      if (error) {
        logger.error('[TeamService] Error fetching invitations:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('[TeamService] Failed to get pending invitations:', error);
      throw error;
    }
  }

  /**
   * Generate a secure invitation token
   */
  private generateInvitationToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Check if user can manage team (owner or manager)
   */
  async canManageTeam(businessId: string, userId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('user_business_roles')
        .select('role')
        .eq('business_id', businessId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!data) {
        const { data: business } = await supabase
          .from('businesses')
          .select('owner_id')
          .eq('id', businessId)
          .single();

        return business?.owner_id === userId;
      }

      return ['business_owner', 'manager'].includes(data.role);
    } catch (error) {
      logger.error('[TeamService] Failed to check team management permission:', error);
      return false;
    }
  }
}
