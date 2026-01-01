import React, { useState, useEffect } from 'react';

import { DataStore, Task, User } from '../data/types';
import { tokens, styles } from '../styles/tokens';
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
      const profile = await dataStore.getProfile();
      setCurrentUser(profile);

      let tasksList: Task[] = [];
      if (profile.role === 'infrastructure_owner' || profile.role === 'business_owner' || profile.role === 'manager' || profile.role === 'dispatcher') {
        const result = await dataStore.from('tasks').select('*').order('created_at', { ascending: false });
        if (result.success && result.data) {
          tasksList = result.data;
        }
      } else {
        tasksList = await dataStore.listMyTasks?.() || [];
      }

      setTasks(tasksList);

      if (profile.role === 'infrastructure_owner' || profile.role === 'business_owner' || profile.role === 'manager' || profile.role === 'dispatcher') {
        const usersResult = await dataStore.from('users').select('*').eq('active', true).order('name');
        if (usersResult.success && usersResult.data) {
          setUsers(usersResult.data);
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
      <div style={styles.pageContainer}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <p style={{ color: tokens.colors.text.secondary }}>טוען משימות...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      <div style={styles.pageHeader}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>📋</div>
        <h1 style={styles.pageTitle}>משימות</h1>
        <p style={styles.pageSubtitle}>
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
          ...styles.card,
          background: filter === 'all' ? tokens.gradients.card : tokens.colors.background.cardBg,
          cursor: 'pointer'
        }} onClick={() => setFilter('all')}>
          <div style={styles.stat.value}>{statusCounts.all}</div>
          <div style={styles.stat.label}>כל המשימות</div>
        </div>
        <div style={{
          ...styles.card,
          background: filter === 'pending' ? tokens.gradients.card : tokens.colors.background.cardBg,
          cursor: 'pointer'
        }} onClick={() => setFilter('pending')}>
          <div style={styles.stat.value}>{statusCounts.pending}</div>
          <div style={styles.stat.label}>ממתינות</div>
        </div>
        <div style={{
          ...styles.card,
          background: filter === 'in_progress' ? tokens.gradients.card : tokens.colors.background.cardBg,
          cursor: 'pointer'
        }} onClick={() => setFilter('in_progress')}>
          <div style={styles.stat.value}>{statusCounts.in_progress}</div>
          <div style={styles.stat.label}>בביצוע</div>
        </div>
        <div style={{
          ...styles.card,
          background: filter === 'completed' ? tokens.gradients.card : tokens.colors.background.cardBg,
          cursor: 'pointer'
        }} onClick={() => setFilter('completed')}>
          <div style={styles.stat.value}>{statusCounts.completed}</div>
          <div style={styles.stat.label}>הושלמו</div>
        </div>
      </div>

      {/* Create Task Button (for admins) */}
      {canManageTasks && (
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            ...styles.button.primary,
            width: '100%',
            marginBottom: '24px'
          }}
        >
          + צור משימה חדשה
        </button>
      )}

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div style={styles.emptyState.container}>
          <div style={styles.emptyState.containerIcon}>📋</div>
          <div style={styles.emptyState.containerText}>
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
    low: tokens.colors.text.secondary,
    normal: tokens.colors.text.primary,
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
      ...styles.card,
      cursor: 'pointer'
    }}>
      <div onClick={() => setExpanded(!expanded)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: tokens.colors.text.primary, fontWeight: '600' }}>
              {task.title}
            </h3>
            {task.description && (
              <p style={{ margin: 0, fontSize: '14px', color: tokens.colors.text.secondary }}>
                {task.description}
              </p>
            )}
          </div>
          <div style={{ fontSize: '20px', marginLeft: '12px' }}>
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
              color: tokens.colors.text.secondary
            }}>
              📅 {new Date(task.due_date).toLocaleDateString('he-IL')}
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${tokens.colors.border.default}` }}>
          {task.notes && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', color: tokens.colors.text.secondary, marginBottom: '4px' }}>הערות</div>
              <div style={{ fontSize: '14px', color: tokens.colors.text.primary }}>{task.notes}</div>
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
                  ...styles.button.secondary,
                  flex: 1
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
                    ...styles.button.primary,
                    flex: 1
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
                    ...styles.button.primary,
                    flex: 1,
                    background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)'
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
                  ...styles.button.danger,
                  flex: 0.5
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
          backgroundColor: tokens.colors.background.cardBg,
          borderRadius: '20px',
          border: `1px solid ${tokens.colors.background.cardBorder}`,
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: tokens.shadows.mdStrong
        }}
      >
        <div style={{
          padding: '24px',
          borderBottom: `1px solid ${tokens.colors.border.default}`
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '700',
            color: tokens.colors.text.primary
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
                color: tokens.colors.text.primary
              }}>
                כותרת *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                style={styles.input}
                placeholder="כותרת המשימה"
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: tokens.colors.text.primary
              }}>
                תיאור
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                style={{
                  ...styles.input,
                  resize: 'vertical'
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
                  color: tokens.colors.text.primary
                }}>
                  סטטוס
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Task['status'] })}
                  style={styles.input}
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
                  color: tokens.colors.text.primary
                }}>
                  עדיפות
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                  style={styles.input}
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
                  color: tokens.colors.text.primary
                }}>
                  הקצה למשתמש
                </label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  style={styles.input}
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
                color: tokens.colors.text.primary
              }}>
                תאריך יעד
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                style={styles.input}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: tokens.colors.text.primary
              }}>
                הערות
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                style={{
                  ...styles.input,
                  resize: 'vertical'
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
                ...styles.button.secondary,
                flex: 1
              }}
            >
              ביטול
            </button>
            <button
              type="submit"
              style={{
                ...styles.button.primary,
                flex: 2
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
