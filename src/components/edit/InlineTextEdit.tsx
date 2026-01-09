import React, { useState, useRef, useEffect } from 'react';
import { tokens } from '../../styles/tokens';
import { logger } from '../../lib/logger';

interface InlineTextEditProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
  fontSize?: string;
  fontWeight?: string;
  canEdit: boolean;
  emptyText?: string;
}

export function InlineTextEdit({
  value,
  onSave,
  placeholder = 'Click to edit',
  maxLength = 100,
  multiline = false,
  fontSize = '16px',
  fontWeight = '400',
  canEdit,
  emptyText = 'Click to add',
}: InlineTextEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (!canEdit) return;
    setIsEditing(true);
    setError(null);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    setError(null);
  };

  const handleSave = async () => {
    const trimmedValue = editValue.trim();

    if (trimmedValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(trimmedValue);
      setIsEditing(false);
      logger.info('[InlineTextEdit] Saved successfully');
    } catch (err) {
      logger.error('[InlineTextEdit] Save failed', err);
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isEditing) {
    return (
      <div
        onClick={handleStartEdit}
        style={{
          position: 'relative',
          display: 'inline-block',
          cursor: canEdit ? 'pointer' : 'default',
          padding: '4px 8px',
          borderRadius: '6px',
          transition: 'background-color 0.2s',
          ...(canEdit && {
            ':hover': {
              backgroundColor: tokens.colors.bg,
            },
          }),
        }}
        onMouseEnter={(e) => {
          if (canEdit) {
            e.currentTarget.style.backgroundColor = tokens.colors.bg;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span
          style={{
            fontSize,
            fontWeight,
            color: value ? tokens.colors.text : tokens.colors.subtle,
          }}
        >
          {value || emptyText}
        </span>
        {canEdit && (
          <span
            style={{
              marginLeft: '8px',
              fontSize: '14px',
              color: tokens.colors.subtle,
              opacity: 0.6,
            }}
          >
            ✏️
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      {multiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={isSaving}
          style={{
            width: '100%',
            padding: '12px',
            fontSize,
            fontWeight,
            color: tokens.colors.text,
            backgroundColor: tokens.colors.bg,
            border: `2px solid ${error ? tokens.colors.error : tokens.colors.primary}`,
            borderRadius: '8px',
            resize: 'vertical',
            minHeight: '80px',
            fontFamily: 'inherit',
          }}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={isSaving}
          style={{
            width: '100%',
            padding: '12px',
            fontSize,
            fontWeight,
            color: tokens.colors.text,
            backgroundColor: tokens.colors.bg,
            border: `2px solid ${error ? tokens.colors.error : tokens.colors.primary}`,
            borderRadius: '8px',
            fontFamily: 'inherit',
          }}
        />
      )}

      {error && (
        <div
          style={{
            fontSize: '12px',
            color: tokens.colors.error,
            padding: '4px 8px',
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          gap: '8px',
          fontSize: '12px',
        }}
      >
        <button
          onClick={handleSave}
          disabled={isSaving || !editValue.trim()}
          style={{
            padding: '6px 16px',
            backgroundColor: tokens.colors.primary,
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: isSaving || !editValue.trim() ? 'not-allowed' : 'pointer',
            opacity: isSaving || !editValue.trim() ? 0.5 : 1,
            fontWeight: '600',
          }}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={handleCancel}
          disabled={isSaving}
          style={{
            padding: '6px 16px',
            backgroundColor: tokens.colors.bg,
            color: tokens.colors.text,
            border: `1px solid ${tokens.colors.border.default}`,
            borderRadius: '6px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.5 : 1,
          }}
        >
          Cancel
        </button>
        <span
          style={{
            marginLeft: 'auto',
            alignSelf: 'center',
            color: tokens.colors.subtle,
          }}
        >
          {editValue.length}/{maxLength}
        </span>
      </div>
    </div>
  );
}
