import React, { useState, useEffect } from 'react';
import { DataStore, BusinessType } from '../data/types';
import { useTelegramUI } from '../hooks/useTelegramUI';

interface BusinessTypeManagerProps {
  dataStore: DataStore;
  onClose: () => void;
}

export function BusinessTypeManager({ dataStore, onClose }: BusinessTypeManagerProps) {
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingType, setEditingType] = useState<BusinessType | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    type_value: '',
    label_hebrew: '',
    label_english: '',
    icon: '🏢',
    description: ''
  });
  const { theme, haptic } = useTelegramUI();

  useEffect(() => {
    loadBusinessTypes();
  }, []);

  const loadBusinessTypes = async () => {
    setLoading(true);
    try {
      if (dataStore.listBusinessTypes) {
        const types = await dataStore.listBusinessTypes();
        setBusinessTypes(types);
      }
    } catch (error) {
      console.error('Failed to load business types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.type_value || !formData.label_hebrew || !formData.label_english) {
      alert('נא למלא את כל השדות החובה');
      return;
    }

    try {
      if (dataStore.createBusinessType) {
        await dataStore.createBusinessType({
          type_value: formData.type_value.toLowerCase().replace(/\s+/g, '_'),
          label_hebrew: formData.label_hebrew,
          label_english: formData.label_english,
          icon: formData.icon || '🏢',
          description: formData.description,
          is_system_default: false,
          active: true,
          display_order: businessTypes.length + 1
        });

        haptic();
        setFormData({
          type_value: '',
          label_hebrew: '',
          label_english: '',
          icon: '🏢',
          description: ''
        });
        setShowCreateForm(false);
        await loadBusinessTypes();
      }
    } catch (error) {
      console.error('Failed to create business type:', error);
      alert('שגיאה ביצירת סוג עסק');
    }
  };

  const handleUpdate = async () => {
    if (!editingType) return;

    try {
      if (dataStore.updateBusinessType) {
        await dataStore.updateBusinessType(editingType.id, {
          label_hebrew: editingType.label_hebrew,
          label_english: editingType.label_english,
          icon: editingType.icon,
          description: editingType.description,
          display_order: editingType.display_order
        });

        haptic();
        setEditingType(null);
        await loadBusinessTypes();
      }
    } catch (error) {
      console.error('Failed to update business type:', error);
      alert('שגיאה בעדכון סוג עסק');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק סוג עסק זה?')) return;

    try {
      if (dataStore.deleteBusinessType) {
        await dataStore.deleteBusinessType(id);
        haptic();
        await loadBusinessTypes();
      }
    } catch (error) {
      console.error('Failed to delete business type:', error);
      alert('שגיאה במחיקת סוג עסק');
    }
  };

  if (loading) {
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
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: theme.bg_color,
          padding: '40px',
          borderRadius: '16px',
          textAlign: 'center',
          color: theme.text_color
        }}>
          טוען סוגי עסקים...
        </div>
      </div>
    );
  }

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
        <div style={{
          padding: '16px',
          borderBottom: `1px solid ${theme.hint_color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: theme.text_color
          }}>
            🏷️ ניהול סוגי עסקים
          </h2>
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

        <div style={{ padding: '16px' }}>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: theme.button_color,
              color: theme.button_text_color,
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              marginBottom: '16px'
            }}
          >
            {showCreateForm ? '✕ ביטול' : '+ צור סוג עסק חדש'}
          </button>

          {showCreateForm && (
            <div style={{
              padding: '16px',
              backgroundColor: theme.secondary_bg_color,
              borderRadius: '12px',
              marginBottom: '16px'
            }}>
              <h3 style={{
                margin: '0 0 12px 0',
                fontSize: '16px',
                fontWeight: '600',
                color: theme.text_color
              }}>
                סוג עסק חדש
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="ערך (אנגלית, לדוגמה: my_business)"
                  value={formData.type_value}
                  onChange={(e) => setFormData({ ...formData, type_value: e.target.value })}
                  style={{
                    padding: '10px',
                    backgroundColor: theme.bg_color,
                    border: `1px solid ${theme.hint_color}40`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: theme.text_color
                  }}
                />
                <input
                  type="text"
                  placeholder="שם בעברית *"
                  value={formData.label_hebrew}
                  onChange={(e) => setFormData({ ...formData, label_hebrew: e.target.value })}
                  style={{
                    padding: '10px',
                    backgroundColor: theme.bg_color,
                    border: `1px solid ${theme.hint_color}40`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: theme.text_color
                  }}
                />
                <input
                  type="text"
                  placeholder="Name in English *"
                  value={formData.label_english}
                  onChange={(e) => setFormData({ ...formData, label_english: e.target.value })}
                  style={{
                    padding: '10px',
                    backgroundColor: theme.bg_color,
                    border: `1px solid ${theme.hint_color}40`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: theme.text_color
                  }}
                />
                <input
                  type="text"
                  placeholder="אייקון (אימוג'י)"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  style={{
                    padding: '10px',
                    backgroundColor: theme.bg_color,
                    border: `1px solid ${theme.hint_color}40`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: theme.text_color
                  }}
                />
                <textarea
                  placeholder="תיאור (אופציונלי)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  style={{
                    padding: '10px',
                    backgroundColor: theme.bg_color,
                    border: `1px solid ${theme.hint_color}40`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: theme.text_color,
                    resize: 'vertical'
                  }}
                />
                <button
                  onClick={handleCreate}
                  style={{
                    padding: '10px',
                    backgroundColor: theme.button_color,
                    color: theme.button_text_color,
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  שמור
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {businessTypes.map((type) => (
              <div
                key={type.id}
                style={{
                  padding: '16px',
                  backgroundColor: theme.secondary_bg_color,
                  borderRadius: '12px',
                  border: `1px solid ${theme.hint_color}20`
                }}
              >
                {editingType?.id === type.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input
                      type="text"
                      value={editingType.label_hebrew}
                      onChange={(e) => setEditingType({ ...editingType, label_hebrew: e.target.value })}
                      style={{
                        padding: '8px',
                        backgroundColor: theme.bg_color,
                        border: `1px solid ${theme.hint_color}40`,
                        borderRadius: '6px',
                        fontSize: '14px',
                        color: theme.text_color
                      }}
                    />
                    <input
                      type="text"
                      value={editingType.label_english}
                      onChange={(e) => setEditingType({ ...editingType, label_english: e.target.value })}
                      style={{
                        padding: '8px',
                        backgroundColor: theme.bg_color,
                        border: `1px solid ${theme.hint_color}40`,
                        borderRadius: '6px',
                        fontSize: '14px',
                        color: theme.text_color
                      }}
                    />
                    <input
                      type="text"
                      value={editingType.icon || ''}
                      onChange={(e) => setEditingType({ ...editingType, icon: e.target.value })}
                      style={{
                        padding: '8px',
                        backgroundColor: theme.bg_color,
                        border: `1px solid ${theme.hint_color}40`,
                        borderRadius: '6px',
                        fontSize: '14px',
                        color: theme.text_color
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={handleUpdate}
                        style={{
                          flex: 1,
                          padding: '8px',
                          backgroundColor: theme.button_color,
                          color: theme.button_text_color,
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          cursor: 'pointer'
                        }}
                      >
                        שמור
                      </button>
                      <button
                        onClick={() => setEditingType(null)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          backgroundColor: theme.secondary_bg_color,
                          color: theme.text_color,
                          border: `1px solid ${theme.hint_color}40`,
                          borderRadius: '6px',
                          fontSize: '14px',
                          cursor: 'pointer'
                        }}
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <div>
                        <h4 style={{
                          margin: '0 0 4px 0',
                          fontSize: '16px',
                          fontWeight: '600',
                          color: theme.text_color
                        }}>
                          {type.icon} {type.label_hebrew}
                        </h4>
                        <p style={{
                          margin: 0,
                          fontSize: '12px',
                          color: theme.hint_color
                        }}>
                          {type.label_english} • {type.type_value}
                        </p>
                        {type.description && (
                          <p style={{
                            margin: '4px 0 0 0',
                            fontSize: '12px',
                            color: theme.hint_color
                          }}>
                            {type.description}
                          </p>
                        )}
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {type.is_system_default && (
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            backgroundColor: theme.button_color + '20',
                            color: theme.button_color,
                            fontSize: '10px',
                            fontWeight: '600'
                          }}>
                            מערכת
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setEditingType(type)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: theme.button_color,
                          color: theme.button_text_color,
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        ערוך
                      </button>
                      {!type.is_system_default && (
                        <button
                          onClick={() => handleDelete(type.id)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#ff3b3020',
                            color: '#ff3b30',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          מחק
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
