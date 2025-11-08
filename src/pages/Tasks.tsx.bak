import React, { useState, useEffect } from 'react';
import { telegram } from '../lib/telegram';
import { DataStore, Task, User } from '../data/types';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import { hebrew } from '../lib/i18n';

interface TasksProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Tasks({ dataStore, onNavigate }: TasksProps) {
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

      // Load tasks based on role
      let tasksList: Task[] = [];
      if (profile.role === 'infrastructure_owner' || profile.role === 'business_owner' || profile.role === 'manager' || profile.role === 'dispatcher') {
        // Admins see all tasks
        if (dataStore.supabase) {
          const { data, error } = await dataStore.supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && data) {
            tasksList = data;
          }
        }
      } else {
        // Regular users see their tasks
        tasksList = await dataStore.listMyTasks?.() || [];
      }

      setTasks(tasksList);

      // Load users for assignment (if admin)
      if (profile.role === 'infrastructure_owner' || profile.role === 'business_owner' || profile.role === 'manager' || profile.role === 'dispatcher') {
        if (dataStore.supabase) {
          const { data: usersData } = await dataStore.supabase
            .from('users')
            .select('*')
            .eq('active', true)
            .order('name');

          if (usersData) {
            setUsers(usersData);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
      telegram.showAlert('שגיאה בטעינת משימות');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (taskData: Partial<Task>) => {
    try {
      if (!dataStore.createTask) {
        telegram.showAlert('פעולה זו אינה נתמכת');
        return;
      }

      await dataStore.createTask(taskData as any);
      telegram.hapticFeedback('notification', 'success');
      telegram.showAlert('המשימה נוצרה בהצלחה');
      setShowCreateModal(false);
      loadData();
    } catch (error) {
      console.error('Failed to create task:', error);
      telegram.showAlert('שגיאה ביצירת המשימה');
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      if (!dataStore.updateTask) {
        telegram.showAlert('פעולה זו אינה נתמכת');
        return;
      }

      await dataStore.updateTask(taskId, updates);
      telegram.hapticFeedback('notification', 'success');
      telegram.showAlert('המשימה עודכנה בהצלחה');
      setShowEditModal(false);
      setSelectedTask(null);
      loadData();
    } catch (error) {
      console.error('Failed to update task:', error);
      telegram.showAlert('שגיאה בעדכון המשימה');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const confirmed = window.confirm('האם אתה בטוח שברצונך למחוק משימה זו?');
    if (!confirmed) return;

    try {
      if (!dataStore.supabase) return;

      await dataStore.supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      telegram.hapticFeedback('notification', 'success');
      telegram.showAlert('המשימה נמחקה');
      loadData();
    } catch (error) {
      console.error('Failed to delete task:', error);
      telegram.showAlert('שגיאה במחיקת המשימה');
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
      <div style={ROYAL_STYLES.pageContainer}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <p style={{ color: ROYAL_COLORS.muted }}>טוען משימות...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={ROYAL_STYLES.pageContainer}>
      <div style={ROYAL_STYLES.pageHeader}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>📋</div>
        <h1 style={ROYAL_STYLES.pageTitle}>משימות</h1>
        <p style={ROYAL_STYLES.pageSubtitle}>
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
          ...ROYAL_STYLES.card,
          background: filter === 'all' ? ROYAL_COLORS.gradientCard : ROYAL_COLORS.cardBg,
          cursor: 'pointer'
        }} onClick={() => setFilter('all')}>
          <div style={ROYAL_STYLES.statValue}>{statusCounts.all}</div>
          <div style={ROYAL_STYLES.statLabel}>כל המשימות</div>
        </div>
        <div style={{
          ...ROYAL_STYLES.card,
          background: filter === 'pending' ? ROYAL_COLORS.gradientCard : ROYAL_COLORS.cardBg,
          cursor: 'pointer'
        }} onClick={() => setFilter('pending')}>
          <div style={ROYAL_STYLES.statValue}>{statusCounts.pending}</div>
          <div style={ROYAL_STYLES.statLabel}>ממתינות</div>
        </div>
        <div style={{
          ...ROYAL_STYLES.card,
          background: filter === 'in_progress' ? ROYAL_COLORS.gradientCard : ROYAL_COLORS.cardBg,
          cursor: 'pointer'
        }} onClick={() => setFilter('in_progress')}>
          <div style={ROYAL_STYLES.statValue}>{statusCounts.in_progress}</div>
          <div style={ROYAL_STYLES.statLabel}>בביצוע</div>
        </div>
        <div style={{
          ...ROYAL_STYLES.card,
          background: filter === 'completed' ? ROYAL_COLORS.gradientCard : ROYAL_COLORS.cardBg,
          cursor: 'pointer'
        }} onClick={() => setFilter('completed')}>
          <div style={ROYAL_STYLES.statValue}>{statusCounts.completed}</div>
          <div style={ROYAL_STYLES.statLabel}>הושלמו</div>
        </div>
      </div>

      {/* Create Task Button (for admins) */}
      {canManageTasks && (
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            ...ROYAL_STYLES.buttonPrimary,
            width: '100%',
            marginBottom: '24px'
          }}
        >
          + צור משימה חדשה
        </button>
      )}

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div style={ROYAL_STYLES.emptyState}>
          <div style={ROYAL_STYLES.emptyStateIcon}>📋</div>
          <div style={ROYAL_STYLES.emptyStateText}>
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
    low: ROYAL_COLORS.muted,
    normal: ROYAL_COLORS.text,
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
      ...ROYAL_STYLES.card,
      cursor: 'pointer'
    }}>
      <div onClick={() => setExpanded(!expanded)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: ROYAL_COLORS.text, fontWeight: '600' }}>
              {task.title}
            </h3>
            {task.description && (
              <p style={{ margin: 0, fontSize: '14px', color: ROYAL_COLORS.muted }}>
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
              color: ROYAL_COLORS.muted
            }}>
              📅 {new Date(task.due_date).toLocaleDateString('he-IL')}
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${ROYAL_COLORS.border}` }}>
          {task.notes && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>הערות</div>
              <div style={{ fontSize: '14px', color: ROYAL_COLORS.text }}>{task.notes}</div>
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
                  ...ROYAL_STYLES.buttonSecondary,
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
                    ...ROYAL_STYLES.buttonPrimary,
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
                    ...ROYAL_STYLES.buttonPrimary,
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
                  ...ROYAL_STYLES.buttonDanger,
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
      telegram.showAlert('אנא הזן כותרת למשימה');
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
          backgroundColor: ROYAL_COLORS.cardBg,
          borderRadius: '20px',
          border: `1px solid ${ROYAL_COLORS.cardBorder}`,
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: ROYAL_COLORS.shadowStrong
        }}
      >
        <div style={{
          padding: '24px',
          borderBottom: `1px solid ${ROYAL_COLORS.border}`
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '700',
            color: ROYAL_COLORS.text
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
                color: ROYAL_COLORS.text
              }}>
                כותרת *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                style={ROYAL_STYLES.input}
                placeholder="כותרת המשימה"
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: ROYAL_COLORS.text
              }}>
                תיאור
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                style={{
                  ...ROYAL_STYLES.input,
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
                  color: ROYAL_COLORS.text
                }}>
                  סטטוס
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Task['status'] })}
                  style={ROYAL_STYLES.input}
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
                  color: ROYAL_COLORS.text
                }}>
                  עדיפות
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                  style={ROYAL_STYLES.input}
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
                  color: ROYAL_COLORS.text
                }}>
                  הקצה למשתמש
                </label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  style={ROYAL_STYLES.input}
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
                color: ROYAL_COLORS.text
              }}>
                תאריך יעד
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                style={ROYAL_STYLES.input}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: ROYAL_COLORS.text
              }}>
                הערות
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                style={{
                  ...ROYAL_STYLES.input,
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
                ...ROYAL_STYLES.buttonSecondary,
                flex: 1
              }}
            >
              ביטול
            </button>
            <button
              type="submit"
              style={{
                ...ROYAL_STYLES.buttonPrimary,
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
