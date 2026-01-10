import React, { useState, useEffect, useCallback } from 'react';
import { DataStore, Task, User } from '../data/types';
import { undergroundTheme } from '../styles/undergroundTheme';
import { hebrew, useI18n } from '../lib/i18n';
import { logger } from '../lib/logger';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';

interface TasksProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Tasks({ dataStore, onNavigate }: TasksProps) {
  const { t } = useI18n();
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [operationLoading, setOperationLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (!dataStore?.getProfile) {
        setLoading(false);
        return;
      }

      const profile = await dataStore.getProfile();
      setCurrentUser(profile);

      let tasksList: Task[] = [];

      // Check if user can manage tasks
      const canManage = ['infrastructure_owner', 'business_owner', 'manager', 'dispatcher', 'superadmin', 'admin'].includes(profile.role);

      if (canManage && dataStore?.from) {
        // Load all tasks using Supabase
        const result = await dataStore.from('tasks').select('*').order('created_at', { ascending: false });
        if (result.success && result.data) {
          tasksList = result.data;
        }
      } else if (dataStore?.listMyTasks) {
        // Load only user's assigned tasks
        tasksList = await dataStore.listMyTasks();
      }

      setTasks(tasksList);

      // Load profiles (not users table) for assignment dropdown
      if (canManage && dataStore?.from) {
        const profilesResult = await dataStore.from('profiles').select('id, username, full_name, role, avatar_url').order('username');
        if (profilesResult.success && profilesResult.data) {
          setProfiles(profilesResult.data as User[]);
        }
      }
    } catch (error) {
      logger.error('Failed to load tasks:', error);
      toast.error('Failed to load tasks', 'Please try again');
    } finally {
      setLoading(false);
    }
  }, [dataStore, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time subscription
  useEffect(() => {
    if (!supabase || !currentUser) return;

    const channel = supabase
      .channel('tasks-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          logger.info('Task change detected:', payload);
          loadData(); // Reload tasks when changes occur
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, loadData]);

  const handleCreateTask = async (taskData: Partial<Task>) => {
    setOperationLoading('create');
    try {
      if (!dataStore.createTask) {
        toast.error('Task creation not available');
        return;
      }

      // Validate required fields
      if (!taskData.title || !taskData.title.trim()) {
        toast.error('Task title is required');
        return;
      }

      const result = await dataStore.createTask(taskData as any);

      toast.success('Task created successfully!');
      setShowCreateModal(false);
      await loadData();
    } catch (error) {
      logger.error('Failed to create task:', error);
      toast.error('Failed to create task', 'Please try again');
    } finally {
      setOperationLoading(null);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    setOperationLoading(`update-${taskId}`);
    try {
      if (!dataStore.updateTask) {
        toast.error('Task update not available');
        return;
      }

      await dataStore.updateTask(taskId, updates);

      toast.success('Task updated successfully!');
      setShowEditModal(false);
      setSelectedTask(null);
      await loadData();
    } catch (error) {
      logger.error('Failed to update task:', error);
      toast.error('Failed to update task', 'Please try again');
    } finally {
      setOperationLoading(null);
    }
  };

  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${taskTitle}"?`);
    if (!confirmed) return;

    setOperationLoading(`delete-${taskId}`);
    try {
      if (!dataStore.supabase) {
        toast.error('Database connection not available');
        return;
      }

      const { error } = await dataStore.supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      toast.success('Task deleted successfully!');
      await loadData();
    } catch (error) {
      logger.error('Failed to delete task:', error);
      toast.error('Failed to delete task', 'Please try again');
    } finally {
      setOperationLoading(null);
    }
  };

  const handleQuickStatusChange = async (taskId: string, status: Task['status']) => {
    setOperationLoading(`status-${taskId}`);
    try {
      await handleUpdateTask(taskId, { status });
    } finally {
      setOperationLoading(null);
    }
  };

  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter(t => t.status === filter);

  const canManageTasks = currentUser?.role && ['infrastructure_owner', 'business_owner', 'manager', 'dispatcher', 'superadmin', 'admin'].includes(currentUser.role);

  const statusCounts = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: undergroundTheme.colors.background.deepDark,
        padding: undergroundTheme.spacing['2xl'],
      }}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'pulse 1.5s infinite' }}>📋</div>
          <p style={{ color: undergroundTheme.colors.text.tertiary }}>Loading tasks...</p>
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: undergroundTheme.colors.background.deepDark,
      padding: undergroundTheme.spacing['2xl'],
      paddingBottom: '100px',
    }}>
      <div style={{
        marginBottom: undergroundTheme.spacing['3xl'],
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>📋</div>
        <h1 style={{
          margin: 0,
          fontSize: undergroundTheme.typography.fontSize['4xl'],
          fontWeight: undergroundTheme.typography.fontWeight.bold,
          color: undergroundTheme.colors.text.primary,
          marginBottom: undergroundTheme.spacing.sm,
        }}>Tasks</h1>
        <p style={{
          margin: 0,
          fontSize: undergroundTheme.typography.fontSize.base,
          color: undergroundTheme.colors.text.tertiary,
          fontWeight: undergroundTheme.typography.fontWeight.medium,
        }}>
          Manage and track your tasks
        </p>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        {([
          { key: 'all' as const, label: 'All Tasks', count: statusCounts.all },
          { key: 'pending' as const, label: 'Pending', count: statusCounts.pending },
          { key: 'in_progress' as const, label: 'In Progress', count: statusCounts.in_progress },
          { key: 'completed' as const, label: 'Completed', count: statusCounts.completed }
        ]).map(({ key, label, count }) => (
          <div
            key={key}
            onClick={() => setFilter(key)}
            style={{
              background: filter === key ? undergroundTheme.colors.gradient.accent : undergroundTheme.colors.glassmorphism.light,
              border: `1px solid ${filter === key ? undergroundTheme.colors.accent.primary : undergroundTheme.colors.glassmorphism.border}`,
              borderRadius: undergroundTheme.borderRadius.xl,
              padding: undergroundTheme.spacing['2xl'],
              backdropFilter: 'blur(20px)',
              boxShadow: filter === key ? undergroundTheme.shadows.glow.cyan : undergroundTheme.shadows.md,
              transition: undergroundTheme.transitions.normal,
              cursor: 'pointer',
            }}
          >
            <div style={{
              fontSize: undergroundTheme.typography.fontSize['3xl'],
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: filter === key ? undergroundTheme.colors.text.primary : undergroundTheme.colors.accent.primary,
              marginBottom: undergroundTheme.spacing.xs,
            }}>{count}</div>
            <div style={{
              fontSize: undergroundTheme.typography.fontSize.sm,
              color: filter === key ? undergroundTheme.colors.text.secondary : undergroundTheme.colors.text.tertiary,
              fontWeight: undergroundTheme.typography.fontWeight.medium,
            }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Create Task Button */}
      {canManageTasks && (
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={operationLoading === 'create'}
          style={{
            width: '100%',
            marginBottom: '24px',
            padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing['2xl']}`,
            background: operationLoading === 'create' ? undergroundTheme.colors.glassmorphism.medium : undergroundTheme.colors.gradient.accent,
            border: 'none',
            borderRadius: undergroundTheme.borderRadius.lg,
            color: undergroundTheme.colors.text.primary,
            fontSize: undergroundTheme.typography.fontSize.base,
            fontWeight: undergroundTheme.typography.fontWeight.semibold,
            cursor: operationLoading === 'create' ? 'wait' : 'pointer',
            boxShadow: undergroundTheme.shadows.glow.cyan,
            transition: undergroundTheme.transitions.normal,
          }}
        >
          {operationLoading === 'create' ? '⏳ Creating...' : '+ Create New Task'}
        </button>
      )}

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: `${undergroundTheme.spacing['5xl']} ${undergroundTheme.spacing.xl}`,
          color: undergroundTheme.colors.text.tertiary,
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: undergroundTheme.spacing.lg,
            opacity: 0.5,
          }}>📋</div>
          <div style={{
            fontSize: undergroundTheme.typography.fontSize.lg,
            color: undergroundTheme.colors.text.tertiary,
          }}>
            No tasks to display
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              canManage={canManageTasks}
              isLoading={operationLoading?.includes(task.id) || false}
              onEdit={() => {
                setSelectedTask(task);
                setShowEditModal(true);
              }}
              onDelete={() => handleDeleteTask(task.id, task.title)}
              onStatusChange={(status) => handleQuickStatusChange(task.id, status)}
            />
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <TaskModal
          profiles={profiles}
          currentUserId={currentUser?.id || ''}
          isLoading={operationLoading === 'create'}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTask}
        />
      )}

      {/* Edit Task Modal */}
      {showEditModal && selectedTask && (
        <TaskModal
          task={selectedTask}
          profiles={profiles}
          currentUserId={currentUser?.id || ''}
          isLoading={operationLoading?.includes(selectedTask.id) || false}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTask(null);
          }}
          onSubmit={(updates) => handleUpdateTask(selectedTask.id, updates)}
        />
      )}
    </div>
  );
}

function TaskCard({ task, canManage, isLoading, onEdit, onDelete, onStatusChange }: {
  task: Task;
  canManage: boolean;
  isLoading: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: Task['status']) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const statusColors = {
    pending: { bg: 'rgba(255, 193, 7, 0.2)', border: 'rgba(255, 193, 7, 0.4)', text: '#FFC107' },
    in_progress: { bg: 'rgba(3, 169, 244, 0.2)', border: 'rgba(3, 169, 244, 0.4)', text: '#03A9F4' },
    completed: { bg: 'rgba(76, 175, 80, 0.2)', border: 'rgba(76, 175, 80, 0.4)', text: '#4CAF50' },
    cancelled: { bg: 'rgba(244, 67, 54, 0.2)', border: 'rgba(244, 67, 54, 0.4)', text: '#F44336' }
  };

  const priorityColors = {
    low: undergroundTheme.colors.text.tertiary,
    medium: undergroundTheme.colors.text.primary,
    high: '#FFC107',
    urgent: '#F44336'
  };

  const statusLabels = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled'
  };

  const priorityLabels = {
    low: 'Low',
    medium: 'Normal',
    high: 'High',
    urgent: 'Urgent'
  };

  const color = statusColors[task.status];

  return (
    <div style={{
      background: undergroundTheme.colors.glassmorphism.light,
      border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
      borderRadius: undergroundTheme.borderRadius.xl,
      padding: undergroundTheme.spacing['2xl'],
      backdropFilter: 'blur(20px)',
      boxShadow: undergroundTheme.shadows.md,
      transition: undergroundTheme.transitions.normal,
      cursor: 'pointer',
      opacity: isLoading ? 0.6 : 1,
      pointerEvents: isLoading ? 'none' : 'auto',
    }}>
      <div onClick={() => !isLoading && setExpanded(!expanded)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: undergroundTheme.colors.text.primary, fontWeight: '600' }}>
              {task.title}
            </h3>
            {task.description && (
              <p style={{ margin: 0, fontSize: '14px', color: undergroundTheme.colors.text.tertiary }}>
                {task.description}
              </p>
            )}
          </div>
          <div style={{ fontSize: '20px', marginLeft: '12px', color: undergroundTheme.colors.accent.primary }}>
            {isLoading ? '⏳' : expanded ? '▼' : '◀'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{
            padding: '4px 12px',
            borderRadius: '12px',
            background: color.bg,
            border: `1px solid ${color.border}`,
            fontSize: '12px',
            fontWeight: '600',
            color: color.text
          }}>
            {statusLabels[task.status]}
          </div>

          {task.priority && (
            <div style={{
              padding: '4px 12px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: `1px solid rgba(255, 255, 255, 0.2)`,
              fontSize: '12px',
              fontWeight: '600',
              color: priorityColors[task.priority]
            }}>
              {priorityLabels[task.priority]}
            </div>
          )}

          {task.due_date && (
            <div style={{
              padding: '4px 12px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: `1px solid rgba(255, 255, 255, 0.2)`,
              fontSize: '12px',
              color: undergroundTheme.colors.text.tertiary
            }}>
              📅 {new Date(task.due_date).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${undergroundTheme.colors.glassmorphism.border}` }}>
          {canManage && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                disabled={isLoading}
                style={{
                  flex: 1,
                  minWidth: '100px',
                  padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing.lg}`,
                  background: undergroundTheme.colors.glassmorphism.light,
                  border: `2px solid ${undergroundTheme.colors.accent.primary}`,
                  borderRadius: undergroundTheme.borderRadius.lg,
                  color: undergroundTheme.colors.accent.primary,
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  cursor: isLoading ? 'wait' : 'pointer',
                  transition: undergroundTheme.transitions.normal,
                }}
              >
                ✏️ Edit
              </button>

              {task.status === 'pending' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange('in_progress');
                  }}
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    minWidth: '100px',
                    padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing.lg}`,
                    background: undergroundTheme.colors.gradient.accent,
                    border: 'none',
                    borderRadius: undergroundTheme.borderRadius.lg,
                    color: undergroundTheme.colors.text.primary,
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    fontWeight: undergroundTheme.typography.fontWeight.semibold,
                    cursor: isLoading ? 'wait' : 'pointer',
                    boxShadow: undergroundTheme.shadows.glow.cyan,
                    transition: undergroundTheme.transitions.normal,
                  }}
                >
                  ▶️ Start
                </button>
              )}

              {task.status === 'in_progress' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange('completed');
                  }}
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    minWidth: '100px',
                    padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing.lg}`,
                    background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                    border: 'none',
                    borderRadius: undergroundTheme.borderRadius.lg,
                    color: undergroundTheme.colors.text.primary,
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    fontWeight: undergroundTheme.typography.fontWeight.semibold,
                    cursor: isLoading ? 'wait' : 'pointer',
                    transition: undergroundTheme.transitions.normal,
                  }}
                >
                  ✅ Complete
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                disabled={isLoading}
                style={{
                  flex: '0 0 auto',
                  padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing.lg}`,
                  background: undergroundTheme.colors.status.error,
                  border: 'none',
                  borderRadius: undergroundTheme.borderRadius.lg,
                  color: undergroundTheme.colors.text.primary,
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  cursor: isLoading ? 'wait' : 'pointer',
                  transition: undergroundTheme.transitions.normal,
                }}
              >
                🗑️
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskModal({ task, profiles, currentUserId, isLoading, onClose, onSubmit }: {
  task?: Task;
  profiles: User[];
  currentUserId: string;
  isLoading: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Task>) => void;
}) {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'pending' as Task['status'],
    priority: task?.priority || 'medium' as Task['priority'],
    assigned_to: task?.assigned_to || '',
    due_date: task?.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
    type: task?.type || 'general' as Task['type']
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (formData.title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    onSubmit({
      ...formData,
      assigned_by: task?.assigned_by || currentUserId,
      due_date: formData.due_date || undefined
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
        overflowY: 'auto',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: undergroundTheme.colors.glassmorphism.medium,
          borderRadius: undergroundTheme.borderRadius.xl,
          border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: undergroundTheme.shadows.lg,
          backdropFilter: 'blur(20px)',
          animation: 'slideUp 0.3s ease-out'
        }}
      >
        <div style={{
          padding: '24px',
          borderBottom: `1px solid ${undergroundTheme.colors.glassmorphism.border}`
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '700',
            color: undergroundTheme.colors.text.primary
          }}>
            {task ? 'Edit Task' : 'Create New Task'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: undergroundTheme.colors.text.primary
              }}>
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                style={{
                  width: '100%',
                  padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing.lg}`,
                  background: undergroundTheme.colors.background.dark,
                  border: `1px solid ${errors.title ? '#F44336' : undergroundTheme.colors.glassmorphism.border}`,
                  borderRadius: undergroundTheme.borderRadius.md,
                  color: undergroundTheme.colors.text.primary,
                  fontSize: undergroundTheme.typography.fontSize.base,
                  outline: 'none',
                  transition: undergroundTheme.transitions.normal,
                }}
                placeholder="Task title"
              />
              {errors.title && (
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#F44336' }}>
                  {errors.title}
                </div>
              )}
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: undergroundTheme.colors.text.primary
              }}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                style={{
                  width: '100%',
                  padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing.lg}`,
                  background: undergroundTheme.colors.background.dark,
                  border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
                  borderRadius: undergroundTheme.borderRadius.md,
                  color: undergroundTheme.colors.text.primary,
                  fontSize: undergroundTheme.typography.fontSize.base,
                  outline: 'none',
                  transition: undergroundTheme.transitions.normal,
                  resize: 'vertical',
                }}
                placeholder="Task description"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: undergroundTheme.colors.text.primary
                }}>
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Task['status'] })}
                  style={{
                    width: '100%',
                    padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing.lg}`,
                    background: undergroundTheme.colors.background.dark,
                    border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
                    borderRadius: undergroundTheme.borderRadius.md,
                    color: undergroundTheme.colors.text.primary,
                    fontSize: undergroundTheme.typography.fontSize.base,
                    outline: 'none',
                    transition: undergroundTheme.transitions.normal,
                  }}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: undergroundTheme.colors.text.primary
                }}>
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                  style={{
                    width: '100%',
                    padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing.lg}`,
                    background: undergroundTheme.colors.background.dark,
                    border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
                    borderRadius: undergroundTheme.borderRadius.md,
                    color: undergroundTheme.colors.text.primary,
                    fontSize: undergroundTheme.typography.fontSize.base,
                    outline: 'none',
                    transition: undergroundTheme.transitions.normal,
                  }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {profiles.length > 0 && (
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: undergroundTheme.colors.text.primary
                }}>
                  Assign to
                </label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  style={{
                    width: '100%',
                    padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing.lg}`,
                    background: undergroundTheme.colors.background.dark,
                    border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
                    borderRadius: undergroundTheme.borderRadius.md,
                    color: undergroundTheme.colors.text.primary,
                    fontSize: undergroundTheme.typography.fontSize.base,
                    outline: 'none',
                    transition: undergroundTheme.transitions.normal,
                  }}
                >
                  <option value="">Select user...</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.full_name || profile.username} ({profile.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: undergroundTheme.colors.text.primary
              }}>
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                style={{
                  width: '100%',
                  padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing.lg}`,
                  background: undergroundTheme.colors.background.dark,
                  border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
                  borderRadius: undergroundTheme.borderRadius.md,
                  color: undergroundTheme.colors.text.primary,
                  fontSize: undergroundTheme.typography.fontSize.base,
                  outline: 'none',
                  transition: undergroundTheme.transitions.normal,
                }}
              />
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '12px',
            marginTop: '24px'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing['2xl']}`,
                background: undergroundTheme.colors.glassmorphism.light,
                border: `2px solid ${undergroundTheme.colors.accent.primary}`,
                borderRadius: undergroundTheme.borderRadius.lg,
                color: undergroundTheme.colors.accent.primary,
                fontSize: undergroundTheme.typography.fontSize.base,
                fontWeight: undergroundTheme.typography.fontWeight.semibold,
                cursor: isLoading ? 'wait' : 'pointer',
                transition: undergroundTheme.transitions.normal,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                flex: 2,
                padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing['2xl']}`,
                background: isLoading ? undergroundTheme.colors.glassmorphism.medium : undergroundTheme.colors.gradient.accent,
                border: 'none',
                borderRadius: undergroundTheme.borderRadius.lg,
                color: undergroundTheme.colors.text.primary,
                fontSize: undergroundTheme.typography.fontSize.base,
                fontWeight: undergroundTheme.typography.fontWeight.semibold,
                cursor: isLoading ? 'wait' : 'pointer',
                boxShadow: undergroundTheme.shadows.glow.cyan,
                transition: undergroundTheme.transitions.normal,
              }}
            >
              {isLoading ? '⏳ Saving...' : (task ? 'Update Task' : 'Create Task')}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
