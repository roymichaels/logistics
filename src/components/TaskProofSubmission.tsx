import React, { useState } from 'react';
import { ImageUpload } from './ImageUpload';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { Task } from '../data/types';

interface TaskProofSubmissionProps {
  task: Task;
  onSubmit: (proof: TaskProof) => Promise<void>;
  onCancel: () => void;
}

interface TaskProof {
  taskId: string;
  images: File[];
  notes: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  timestamp: Date;
}

export function TaskProofSubmission({ task, onSubmit, onCancel }: TaskProofSubmissionProps) {
  const [images, setImages] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { theme, haptic } = useTelegramUI();

  React.useEffect(() => {
    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          logger.warn('Location access denied:', error);
          setLocationError('לא ניתן לקבל מיקום נוכחי');
        }
      );
    }
  }, []);

  const handleImageUpload = (file: File) => {
    setImages(prev => [...prev, file]);
  };

  const handleSubmit = async () => {
    if (images.length === 0) {
      haptic();
      return;
    }

    setIsSubmitting(true);
    try {
      const proof: TaskProof = {
        taskId: task.id,
        images,
        notes,
        location: location || undefined,
        timestamp: new Date()
      };

      await onSubmit(proof);
      haptic();
    } catch (error) {
      logger.error('Failed to submit proof:', error);
      haptic();
    } finally {
      setIsSubmitting(false);
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
      alignItems: 'flex-end',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: theme.bg_color,
        borderTopLeftRadius: '16px',
        borderTopRightRadius: '16px',
        width: '100%',
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
            fontSize: '18px',
            fontWeight: '600',
            color: theme.text_color
          }}>
            הוכחת ביצוע משימה
          </h3>
          <button
            onClick={onCancel}
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

        {/* Task Info */}
        <div style={{
          padding: '16px',
          backgroundColor: theme.secondary_bg_color,
          margin: '16px',
          borderRadius: '12px'
        }}>
          <h4 style={{
            margin: '0 0 8px 0',
            fontSize: '16px',
            color: theme.text_color
          }}>
            {task.title}
          </h4>
          <p style={{
            margin: '0 0 8px 0',
            fontSize: '14px',
            color: theme.hint_color
          }}>
            {task.description}
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: theme.hint_color
          }}>
            <span>📍 {task.location}</span>
            <span>⏰ {new Date(task.due_date).toLocaleDateString('he-IL')}</span>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '16px' }}>
          {/* Image Upload */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: theme.text_color
            }}>
              תמונות הוכחה *
            </label>
            <ImageUpload
              onUpload={handleImageUpload}
              maxFiles={5}
              placeholder="הוסף תמונות של המשימה שבוצעה"
              disabled={isSubmitting}
            />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: theme.text_color
            }}>
              הערות נוספות
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הוסף הערות או פרטים נוספים על ביצוע המשימה..."
              disabled={isSubmitting}
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                border: `1px solid ${theme.hint_color}40`,
                borderRadius: '8px',
                backgroundColor: theme.secondary_bg_color,
                color: theme.text_color,
                fontSize: '14px',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Location Info */}
          <div style={{
            padding: '12px',
            backgroundColor: location ? '#34c75920' : '#ff3b3020',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '16px' }}>
              {location ? '📍' : '❌'}
            </span>
            <div>
              <div style={{
                fontSize: '12px',
                color: theme.text_color,
                fontWeight: '600'
              }}>
                {location ? 'מיקום נוכחי נקבע' : 'לא ניתן לקבל מיקום'}
              </div>
              <div style={{
                fontSize: '11px',
                color: theme.hint_color
              }}>
                {location
                  ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                  : locationError || 'נדרש אישור גישה למיקום'
                }
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '12px',
            paddingBottom: '16px'
          }}>
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: theme.secondary_bg_color,
                color: theme.text_color,
                border: `1px solid ${theme.hint_color}40`,
                borderRadius: '8px',
                fontSize: '16px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.6 : 1
              }}
            >
              ביטול
            </button>
            <button
              onClick={handleSubmit}
              disabled={images.length === 0 || isSubmitting}
              style={{
                flex: 2,
                padding: '12px',
                backgroundColor: images.length > 0 && !isSubmitting ? theme.button_color : theme.hint_color,
                color: theme.button_text_color,
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: images.length > 0 && !isSubmitting ? 'pointer' : 'not-allowed',
                opacity: images.length === 0 || isSubmitting ? 0.6 : 1
              }}
            >
              {isSubmitting ? 'שולח...' : 'שלח הוכחת ביצוע'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}