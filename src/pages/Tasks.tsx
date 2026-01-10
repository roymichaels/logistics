import React, { useState, useEffect } from 'react';

import { DataStore, Task, User } from '../data/types';
import { undergroundTheme } from '../styles/undergroundTheme';
import { hebrew, useI18n } from '../lib/i18n';
import { logger } from '../lib/logger';

interface TasksProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Tasks({ dataStore, onNavigate }: TasksProps) {
  const { t } = useI18n();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      if (!dataStore?.getProfile) {
        setLoading(false);
        return;
      }

      const profile = await dataStore.getProfile();
      setCurrentUser(profile);

      let tasksList: Task[] = [];
      if (profile.role === 'infrastructure_owner' || profile.role === 'business_owner' || profile.role === 'manager' || profile.role === 'dispatcher') {
        if (dataStore?.from) {
          const result = await dataStore.from('tasks').select('*').order('created_at', { ascending: false });
          if (result.success && result.data) {
            tasksList = result.data;
          }
        }
      } else {
        tasksList = await dataStore.listMyTasks?.() || [];
      }

      setTasks(tasksList);

      if (profile.role === 'infrastructure_owner' || profile.role === 'business_owner' || profile.role === 'manager' || profile.role === 'dispatcher') {
        if (dataStore?.from) {
          const usersResult = await dataStore.from('users').select('*').eq('active', true).order('name');
          if (usersResult.success && usersResult.data) {
            setUsers(usersResult.data);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to load tasks:', error);

    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (taskData: Partial<Task>) => {
    try {
      if (!dataStore.createTask) {

        return;
      }

      await dataStore.createTask(taskData as any);

      setShowCreateModal(false);
      loadData();
    } catch (error) {
      logger.error('Failed to create task:', error);

    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      if (!dataStore.updateTask) {

        return;
      }

      await dataStore.updateTask(taskId, updates);

      setShowEditModal(false);
      setSelectedTask(null);
      loadData();
    } catch (error) {
      logger.error('Failed to update task:', error);

    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const confirmed = window.confirm(t('tasksPage.confirmDelete'));
    if (!confirmed) return;

    try {
      if (!dataStore.supabase) return;

      await dataStore.supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      loadData();
    } catch (error) {
      logger.error('Failed to delete task:', error);

    }
  };

  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter(t => t.status === filter);

  const canManageTasks = currentUser?.role === 'infrastructure_owner' ||
                         currentUser?.role === 'business_owner' ||
                         currentUser?.role === 'manager' ||
                         currentUser?.role === 'dispatcher';

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
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <p style={{ color: undergroundTheme.colors.text.tertiary }}>טוען משימות...</p>
        </div>
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
        }}>משימות</h1>
        <p style={{
          margin: 0,
          fontSize: undergroundTheme.typography.fontSize.base,
          color: undergroundTheme.colors.text.tertiary,
          fontWeight: undergroundTheme.typography.fontWeight.medium,
        }}>
          ניהול ומעקב אחר משימות
        </p>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: filter === 'all' ? undergroundTheme.colors.gradient.accent : undergroundTheme.colors.glassmorphism.light,
          border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
          borderRadius: undergroundTheme.borderRadius.xl,
          padding: undergroundTheme.spacing['2xl'],
          backdropFilter: 'blur(20px)',
          boxShadow: filter === 'all' ? undergroundTheme.shadows.glow.cyan : undergroundTheme.shadows.md,
          transition: undergroundTheme.transitions.normal,
          cursor: 'pointer',
        }} onClick={() => setFilter('all')}>
          <div style={{
            fontSize: undergroundTheme.typography.fontSize['3xl'],
            fontWeight: undergroundTheme.typography.fontWeight.bold,
            color: undergroundTheme.colors.accent.primary,
            marginBottom: undergroundTheme.spacing.xs,
          }}>{statusCounts.all}</div>
          <div style={{
            fontSize: undergroundTheme.typography.fontSize.sm,
            color: undergroundTheme.colors.text.tertiary,
            fontWeight: undergroundTheme.typography.fontWeight.medium,
          }}>כל המשימות</div>
        </div>
        <div style={{
          background: filter === 'pending' ? undergroundTheme.colors.gradient.accent : undergroundTheme.colors.glassmorphism.light,
          border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
          borderRadius: undergroundTheme.borderRadius.xl,
          padding: undergroundTheme.spacing['2xl'],
          backdropFilter: 'blur(20px)',
          boxShadow: filter === 'pending' ? undergroundTheme.shadows.glow.cyan : undergroundTheme.shadows.md,
          transition: undergroundTheme.transitions.normal,
          cursor: 'pointer',
        }} onClick={() => setFilter('pending')}>
          <div style={{
            fontSize: undergroundTheme.typography.fontSize['3xl'],
            fontWeight: undergroundTheme.typography.fontWeight.bold,
            color: undergroundTheme.colors.accent.primary,
            marginBottom: undergroundTheme.spacing.xs,
          }}>{statusCounts.pending}</div>
          <div style={{
            fontSize: undergroundTheme.typography.fontSize.sm,
            color: undergroundTheme.colors.text.tertiary,
            fontWeight: undergroundTheme.typography.fontWeight.medium,
          }}>ממתינות</div>
        </div>
        <div style={{
          background: filter === 'in_progress' ? undergroundTheme.colors.gradient.accent : undergroundTheme.colors.glassmorphism.light,
          border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
          borderRadius: undergroundTheme.borderRadius.xl,
          padding: undergroundTheme.spacing['2xl'],
          backdropFilter: 'blur(20px)',
          boxShadow: filter === 'in_progress' ? undergroundTheme.shadows.glow.cyan : undergroundTheme.shadows.md,
          transition: undergroundTheme.transitions.normal,
          cursor: 'pointer',
        }} onClick={() => setFilter('in_progress')}>
          <div style={{
            fontSize: undergroundTheme.typography.fontSize['3xl'],
            fontWeight: undergroundTheme.typography.fontWeight.bold,
            color: undergroundTheme.colors.accent.primary,
            marginBottom: undergroundTheme.spacing.xs,
          }}>{statusCounts.in_progress}</div>
          <div style={{
            fontSize: undergroundTheme.typography.fontSize.sm,
            color: undergroundTheme.colors.text.tertiary,
            fontWeight: undergroundTheme.typography.fontWeight.medium,
          }}>בביצוע</div>
        </div>
        <div style={{
          background: filter === 'completed' ? undergroundTheme.colors.gradient.accent : undergroundTheme.colors.glassmorphism.light,
          border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
          borderRadius: undergroundTheme.borderRadius.xl,
          padding: undergroundTheme.spacing['2xl'],
          backdropFilter: 'blur(20px)',
          boxShadow: filter === 'completed' ? undergroundTheme.shadows.glow.cyan : undergroundTheme.shadows.md,
          transition: undergroundTheme.transitions.normal,
          cursor: 'pointer',
        }} onClick={() => setFilter('completed')}>
          <div style={{
            fontSize: undergroundTheme.typography.fontSize['3xl'],
            fontWeight: undergroundTheme.typography.fontWeight.bold,
            color: undergroundTheme.colors.accent.primary,
            marginBottom: undergroundTheme.spacing.xs,
          }}>{statusCounts.completed}</div>
          <div style={{
            fontSize: undergroundTheme.typography.fontSize.sm,
            color: undergroundTheme.colors.text.tertiary,
            fontWeight: undergroundTheme.typography.fontWeight.medium,
          }}>הושלמו</div>
        </div>
      </div>

      {/* Create Task Button (for admins) */}
      {canManageTasks && (
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            width: '100%',
            marginBottom: '24px',
            padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing['2xl']}`,
            background: undergroundTheme.colors.gradient.accent,
            border: 'none',
            borderRadius: undergroundTheme.borderRadius.lg,
            color: undergroundTheme.colors.text.primary,
            fontSize: undergroundTheme.typography.fontSize.base,
            fontWeight: undergroundTheme.typography.fontWeight.semibold,
            cursor: 'pointer',
            boxShadow: undergroundTheme.shadows.glow.cyan,
            transition: undergroundTheme.transitions.normal,
          }}
        >
          + צור משימה חדשה
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
            אין משימות להצגה
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              canManage={canManageTasks}
              onEdit={() => {
                setSelectedTask(task);
                setShowEditModal(true);
              }}
              onDelete={() => handleDeleteTask(task.id)}
              onStatusChange={(status) => handleUpdateTask(task.id, { status })}
            />
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <TaskModal
          users={users}
          currentUserId={currentUser?.id || ''}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTask}
        />
      )}

      {/* Edit Task Modal */}
      {showEditModal && selectedTask && (
        <TaskModal
          task={selectedTask}
          users={users}
          currentUserId={currentUser?.id || ''}
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

function TaskCard({ task, canManage, onEdit, onDelete, onStatusChange }: {
  task: Task;
  canManage: boolean;
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
    normal: undergroundTheme.colors.text.primary,
    high: '#FFC107',
    urgent: '#F44336'
  };

  const statusLabels = {
    pending: 'ממתין',
    in_progress: 'בביצוע',
    completed: 'הושלם',
    cancelled: 'בוטל'
  };

  const priorityLabels = {
    low: 'נמוך',
    normal: 'רגיל',
    high: 'גבוה',
    urgent: 'דחוף'
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
    }}>
      <div onClick={() => setExpanded(!expanded)}>
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
            {expanded ? '▼' : '◀'}
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
              📅 {new Date(task.due_date).toLocaleDateString('he-IL')}
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${undergroundTheme.colors.glassmorphism.border}` }}>
          {task.notes && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', color: undergroundTheme.colors.text.tertiary, marginBottom: '4px' }}>הערות</div>
              <div style={{ fontSize: '14px', color: undergroundTheme.colors.text.primary }}>{task.notes}</div>
            </div>
          )}

          {canManage && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                style={{
                  flex: 1,
                  padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing['2xl']}`,
                  background: undergroundTheme.colors.glassmorphism.light,
                  border: `2px solid ${undergroundTheme.colors.accent.primary}`,
                  borderRadius: undergroundTheme.borderRadius.lg,
                  color: undergroundTheme.colors.accent.primary,
                  fontSize: undergroundTheme.typography.fontSize.base,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  cursor: 'pointer',
                  transition: undergroundTheme.transitions.normal,
                }}
              >
                ערוך
              </button>

              {task.status === 'pending' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange('in_progress');
                  }}
                  style={{
                    flex: 1,
                    padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing['2xl']}`,
                    background: undergroundTheme.colors.gradient.accent,
                    border: 'none',
                    borderRadius: undergroundTheme.borderRadius.lg,
                    color: undergroundTheme.colors.text.primary,
                    fontSize: undergroundTheme.typography.fontSize.base,
                    fontWeight: undergroundTheme.typography.fontWeight.semibold,
                    cursor: 'pointer',
                    boxShadow: undergroundTheme.shadows.glow.cyan,
                    transition: undergroundTheme.transitions.normal,
                  }}
                >
                  התחל
                </button>
              )}

              {task.status === 'in_progress' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange('completed');
                  }}
                  style={{
                    flex: 1,
                    padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing['2xl']}`,
                    background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                    border: 'none',
                    borderRadius: undergroundTheme.borderRadius.lg,
                    color: undergroundTheme.colors.text.primary,
                    fontSize: undergroundTheme.typography.fontSize.base,
                    fontWeight: undergroundTheme.typography.fontWeight.semibold,
                    cursor: 'pointer',
                    transition: undergroundTheme.transitions.normal,
                  }}
                >
                  סיים
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                style={{
                  flex: 0.5,
                  padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing['2xl']}`,
                  background: undergroundTheme.colors.status.error,
                  border: 'none',
                  borderRadius: undergroundTheme.borderRadius.lg,
                  color: undergroundTheme.colors.text.primary,
                  fontSize: undergroundTheme.typography.fontSize.base,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  cursor: 'pointer',
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

function TaskModal({ task, users, currentUserId, onClose, onSubmit }: {
  task?: Task;
  users: User[];
  currentUserId: string;
  onClose: () => void;
  onSubmit: (data: Partial<Task>) => void;
}) {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'pending' as Task['status'],
    priority: task?.priority || 'normal' as Task['priority'],
    assigned_to: task?.assigned_to || '',
    due_date: task?.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
    notes: task?.notes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title) {

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
        direction: 'rtl',
        overflowY: 'auto'
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
            {task ? 'ערוך משימה' : 'צור משימה חדשה'}
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
                כותרת *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                placeholder="כותרת המשימה"
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: undergroundTheme.colors.text.primary
              }}>
                תיאור
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
                placeholder="תיאור המשימה"
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
                  סטטוס
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
                  <option value="pending">ממתין</option>
                  <option value="in_progress">בביצוע</option>
                  <option value="completed">הושלם</option>
                  <option value="cancelled">בוטל</option>
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
                  עדיפות
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
                  <option value="low">נמוך</option>
                  <option value="normal">רגיל</option>
                  <option value="high">גבוה</option>
                  <option value="urgent">דחוף</option>
                </select>
              </div>
            </div>

            {users.length > 0 && (
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: undergroundTheme.colors.text.primary
                }}>
                  הקצה למשתמש
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
                  <option value="">בחר משתמש...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.username} ({user.role})
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
                תאריך יעד
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

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: undergroundTheme.colors.text.primary
              }}>
                הערות
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                placeholder="הערות נוספות"
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
              style={{
                flex: 1,
                padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing['2xl']}`,
                background: undergroundTheme.colors.glassmorphism.light,
                border: `2px solid ${undergroundTheme.colors.accent.primary}`,
                borderRadius: undergroundTheme.borderRadius.lg,
                color: undergroundTheme.colors.accent.primary,
                fontSize: undergroundTheme.typography.fontSize.base,
                fontWeight: undergroundTheme.typography.fontWeight.semibold,
                cursor: 'pointer',
                transition: undergroundTheme.transitions.normal,
              }}
            >
              ביטול
            </button>
            <button
              type="submit"
              style={{
                flex: 2,
                padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing['2xl']}`,
                background: undergroundTheme.colors.gradient.accent,
                border: 'none',
                borderRadius: undergroundTheme.borderRadius.lg,
                color: undergroundTheme.colors.text.primary,
                fontSize: undergroundTheme.typography.fontSize.base,
                fontWeight: undergroundTheme.typography.fontWeight.semibold,
                cursor: 'pointer',
                boxShadow: undergroundTheme.shadows.glow.cyan,
                transition: undergroundTheme.transitions.normal,
              }}
            >
              {task ? 'עדכן' : 'צור משימה'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
