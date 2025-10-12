import React, { useState, useEffect } from 'react';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { Task, User } from '../data/types';
import { RouteOptimizer, Location, OptimizationResult, RouteOptimizationOptions } from '../lib/routeOptimization';

interface RoutePlannerProps {
  tasks: Task[];
  assignedDriver?: User;
  onRouteOptimized: (result: OptimizationResult) => void;
  onClose: () => void;
}

export function RoutePlanner({ tasks, assignedDriver, onRouteOptimized, onClose }: RoutePlannerProps) {
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [optimizationOptions, setOptimizationOptions] = useState<RouteOptimizationOptions>({
    startLocation: {
      id: 'warehouse',
      name: 'מחסן מרכזי',
      address: 'רחוב התעשייה 12, תל אביב',
      coordinates: { latitude: 32.0853, longitude: 34.7818 },
      priority: 'medium' as const,
      serviceTime: 0
    },
    maxStops: 15,
    timeConstraints: {
      maxWorkingHours: 8,
      breakTime: 60
    },
    vehicleType: 'car' as const,
    trafficConsideration: true
  });
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const { theme, haptic } = useTelegramUI();

  useEffect(() => {
    // Auto-select high priority tasks
    const highPriorityTasks = tasks.filter(task => task.priority === 'urgent' || task.priority === 'high').map(task => task.id);
    setSelectedTasks(highPriorityTasks);
  }, [tasks]);

  const handleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
    haptic();
  };

  const optimizeRoute = async () => {
    if (selectedTasks.length === 0) {
      haptic();
      return;
    }

    setIsOptimizing(true);
    try {
      const selectedTaskObjects = tasks.filter(task => selectedTasks.includes(task.id));
      const locations = selectedTaskObjects.map(task => RouteOptimizer.createLocationFromTask(task));

      const result = RouteOptimizer.optimizeRoute(locations, optimizationOptions);
      setOptimizationResult(result);
      onRouteOptimized(result);
      haptic();
    } catch (error) {
      console.error('Route optimization failed:', error);
      haptic();
    } finally {
      setIsOptimizing(false);
    }
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  const formatDistance = (km: number): string => {
    return km < 1 ? `${Math.round(km * 1000)}מ'` : `${km.toFixed(1)}ק"מ`;
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return '🔴';
      case 'high': return '🟡';
      default: return '🟢';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: theme.bg_color,
        borderRadius: '16px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflowY: 'auto',
        direction: 'rtl'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px',
          borderBottom: `1px solid ${theme.hint_color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: theme.text_color
          }}>
            🗺️ תכנון מסלול
          </h3>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '24px',
              color: theme.hint_color,
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        {/* Driver Info */}
        {assignedDriver && (
          <div style={{
            padding: '16px',
            backgroundColor: theme.secondary_bg_color,
            margin: '16px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{ fontSize: '32px' }}>👨‍🚚</div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: theme.text_color }}>
                {assignedDriver.name}
              </div>
              <div style={{ fontSize: '12px', color: theme.hint_color }}>
                נהג מוקצה
              </div>
            </div>
          </div>
        )}

        {/* Optimization Options */}
        <div style={{ padding: '16px' }}>
          <h4 style={{
            margin: '0 0 12px 0',
            fontSize: '16px',
            color: theme.text_color
          }}>
            הגדרות אופטימיזציה
          </h4>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                color: theme.hint_color,
                marginBottom: '4px'
              }}>
                סוג רכב
              </label>
              <select
                value={optimizationOptions.vehicleType}
                onChange={(e) => setOptimizationOptions(prev => ({
                  ...prev,
                  vehicleType: e.target.value as any
                }))}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.hint_color}40`,
                  backgroundColor: theme.secondary_bg_color,
                  color: theme.text_color
                }}
              >
                <option value="car">רכב</option>
                <option value="motorcycle">אופנוע</option>
                <option value="truck">משאית</option>
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                color: theme.hint_color,
                marginBottom: '4px'
              }}>
                מקסימום עצירות
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={optimizationOptions.maxStops}
                onChange={(e) => setOptimizationOptions(prev => ({
                  ...prev,
                  maxStops: parseInt(e.target.value)
                }))}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.hint_color}40`,
                  backgroundColor: theme.secondary_bg_color,
                  color: theme.text_color
                }}
              />
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <input
              type="checkbox"
              id="traffic"
              checked={optimizationOptions.trafficConsideration}
              onChange={(e) => setOptimizationOptions(prev => ({
                ...prev,
                trafficConsideration: e.target.checked
              }))}
            />
            <label htmlFor="traffic" style={{
              fontSize: '14px',
              color: theme.text_color
            }}>
              התחשב בתנועה
            </label>
          </div>
        </div>

        {/* Task Selection */}
        <div style={{ padding: '16px' }}>
          <h4 style={{
            margin: '0 0 12px 0',
            fontSize: '16px',
            color: theme.text_color
          }}>
            בחירת משימות ({selectedTasks.length}/{tasks.length})
          </h4>

          <div style={{
            maxHeight: '200px',
            overflowY: 'auto',
            border: `1px solid ${theme.hint_color}20`,
            borderRadius: '8px',
            backgroundColor: theme.secondary_bg_color
          }}>
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => handleTaskSelection(task.id)}
                style={{
                  padding: '12px',
                  borderBottom: `1px solid ${theme.hint_color}10`,
                  cursor: 'pointer',
                  backgroundColor: selectedTasks.includes(task.id)
                    ? theme.button_color + '20'
                    : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedTasks.includes(task.id)}
                  onChange={() => handleTaskSelection(task.id)}
                />
                <span style={{ fontSize: '16px' }}>
                  {getPriorityIcon(task.priority)}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: theme.text_color
                  }}>
                    {task.title}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: theme.hint_color
                  }}>
                    📍 {task.location}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Optimization Results */}
        {optimizationResult && (
          <div style={{
            padding: '16px',
            backgroundColor: theme.secondary_bg_color,
            margin: '16px',
            borderRadius: '12px'
          }}>
            <h4 style={{
              margin: '0 0 12px 0',
              fontSize: '16px',
              color: theme.text_color
            }}>
              תוצאות אופטימיזציה
            </h4>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div style={{
                padding: '12px',
                backgroundColor: theme.bg_color,
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#34c759'
                }}>
                  {formatDistance(optimizationResult.totalDistance)}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: theme.hint_color
                }}>
                  מרחק כולל
                </div>
              </div>

              <div style={{
                padding: '12px',
                backgroundColor: theme.bg_color,
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#007aff'
                }}>
                  {formatTime(optimizationResult.estimatedTime)}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: theme.hint_color
                }}>
                  זמן משוער
                </div>
              </div>
            </div>

            {(optimizationResult.savings.distance > 0 || optimizationResult.savings.time > 0) && (
              <div style={{
                padding: '12px',
                backgroundColor: '#34c75920',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#34c759',
                  fontWeight: '600'
                }}>
                  חיסכון: {formatDistance(optimizationResult.savings.distance)} • {formatTime(optimizationResult.savings.time)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{
          padding: '16px',
          borderTop: `1px solid ${theme.hint_color}20`,
          display: 'flex',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            disabled={isOptimizing}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: theme.secondary_bg_color,
              color: theme.text_color,
              border: `1px solid ${theme.hint_color}40`,
              borderRadius: '8px',
              fontSize: '16px',
              cursor: isOptimizing ? 'not-allowed' : 'pointer',
              opacity: isOptimizing ? 0.6 : 1
            }}
          >
            ביטול
          </button>

          <button
            onClick={optimizeRoute}
            disabled={selectedTasks.length === 0 || isOptimizing}
            style={{
              flex: 2,
              padding: '12px',
              backgroundColor: selectedTasks.length > 0 && !isOptimizing
                ? theme.button_color
                : theme.hint_color,
              color: theme.button_text_color,
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: selectedTasks.length > 0 && !isOptimizing
                ? 'pointer'
                : 'not-allowed',
              opacity: selectedTasks.length === 0 || isOptimizing ? 0.6 : 1
            }}
          >
            {isOptimizing ? 'מחשב מסלול...' : 'אופטימיזציה'}
          </button>
        </div>
      </div>
    </div>
  );
}