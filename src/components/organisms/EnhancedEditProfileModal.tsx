import React, { useState, useEffect } from 'react';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { Text } from '../atoms/Typography';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/design-system';
import { logger } from '../../lib/logger';
import { isValidUsername, isWalletAddress, extractUsername } from '../../lib/usernames';

export interface EnhancedProfileData {
  name?: string;
  username?: string;
  bio?: string;
  tagline?: string;
  location?: string;
  website?: string;
  photo_url?: string;
  banner_url?: string;
  social_links?: Record<string, string>;
  interests?: string[];
  skills?: string[];
  profile_visibility?: 'public' | 'followers' | 'private';
  hide_followers?: boolean;
  hide_following?: boolean;
}

export interface EnhancedEditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: EnhancedProfileData;
  onSave: (updatedProfile: EnhancedProfileData) => Promise<void>;
  role?: string;
}

const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram', icon: '📷', placeholder: 'username' },
  { key: 'twitter', label: 'Twitter/X', icon: '𝕏', placeholder: 'username' },
  { key: 'linkedin', label: 'LinkedIn', icon: '💼', placeholder: 'profile-url' },
  { key: 'github', label: 'GitHub', icon: '👨‍💻', placeholder: 'username' },
  { key: 'facebook', label: 'Facebook', icon: '👥', placeholder: 'profile-url' },
];

export function EnhancedEditProfileModal({
  isOpen,
  onClose,
  currentProfile,
  onSave,
  role,
}: EnhancedEditProfileModalProps) {
  const [name, setName] = useState(currentProfile.name || '');
  const [username, setUsername] = useState(currentProfile.username || '');
  const [bio, setBio] = useState(currentProfile.bio || '');
  const [tagline, setTagline] = useState(currentProfile.tagline || '');
  const [location, setLocation] = useState(currentProfile.location || '');
  const [website, setWebsite] = useState(currentProfile.website || '');
  const [photoUrl, setPhotoUrl] = useState(currentProfile.photo_url || '');
  const [bannerUrl, setBannerUrl] = useState(currentProfile.banner_url || '');
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>(currentProfile.social_links || {});
  const [interestsInput, setInterestsInput] = useState(currentProfile.interests?.join(', ') || '');
  const [skillsInput, setSkillsInput] = useState(currentProfile.skills?.join(', ') || '');
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'followers' | 'private'>(
    currentProfile.profile_visibility || 'public'
  );
  const [hideFollowers, setHideFollowers] = useState(currentProfile.hide_followers || false);
  const [hideFollowing, setHideFollowing] = useState(currentProfile.hide_following || false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'social' | 'privacy'>('basic');

  useEffect(() => {
    if (isOpen) {
      setName(currentProfile.name || '');
      setUsername(currentProfile.username || '');
      setBio(currentProfile.bio || '');
      setTagline(currentProfile.tagline || '');
      setLocation(currentProfile.location || '');
      setWebsite(currentProfile.website || '');
      setPhotoUrl(currentProfile.photo_url || '');
      setBannerUrl(currentProfile.banner_url || '');
      setSocialLinks(currentProfile.social_links || {});
      setInterestsInput(currentProfile.interests?.join(', ') || '');
      setSkillsInput(currentProfile.skills?.join(', ') || '');
      setProfileVisibility(currentProfile.profile_visibility || 'public');
      setHideFollowers(currentProfile.hide_followers || false);
      setHideFollowing(currentProfile.hide_following || false);
      setErrors({});
      setActiveTab('basic');
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

    if (username) {
      const cleanUsername = extractUsername(username);

      if (isWalletAddress(cleanUsername)) {
        newErrors.username = 'Wallet addresses cannot be used as usernames';
      } else if (cleanUsername.length < 3 || cleanUsername.length > 20) {
        newErrors.username = 'Username must be 3-20 characters';
      } else if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
        newErrors.username = 'Username can only contain letters, numbers, and underscores';
      }
    }

    if (bio && bio.length > 160) {
      newErrors.bio = 'Bio must be 160 characters or less';
    }

    if (tagline && tagline.length > 60) {
      newErrors.tagline = 'Tagline must be 60 characters or less';
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
      const cleanUsername = username.trim() ? extractUsername(username.trim()) : undefined;

      const interests = interestsInput
        .split(',')
        .map(i => i.trim())
        .filter(i => i.length > 0);

      const skills = skillsInput
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const cleanedSocialLinks: Record<string, string> = {};
      Object.entries(socialLinks).forEach(([key, value]) => {
        if (value && value.trim()) {
          cleanedSocialLinks[key] = value.trim();
        }
      });

      await onSave({
        name: name.trim() || undefined,
        username: cleanUsername,
        bio: bio.trim() || undefined,
        tagline: tagline.trim() || undefined,
        location: location.trim() || undefined,
        website: website.trim() || undefined,
        photo_url: photoUrl.trim() || undefined,
        banner_url: bannerUrl.trim() || undefined,
        social_links: Object.keys(cleanedSocialLinks).length > 0 ? cleanedSocialLinks : undefined,
        interests: interests.length > 0 ? interests : undefined,
        skills: skills.length > 0 ? skills : undefined,
        profile_visibility: profileVisibility,
        hide_followers: hideFollowers,
        hide_following: hideFollowing,
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

  const updateSocialLink = (platform: string, value: string) => {
    setSocialLinks(prev => ({
      ...prev,
      [platform]: value,
    }));
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
    maxWidth: '640px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: shadows.xl,
    border: `1px solid ${colors.border.primary}`,
    display: 'flex',
    flexDirection: 'column',
  };

  const headerStyle: React.CSSProperties = {
    padding: spacing.xl,
    borderBottom: `1px solid ${colors.border.primary}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
  };

  const tabsStyle: React.CSSProperties = {
    display: 'flex',
    gap: spacing.md,
    padding: `0 ${spacing.xl}`,
    borderBottom: `1px solid ${colors.border.primary}`,
    flexShrink: 0,
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: `${spacing.md} ${spacing.lg}`,
    background: 'transparent',
    border: 'none',
    borderBottom: `2px solid ${isActive ? colors.primary.DEFAULT : 'transparent'}`,
    color: isActive ? colors.text.primary : colors.text.secondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  const bodyStyle: React.CSSProperties = {
    padding: spacing.xl,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
    overflowY: 'auto',
    flex: 1,
  };

  const footerStyle: React.CSSProperties = {
    padding: spacing.xl,
    borderTop: `1px solid ${colors.border.primary}`,
    display: 'flex',
    gap: spacing.md,
    justifyContent: 'flex-end',
    flexShrink: 0,
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

  const charCountStyle = (current: number, max: number): React.CSSProperties => ({
    fontSize: typography.fontSize.xs,
    color: current > max ? colors.status.error : colors.text.secondary,
    textAlign: 'right',
  });

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

        <div style={tabsStyle}>
          <button
            onClick={() => setActiveTab('basic')}
            style={tabStyle(activeTab === 'basic')}
          >
            Basic Info
          </button>
          <button
            onClick={() => setActiveTab('social')}
            style={tabStyle(activeTab === 'social')}
          >
            Social & Interests
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            style={tabStyle(activeTab === 'privacy')}
          >
            Privacy
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

          {activeTab === 'basic' && (
            <>
              <div style={fieldStyle}>
                <label style={labelStyle}>Profile Photo URL</label>
                <Input
                  type="text"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  disabled={saving}
                />
                <Text variant="small" color="secondary">
                  Enter a URL to your profile photo
                </Text>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Banner Photo URL</label>
                <Input
                  type="text"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="https://example.com/banner.jpg"
                  disabled={saving}
                />
                <Text variant="small" color="secondary">
                  Enter a URL to your profile banner (cover photo)
                </Text>
              </div>

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
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    position: 'absolute',
                    left: spacing.md,
                    color: colors.text.secondary,
                    fontSize: typography.fontSize.base,
                    pointerEvents: 'none',
                    zIndex: 1
                  }}>
                    @
                  </span>
                  <Input
                    type="text"
                    value={username.startsWith('@') ? username.slice(1) : username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    disabled={saving}
                    style={{ paddingLeft: '32px' }}
                  />
                </div>
                {errors.username && <div style={errorStyle}>{errors.username}</div>}
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Tagline</label>
                <Input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="A short one-liner about you"
                  disabled={saving}
                  maxLength={60}
                />
                <div style={charCountStyle(tagline.length, 60)}>{tagline.length}/60</div>
                {errors.tagline && <div style={errorStyle}>{errors.tagline}</div>}
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
                <div style={charCountStyle(bio.length, 160)}>{bio.length}/160</div>
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
            </>
          )}

          {activeTab === 'social' && (
            <>
              <div style={fieldStyle}>
                <label style={labelStyle}>Social Media Links</label>
                <Text variant="small" color="secondary" style={{ marginBottom: spacing.sm }}>
                  Connect your social media accounts
                </Text>
                {SOCIAL_PLATFORMS.map((platform) => (
                  <div key={platform.key} style={{ marginBottom: spacing.md }}>
                    <label style={{ ...labelStyle, fontSize: typography.fontSize.xs, marginBottom: spacing.xs, display: 'block' }}>
                      {platform.icon} {platform.label}
                    </label>
                    <Input
                      type="text"
                      value={socialLinks[platform.key] || ''}
                      onChange={(e) => updateSocialLink(platform.key, e.target.value)}
                      placeholder={platform.placeholder}
                      disabled={saving}
                    />
                  </div>
                ))}
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Interests</label>
                <Input
                  type="text"
                  value={interestsInput}
                  onChange={(e) => setInterestsInput(e.target.value)}
                  placeholder="Photography, Travel, Technology (comma-separated)"
                  disabled={saving}
                />
                <Text variant="small" color="secondary">
                  Separate multiple interests with commas
                </Text>
              </div>

              {(role === 'business_owner' || role === 'manager' || role === 'warehouse' || role === 'driver') && (
                <div style={fieldStyle}>
                  <label style={labelStyle}>Skills / Expertise</label>
                  <Input
                    type="text"
                    value={skillsInput}
                    onChange={(e) => setSkillsInput(e.target.value)}
                    placeholder="Management, Logistics, Customer Service (comma-separated)"
                    disabled={saving}
                  />
                  <Text variant="small" color="secondary">
                    Separate multiple skills with commas
                  </Text>
                </div>
              )}
            </>
          )}

          {activeTab === 'privacy' && (
            <>
              <div style={fieldStyle}>
                <label style={labelStyle}>Profile Visibility</label>
                <select
                  value={profileVisibility}
                  onChange={(e) => setProfileVisibility(e.target.value as any)}
                  disabled={saving}
                  style={{
                    width: '100%',
                    padding: spacing.md,
                    backgroundColor: colors.ui.input,
                    border: `1px solid ${colors.border.primary}`,
                    borderRadius: borderRadius.md,
                    color: colors.text.primary,
                    fontSize: typography.fontSize.base,
                  }}
                >
                  <option value="public">Public - Anyone can view</option>
                  <option value="followers">Followers Only</option>
                  <option value="private">Private - Only me</option>
                </select>
              </div>

              <div style={fieldStyle}>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: spacing.sm, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={hideFollowers}
                    onChange={(e) => setHideFollowers(e.target.checked)}
                    disabled={saving}
                    style={{ cursor: 'pointer' }}
                  />
                  Hide followers list from others
                </label>
              </div>

              <div style={fieldStyle}>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: spacing.sm, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={hideFollowing}
                    onChange={(e) => setHideFollowing(e.target.checked)}
                    disabled={saving}
                    style={{ cursor: 'pointer' }}
                  />
                  Hide following list from others
                </label>
              </div>

              <div style={{
                padding: spacing.md,
                backgroundColor: colors.ui.secondary,
                borderRadius: borderRadius.md,
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
              }}>
                <strong>Privacy Note:</strong> Your profile visibility setting controls who can see your profile content. Even with a private profile, your name and username may still be visible in search results.
              </div>
            </>
          )}
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
