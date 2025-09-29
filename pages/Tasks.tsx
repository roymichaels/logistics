import React, { useState, useEffect } from 'react';
import { telegram } from '../lib/telegram';
import { DataStore, Task, Order, Route } from '../data/types';
import { cache } from '../lib/cache';
import { TaskProofSubmission } from '../src/components/TaskProofSubmission';

interface TasksProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Tasks({ dataStore, onNavigate }: TasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [orders, setOrders] = useState<{ [key: string]: Order }>({});
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showProofSubmission, setShowProofSubmission] = useState(false);
  const [taskForProof, setTaskForProof] = useState<Task | null>(null);

  const theme = telegram.themeParams;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    telegram.setBackButton(() => {
      if (showProofSubmission) {
        setShowProofSubmission(false);
        setTaskForProof(null);
      } else if (selectedTask) {
        setSelectedTask(null);
      } else {
        // Don't navigate back to dashboard, let bottom nav handle it
        return;
      }
    });

    // Only show back button when in task detail or proof submission
    if (!selectedTask && !showProofSubmission) {
      telegram.hideBackButton();
    }
  }, [selectedTask, onNavigate]);

  const loadData = async () => {
    try {
      // Try to load from cache first for offline support
      const cachedTasks = await cache.getTasks();
      if (cachedTasks.length > 0) {
        setTasks(cachedTasks);
      }

      // Load fresh data
      const tasksList = await dataStore.listMyTasks?.() || [];
      setTasks(tasksList);
      await cache.setTasks(tasksList);

      // Load related orders
      const orderIds = [...new Set(tasksList.map(t => t.order_id))];
      const ordersMap: { [key: string]: Order } = {};
      
      for (const orderId of orderIds) {
        try {
          const order = await dataStore.getOrder?.(orderId);
          if (order) {
            ordersMap[orderId] = order;
          }
        } catch (error) {
          console.error(`Failed to load order ${orderId}:`, error);
        }
      }
      setOrders(ordersMap);

      // Load today's route
      const today = new Date().toISOString().split('T')[0];
      const todayRoute = await dataStore.getMyRoute?.(today);
      setRoute(todayRoute);

    } catch (error) {
      console.error('Failed to load tasks:', error);
      telegram.showAlert('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        color: theme.text_color,
        backgroundColor: theme.bg_color,
        minHeight: '100vh'
      }}>
        Loading tasks...
      </div>
    );
  }

  if (showProofSubmission && taskForProof) {
    return (
      <TaskProofSubmission
        task={taskForProof}
        onSubmit={async (proof) => {
          try {
            // Handle proof submission
            await dataStore.completeTask?.(proof.taskId, {
              proof_images: proof.images,
              proof_notes: proof.notes,
              completion_location: proof.location,
              completed_at: proof.timestamp.toISOString()
            });
            setShowProofSubmission(false);
            setTaskForProof(null);
            loadData();
            telegram.hapticFeedback('notification', 'success');
          } catch (error) {
            console.error('Failed to submit proof:', error);
            telegram.showAlert('שליחת הוכחת הביצוע נכשלה');
          }
        }}
        onCancel={() => {
          setShowProofSubmission(false);
          setTaskForProof(null);
        }}
      />
    );
  }

  if (selectedTask) {
    return (
      <TaskDetail
        task={selectedTask}
        order={orders[selectedTask.order_id]}
        dataStore={dataStore}
        onBack={() => setSelectedTask(null)}
        onComplete={() => {
          setSelectedTask(null);
          loadData();
        }}
        onSubmitProof={(task) => {
          setTaskForProof(task);
          setSelectedTask(null);
          setShowProofSubmission(true);
        }}
        theme={theme}
      />
    );
  }

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'enroute');
  const completedTasks = tasks.filter(t => t.status === 'done');

  return (
    <div style={{ 
      backgroundColor: theme.bg_color,
      color: theme.text_color,
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: `1px solid ${theme.hint_color}20` }}>
        <h1 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '24px', 
          fontWeight: '600'
        }}>
          My Tasks
        </h1>
        <p style={{ 
          margin: 0, 
          color: theme.hint_color,
          fontSize: '14px'
        }}>
          {new Date().toLocaleDateString()} • {pendingTasks.length} pending
        </p>
      </div>

      {/* Route Summary */}
      {route && (
        <div style={{ 
          padding: '16px',
          backgroundColor: theme.secondary_bg_color || '#f1f1f1',
          borderBottom: `1px solid ${theme.hint_color}20`
        }}>
          <h2 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '16px', 
            fontWeight: '600'
          }}>
            Today's Route
          </h2>
          <p style={{ 
            margin: 0, 
            color: theme.hint_color,
            fontSize: '14px'
          }}>
            {route.stops.length} stops planned
          </p>
        </div>
      )}

      <div style={{ padding: '16px' }}>
        {/* Pending Tasks */}
        {pendingTasks.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ 
              margin: '0 0 16px 0', 
              fontSize: '18px', 
              fontWeight: '600'
            }}>
              Pending ({pendingTasks.length})
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  order={orders[task.order_id]}
                  onClick={() => {
                    telegram.hapticFeedback('selection');
                    setSelectedTask(task);
                  }}
                  theme={theme}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div>
            <h2 style={{ 
              margin: '0 0 16px 0', 
              fontSize: '18px', 
              fontWeight: '600'
            }}>
              Completed ({completedTasks.length})
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {completedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  order={orders[task.order_id]}
                  onClick={() => {
                    telegram.hapticFeedback('selection');
                    setSelectedTask(task);
                  }}
                  theme={theme}
                />
              ))}
            </div>
          </div>
        )}

        {tasks.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px',
            color: theme.hint_color
          }}>
            No tasks assigned for today
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task, order, onClick, theme }: { 
  task: Task; 
  order?: Order;
  onClick: () => void;
  theme: any;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#ff9500';
      case 'enroute': return '#007aff';
      case 'done': return '#34c759';
      case 'failed': return '#ff3b30';
      default: return theme.hint_color;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'enroute': return '🚚';
      case 'done': return '✅';
      case 'failed': return '❌';
      default: return '📦';
    }
  };

  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px',
        backgroundColor: theme.secondary_bg_color || '#f1f1f1',
        borderRadius: '12px',
        cursor: 'pointer',
        border: `1px solid ${theme.hint_color}20`,
        opacity: task.status === 'done' ? 0.7 : 1
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ 
            margin: '0 0 4px 0', 
            fontSize: '16px', 
            fontWeight: '600',
            color: theme.text_color
          }}>
            {order?.customer || 'Unknown Customer'}
          </h3>
          <p style={{ 
            margin: 0, 
            fontSize: '14px', 
            color: theme.hint_color,
            lineHeight: '1.4'
          }}>
            {order?.address || 'No address available'}
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>
            {getStatusIcon(task.status)}
          </span>
          <div style={{
            padding: '4px 8px',
            borderRadius: '12px',
            backgroundColor: getStatusColor(task.status) + '20',
            color: getStatusColor(task.status),
            fontSize: '12px',
            fontWeight: '600'
          }}>
            {task.status.toUpperCase()}
          </div>
        </div>
      </div>

      {order?.eta && (
        <p style={{ 
          margin: '8px 0 0 0', 
          fontSize: '12px', 
          color: theme.hint_color
        }}>
          ETA: {new Date(order.eta).toLocaleString()}
        </p>
      )}

      {task.completed_at && (
        <p style={{ 
          margin: '8px 0 0 0', 
          fontSize: '12px', 
          color: getStatusColor(task.status)
        }}>
          Completed: {new Date(task.completed_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}

function TaskDetail({ task, order, dataStore, onBack, onComplete, onSubmitProof, theme }: {
  task: Task;
  order?: Order;
  dataStore: DataStore;
  onBack: () => void;
  onComplete: () => void;
  onSubmitProof?: (task: Task) => void;
  theme: any;
}) {
  const [completing, setCompleting] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);

  const handleComplete = async () => {
    const confirmed = await telegram.showConfirm('Mark this task as completed?');
    if (!confirmed) return;

    setCompleting(true);
    try {
      await dataStore.completeTask?.(task.id, {
        photo: photo || undefined,
        gps: { lat: 0, lng: 0 } // In real app, get actual GPS coordinates
      });
      
      telegram.hapticFeedback('notification', 'success');
      onComplete();
    } catch (error) {
      console.error('Failed to complete task:', error);
      telegram.showAlert('Failed to complete task');
    } finally {
      setCompleting(false);
    }
  };

  const handleTakePhoto = () => {
    // In a real app, this would open camera
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPhoto(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    };
    
    input.click();
  };

  useEffect(() => {
    if (task.status === 'pending' || task.status === 'enroute') {
      telegram.setMainButton(
        completing ? 'Completing...' : 'Complete Task',
        handleComplete
      );
    } else {
      telegram.hideMainButton();
    }

    return () => telegram.hideMainButton();
  }, [task.status, completing]);

  return (
    <div style={{ 
      padding: '16px',
      backgroundColor: theme.bg_color,
      color: theme.text_color,
      minHeight: '100vh'
    }}>
      <h1 style={{ 
        margin: '0 0 24px 0', 
        fontSize: '24px', 
        fontWeight: '600'
      }}>
        Task Details
      </h1>

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
          {order?.customer || 'Unknown Customer'}
        </h2>
        <p style={{ margin: '0 0 16px 0', color: theme.hint_color }}>
          {order?.address || 'No address available'}
        </p>
        
        <div style={{
          padding: '8px 12px',
          borderRadius: '8px',
          backgroundColor: theme.secondary_bg_color,
          display: 'inline-block',
          marginBottom: '16px'
        }}>
          Status: <strong>{task.status.toUpperCase()}</strong>
        </div>

        {order?.eta && (
          <p style={{ margin: '0 0 16px 0', color: theme.hint_color }}>
            ETA: {new Date(order.eta).toLocaleString()}
          </p>
        )}

        {order?.notes && (
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
              Delivery Notes
            </h3>
            <p style={{ margin: 0, color: theme.hint_color }}>
              {order.notes}
            </p>
          </div>
        )}

        {order?.items && order.items.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
              Items to Deliver
            </h3>
            {order.items.map((item, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: index < order.items!.length - 1 ? `1px solid ${theme.hint_color}20` : 'none'
              }}>
                <span>{item.name}</span>
                <span>×{item.quantity}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo Section */}
      {(task.status === 'pending' || task.status === 'enroute') && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
            Proof of Delivery
          </h3>
          
          <button
            onClick={() => onSubmitProof?.(task)}
            style={{
              padding: '16px',
              backgroundColor: theme.button_color || '#007aff',
              color: theme.button_text_color || 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              cursor: 'pointer',
              width: '100%',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            📷 שלח הוכחת ביצוע
          </button>

          {photo && (
            <div style={{ marginBottom: '16px' }}>
              <img
                src={photo}
                alt="Proof of delivery"
                style={{
                  width: '100%',
                  maxWidth: '300px',
                  height: 'auto',
                  borderRadius: '8px',
                  border: `1px solid ${theme.hint_color}40`
                }}
              />
              <button
                onClick={() => setPhoto(null)}
                style={{
                  marginTop: '8px',
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  color: theme.link_color,
                  border: `1px solid ${theme.link_color}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                הסר תמונה
              </button>
            </div>
          )}
        </div>
      )}

      {/* Completed Task Info */}
      {task.status === 'done' && (
        <div style={{
          padding: '16px',
          backgroundColor: '#34c759' + '20',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#34c759' }}>
            ✅ Task Completed
          </h3>
          {task.completed_at && (
            <p style={{ margin: 0, fontSize: '14px', color: theme.hint_color }}>
              Completed: {new Date(task.completed_at).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {task.proof_url && (
        <div style={{ marginTop: '16px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
            Proof of Delivery
          </h3>
          <img 
            src={task.proof_url} 
            alt="Proof of delivery"
            style={{ 
              width: '100%', 
              maxWidth: '300px',
              height: 'auto',
              borderRadius: '8px',
              border: `1px solid ${theme.hint_color}40`
            }}
          />
        </div>
      )}
    </div>
  );
}