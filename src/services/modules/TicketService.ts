import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { BaseService } from '../base/BaseService';

export interface Ticket {
  id: string;
  business_id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assigned_to: string | null;
  assigned_by: string;
  customer_id?: string | null;
  order_id?: string | null;
  due_date?: string | null;
  notes?: string | null;
  replies?: TicketReply[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  assigned_user?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  customer?: {
    id: string;
    name: string;
  };
}

export interface TicketReply {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

export interface TicketStats {
  open: number;
  in_progress: number;
  completed_today: number;
  avg_response_time_hours: number;
  urgent: number;
}

export interface CreateTicketData {
  business_id: string;
  title: string;
  description: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  customer_id?: string;
  order_id?: string;
  assigned_to?: string;
}

export interface UpdateTicketData {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  assigned_to?: string;
  notes?: string;
  due_date?: string;
}

export class TicketService extends BaseService {
  protected serviceName = 'TicketService';

  async listTickets(businessId: string, filters?: {
    status?: string;
    priority?: string;
    assigned_to?: string;
    search?: string;
  }): Promise<Ticket[]> {
    try {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assigned_user:profiles!tasks_assigned_to_fkey(id, name, avatar_url),
          customer:profiles!tasks_customer_id_fkey(id, name)
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }

      if (filters?.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        logger.error(`[${this.serviceName}] Failed to list tickets:`, error);
        throw error;
      }

      return (data || []).map(this.mapTaskToTicket);
    } catch (error) {
      logger.error(`[${this.serviceName}] Error listing tickets:`, error);
      throw error;
    }
  }

  async getTicket(ticketId: string): Promise<Ticket | null> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_user:profiles!tasks_assigned_to_fkey(id, name, avatar_url),
          customer:profiles!tasks_customer_id_fkey(id, name)
        `)
        .eq('id', ticketId)
        .maybeSingle();

      if (error) {
        logger.error(`[${this.serviceName}] Failed to get ticket:`, error);
        throw error;
      }

      return data ? this.mapTaskToTicket(data) : null;
    } catch (error) {
      logger.error(`[${this.serviceName}] Error getting ticket:`, error);
      throw error;
    }
  }

  async createTicket(data: CreateTicketData, userId: string): Promise<Ticket> {
    try {
      const { data: ticket, error } = await supabase
        .from('tasks')
        .insert({
          business_id: data.business_id,
          title: data.title,
          description: data.description,
          priority: data.priority || 'normal',
          status: 'pending',
          assigned_to: data.assigned_to || null,
          assigned_by: userId,
          customer_id: data.customer_id || null,
          order_id: data.order_id || null,
          replies: [],
          metadata: {}
        })
        .select(`
          *,
          assigned_user:profiles!tasks_assigned_to_fkey(id, name, avatar_url),
          customer:profiles!tasks_customer_id_fkey(id, name)
        `)
        .single();

      if (error) {
        logger.error(`[${this.serviceName}] Failed to create ticket:`, error);
        throw error;
      }

      logger.info(`[${this.serviceName}] Ticket created:`, { ticketId: ticket.id });
      return this.mapTaskToTicket(ticket);
    } catch (error) {
      logger.error(`[${this.serviceName}] Error creating ticket:`, error);
      throw error;
    }
  }

  async updateTicket(ticketId: string, updates: UpdateTicketData): Promise<Ticket> {
    try {
      const { data: ticket, error } = await supabase
        .from('tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)
        .select(`
          *,
          assigned_user:profiles!tasks_assigned_to_fkey(id, name, avatar_url),
          customer:profiles!tasks_customer_id_fkey(id, name)
        `)
        .single();

      if (error) {
        logger.error(`[${this.serviceName}] Failed to update ticket:`, error);
        throw error;
      }

      logger.info(`[${this.serviceName}] Ticket updated:`, { ticketId });
      return this.mapTaskToTicket(ticket);
    } catch (error) {
      logger.error(`[${this.serviceName}] Error updating ticket:`, error);
      throw error;
    }
  }

  async addReply(
    ticketId: string,
    content: string,
    userId: string,
    userName: string,
    isInternal: boolean = false
  ): Promise<Ticket> {
    try {
      const ticket = await this.getTicket(ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      const newReply: TicketReply = {
        id: crypto.randomUUID(),
        user_id: userId,
        user_name: userName,
        content,
        is_internal: isInternal,
        created_at: new Date().toISOString()
      };

      const updatedReplies = [...(ticket.replies || []), newReply];

      const { data: updatedTicket, error } = await supabase
        .from('tasks')
        .update({
          replies: updatedReplies,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)
        .select(`
          *,
          assigned_user:profiles!tasks_assigned_to_fkey(id, name, avatar_url),
          customer:profiles!tasks_customer_id_fkey(id, name)
        `)
        .single();

      if (error) {
        logger.error(`[${this.serviceName}] Failed to add reply:`, error);
        throw error;
      }

      logger.info(`[${this.serviceName}] Reply added to ticket:`, { ticketId });
      return this.mapTaskToTicket(updatedTicket);
    } catch (error) {
      logger.error(`[${this.serviceName}] Error adding reply:`, error);
      throw error;
    }
  }

  async assignTicket(ticketId: string, assignedTo: string): Promise<Ticket> {
    return this.updateTicket(ticketId, {
      assigned_to: assignedTo,
      status: 'in_progress'
    });
  }

  async completeTicket(ticketId: string, notes?: string): Promise<Ticket> {
    return this.updateTicket(ticketId, {
      status: 'completed',
      notes
    });
  }

  async getTicketStats(businessId: string): Promise<TicketStats> {
    try {
      const { data: tickets, error } = await supabase
        .from('tasks')
        .select('status, priority, created_at, updated_at')
        .eq('business_id', businessId);

      if (error) {
        logger.error(`[${this.serviceName}] Failed to get ticket stats:`, error);
        throw error;
      }

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const stats: TicketStats = {
        open: tickets?.filter(t => t.status === 'pending').length || 0,
        in_progress: tickets?.filter(t => t.status === 'in_progress').length || 0,
        completed_today: tickets?.filter(t => {
          const completedAt = new Date(t.updated_at);
          return t.status === 'completed' && completedAt >= todayStart;
        }).length || 0,
        avg_response_time_hours: 0,
        urgent: tickets?.filter(t => t.priority === 'urgent' && t.status !== 'completed').length || 0
      };

      // Calculate average response time for completed tickets
      const completedTickets = tickets?.filter(t => t.status === 'completed') || [];
      if (completedTickets.length > 0) {
        const totalHours = completedTickets.reduce((sum, ticket) => {
          const created = new Date(ticket.created_at);
          const updated = new Date(ticket.updated_at);
          const hours = (updated.getTime() - created.getTime()) / (1000 * 60 * 60);
          return sum + hours;
        }, 0);
        stats.avg_response_time_hours = Math.round(totalHours / completedTickets.length);
      }

      return stats;
    } catch (error) {
      logger.error(`[${this.serviceName}] Error getting ticket stats:`, error);
      throw error;
    }
  }

  async subscribeToTickets(
    businessId: string,
    callback: (ticket: Ticket) => void
  ): Promise<() => void> {
    const channel = supabase
      .channel(`tickets:${businessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `business_id=eq.${businessId}`
        },
        async (payload) => {
          logger.info(`[${this.serviceName}] Ticket change detected:`, payload);
          if (payload.new) {
            const ticket = await this.getTicket((payload.new as any).id);
            if (ticket) {
              callback(ticket);
            }
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }

  private mapTaskToTicket(task: any): Ticket {
    return {
      id: task.id,
      business_id: task.business_id,
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      assigned_to: task.assigned_to,
      assigned_by: task.assigned_by,
      customer_id: task.customer_id,
      order_id: task.order_id,
      due_date: task.due_date,
      notes: task.notes,
      replies: task.replies || [],
      metadata: task.metadata || {},
      created_at: task.created_at,
      updated_at: task.updated_at,
      assigned_user: task.assigned_user,
      customer: task.customer
    };
  }
}

export const ticketService = new TicketService();
