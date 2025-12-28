import React, { useState, useEffect } from 'react';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { Text } from '../atoms/Typography';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/design-system';
import { logger } from '../../lib/logger';

export interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: {
    name?: string;
    username?: string;
    bio?: string;
    location?: string;
    website?: string;
    photo_url?: string;
  };
  onSave: (updatedProfile: {
    name?: string;
    username?: string;
    bio?: string;
    location?: string;
    website?: string;
    photo_url?: string;
  }) => Promise<void>;
}

export function EditProfileModal({
  isOpen,
  onClose,
  currentProfile,
  onSave,
}: EditProfileModalProps) {
  const [name, setName] = useState(currentProfile.name || '');
  const [username, setUsername] = useState(currentProfile.username || '');
  const [bio, setBio] = useState(currentProfile.bio || '');
  const [location, setLocation] = useState(currentProfile.location || '');
  const [website, setWebsite] = useState(currentProfile.website || '');
  const [photoUrl, setPhotoUrl] = useState(currentProfile.photo_url || '');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(currentProfile.name || '');
      setUsername(currentProfile.username || '');
      setBio(currentProfile.bio || '');
      setLocation(currentProfile.location || '');
      setWebsite(currentProfile.website || '');
      setPhotoUrl(currentProfile.photo_url || '');
      setErrors({});
    }
  }, [isOpen, currentProfile]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (username && (username.length < 3 || username.length > 20)) {
      newErrors.username = 'Username must be 3-20 characters';
    }

    if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (bio && bio.length > 160) {
      newErrors.bio = 'Bio must be 160 characters or less';
    }

    if (website && website.trim() && !isValidUrl(website)) {
      newErrors.website = 'Please enter a valid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim() || undefined,
        username: username.trim() || undefined,
        bio: bio.trim() || undefined,
        location: location.trim() || undefined,
        website: website.trim() || undefined,
        photo_url: photoUrl.trim() || undefined,
      });
      onClose();
    } catch (error) {
      logger.error('Failed to save profile:', error);
      setErrors({ general: 'Failed to save profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !saving) {
      onClose();
    }
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: spacing.lg,
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: colors.ui.card,
    borderRadius: borderRadius['2xl'],
    maxWidth: '540px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: shadows.xl,
    border: `1px solid ${colors.border.primary}`,
  };

  const headerStyle: React.CSSProperties = {
    padding: spacing.xl,
    borderBottom: `1px solid ${colors.border.primary}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const bodyStyle: React.CSSProperties = {
    padding: spacing.xl,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  };

  const footerStyle: React.CSSProperties = {
    padding: spacing.xl,
    borderTop: `1px solid ${colors.border.primary}`,
    display: 'flex',
    gap: spacing.md,
    justifyContent: 'flex-end',
  };

  const fieldStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  };

  const errorStyle: React.CSSProperties = {
    fontSize: typography.fontSize.xs,
    color: colors.status.error,
    marginTop: spacing.xs,
  };

  const charCountStyle: React.CSSProperties = {
    fontSize: typography.fontSize.xs,
    color: bio.length > 160 ? colors.status.error : colors.text.secondary,
    textAlign: 'right',
  };

  return (
    <div style={overlayStyle} onClick={handleBackdropClick}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <Text variant="h3" weight="bold" style={{ color: colors.text.primary }}>
            Edit Profile
          </Text>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.text.secondary,
              fontSize: '24px',
              cursor: saving ? 'not-allowed' : 'pointer',
              padding: spacing.xs,
              opacity: saving ? 0.5 : 1,
            }}
          >
            ✕
          </button>
        </div>

        <div style={bodyStyle}>
          {errors.general && (
            <div
              style={{
                padding: spacing.md,
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${colors.status.error}`,
                borderRadius: borderRadius.md,
                color: colors.status.error,
                fontSize: typography.fontSize.sm,
              }}
            >
              {errors.general}
            </div>
          )}

          <div style={fieldStyle}>
            <label style={labelStyle}>Name</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              disabled={saving}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Username</label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={saving}
            />
            {errors.username && <div style={errorStyle}>{errors.username}</div>}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself"
              disabled={saving}
              maxLength={200}
              rows={4}
              style={{
                width: '100%',
                padding: spacing.md,
                backgroundColor: colors.ui.input,
                border: `1px solid ${errors.bio ? colors.status.error : colors.border.primary}`,
                borderRadius: borderRadius.md,
                color: colors.text.primary,
                fontSize: typography.fontSize.base,
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
            <div style={charCountStyle}>{bio.length}/160</div>
            {errors.bio && <div style={errorStyle}>{errors.bio}</div>}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Location</label>
            <Input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Country"
              disabled={saving}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Website</label>
            <Input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              disabled={saving}
            />
            {errors.website && <div style={errorStyle}>{errors.website}</div>}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Profile Photo URL</label>
            <Input
              type="text"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              disabled={saving}
            />
            <Text variant="small" color="secondary" style={{ marginTop: spacing.xs }}>
              Enter a URL to your profile photo
            </Text>
          </div>
        </div>

        <div style={footerStyle}>
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
