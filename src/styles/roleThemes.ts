/**
 * 🎨 ROLE-BASED THEME SYSTEM
 *
 * Each role gets a unique color scheme that reflects their function:
 * - Driver: Amber/Yellow - Active, on-the-road energy
 * - Dispatcher: Blue/Cyan - Control center coordination
 * - Manager: Emerald/Green - Growth and oversight
 * - Admin: Twitter Blue - Authority and system control
 * - Business Owner: Gold/Bronze - Premium business vibes
 * - Customer/Sales: Teal/Mint - Fresh, customer-friendly
 * - Warehouse: Slate/Gray - Industrial organization
 */

import type { User } from '../data/types';

export interface RoleTheme {
  name: string;
  colors: {
    // Backgrounds
    background: string;
    backgroundSolid: string;
    backgroundDark: string;

    // Cards & Surfaces
    card: string;
    cardBg: string;
    cardHover: string;
    cardBorder: string;
    cardBorderHover: string;
    border: string;

    // Secondary surfaces
    secondary: string;
    secondaryHover: string;

    // Text
    text: string;
    textBright: string;
    muted: string;
    mutedDark: string;
    hint: string;

    // Accent Colors
    primary: string;
    accent: string;
    accentBright: string;
    accentDark: string;
    white: string;

    // Status Colors
    gold: string;
    goldBright: string;
    crimson: string;
    crimsonBright: string;
    success: string;
    successBright: string;
    warning: string;
    warningBright: string;
    error: string;
    errorBright: string;
    info: string;
    infoBright: string;

    // Glows & Effects
    glowPrimary: string;
    glowPrimaryStrong: string;
    glowGold: string;
    glowCrimson: string;

    // Shadows
    shadow: string;
    shadowStrong: string;
    shadowSoft: string;

    // Gradients
    gradientPrimary: string;
    gradientGold: string;
    gradientCrimson: string;
    gradientSuccess: string;
    gradientCard: string;
  };
}

// 🚗 DRIVER THEME - Amber/Yellow
export const DRIVER_THEME: RoleTheme = {
  name: 'Driver',
  colors: {
    background: 'radial-gradient(125% 125% at 50% 0%, rgba(255, 165, 0, 0.55) 0%, rgba(51, 25, 0, 0.95) 45%, #0a0500 100%)',
    backgroundSolid: '#0a0500',
    backgroundDark: 'rgba(51, 25, 0, 0.95)',

    card: 'rgba(51, 30, 5, 0.75)',
    cardBg: '#331e05',
    cardHover: 'rgba(61, 35, 10, 0.85)',
    cardBorder: 'rgba(255, 165, 0, 0.45)',
    cardBorderHover: 'rgba(255, 165, 0, 0.65)',
    border: 'rgba(255, 165, 0, 0.3)',

    secondary: 'rgba(60, 35, 5, 0.7)',
    secondaryHover: 'rgba(70, 40, 10, 0.8)',

    text: '#fff8e7',
    textBright: '#ffffff',
    muted: '#ffca7f',
    mutedDark: 'rgba(255, 202, 127, 0.6)',
    hint: 'rgba(255, 202, 127, 0.4)',

    primary: '#FFA500',
    accent: '#FFA500',
    accentBright: '#FFB733',
    accentDark: '#FF8C00',
    white: '#ffffff',

    gold: '#FFD700',
    goldBright: '#FFE44D',
    crimson: '#ff6b8a',
    crimsonBright: '#ff8aa5',
    success: '#10b981',
    successBright: '#34d399',
    warning: '#f59e0b',
    warningBright: '#fbbf24',
    error: '#ef4444',
    errorBright: '#f87171',
    info: '#3b82f6',
    infoBright: '#60a5fa',

    glowPrimary: '0 0 20px rgba(255, 165, 0, 0.4)',
    glowPrimaryStrong: '0 0 30px rgba(255, 165, 0, 0.6)',
    glowGold: '0 0 20px rgba(255, 215, 0, 0.4)',
    glowCrimson: '0 0 20px rgba(255, 107, 138, 0.3)',

    shadow: '0 20px 40px rgba(51, 25, 0, 0.5)',
    shadowStrong: '0 25px 50px rgba(51, 25, 0, 0.65)',
    shadowSoft: '0 10px 25px rgba(51, 25, 0, 0.35)',

    gradientPrimary: 'linear-gradient(135deg, #FFA500 0%, #FF8C00 100%)',
    gradientGold: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
    gradientCrimson: 'linear-gradient(135deg, #ff6b8a 0%, #e84c6f 100%)',
    gradientSuccess: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    gradientCard: 'linear-gradient(145deg, rgba(51, 30, 5, 0.75) 0%, rgba(61, 35, 10, 0.65) 100%)',
  }
};

// 📡 DISPATCHER THEME - Blue/Cyan
export const DISPATCHER_THEME: RoleTheme = {
  name: 'Dispatcher',
  colors: {
    background: 'radial-gradient(125% 125% at 50% 0%, rgba(14, 165, 233, 0.55) 0%, rgba(2, 20, 35, 0.95) 45%, #000a12 100%)',
    backgroundSolid: '#000a12',
    backgroundDark: 'rgba(2, 20, 35, 0.95)',

    card: 'rgba(5, 25, 40, 0.75)',
    cardBg: '#051928',
    cardHover: 'rgba(10, 30, 50, 0.85)',
    cardBorder: 'rgba(14, 165, 233, 0.45)',
    cardBorderHover: 'rgba(14, 165, 233, 0.65)',
    border: 'rgba(14, 165, 233, 0.3)',

    secondary: 'rgba(8, 28, 45, 0.7)',
    secondaryHover: 'rgba(12, 35, 55, 0.8)',

    text: '#e7f6ff',
    textBright: '#ffffff',
    muted: '#7fc9ff',
    mutedDark: 'rgba(127, 201, 255, 0.6)',
    hint: 'rgba(127, 201, 255, 0.4)',

    primary: '#0EA5E9',
    accent: '#0EA5E9',
    accentBright: '#38bdf8',
    accentDark: '#0284c7',
    white: '#ffffff',

    gold: '#f6c945',
    goldBright: '#ffd966',
    crimson: '#ff6b8a',
    crimsonBright: '#ff8aa5',
    success: '#10b981',
    successBright: '#34d399',
    warning: '#f59e0b',
    warningBright: '#fbbf24',
    error: '#ef4444',
    errorBright: '#f87171',
    info: '#06B6D4',
    infoBright: '#22d3ee',

    glowPrimary: '0 0 20px rgba(14, 165, 233, 0.4)',
    glowPrimaryStrong: '0 0 30px rgba(14, 165, 233, 0.6)',
    glowGold: '0 0 20px rgba(246, 201, 69, 0.3)',
    glowCrimson: '0 0 20px rgba(255, 107, 138, 0.3)',

    shadow: '0 20px 40px rgba(2, 20, 35, 0.5)',
    shadowStrong: '0 25px 50px rgba(2, 20, 35, 0.65)',
    shadowSoft: '0 10px 25px rgba(2, 20, 35, 0.35)',

    gradientPrimary: 'linear-gradient(135deg, #0EA5E9 0%, #0284c7 100%)',
    gradientGold: 'linear-gradient(135deg, #f6c945 0%, #d4a12a 100%)',
    gradientCrimson: 'linear-gradient(135deg, #ff6b8a 0%, #e84c6f 100%)',
    gradientSuccess: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    gradientCard: 'linear-gradient(145deg, rgba(5, 25, 40, 0.75) 0%, rgba(10, 30, 50, 0.65) 100%)',
  }
};

// 🌱 MANAGER THEME - Emerald/Green
export const MANAGER_THEME: RoleTheme = {
  name: 'Manager',
  colors: {
    background: 'radial-gradient(125% 125% at 50% 0%, rgba(16, 185, 129, 0.55) 0%, rgba(2, 25, 15, 0.95) 45%, #000a05 100%)',
    backgroundSolid: '#000a05',
    backgroundDark: 'rgba(2, 25, 15, 0.95)',

    card: 'rgba(5, 30, 20, 0.75)',
    cardBg: '#051e14',
    cardHover: 'rgba(10, 35, 25, 0.85)',
    cardBorder: 'rgba(16, 185, 129, 0.45)',
    cardBorderHover: 'rgba(16, 185, 129, 0.65)',
    border: 'rgba(16, 185, 129, 0.3)',

    secondary: 'rgba(8, 32, 22, 0.7)',
    secondaryHover: 'rgba(12, 38, 27, 0.8)',

    text: '#e7fff5',
    textBright: '#ffffff',
    muted: '#7fffd4',
    mutedDark: 'rgba(127, 255, 212, 0.6)',
    hint: 'rgba(127, 255, 212, 0.4)',

    primary: '#10B981',
    accent: '#10B981',
    accentBright: '#34d399',
    accentDark: '#059669',
    white: '#ffffff',

    gold: '#f6c945',
    goldBright: '#ffd966',
    crimson: '#ff6b8a',
    crimsonBright: '#ff8aa5',
    success: '#10b981',
    successBright: '#34d399',
    warning: '#f59e0b',
    warningBright: '#fbbf24',
    error: '#ef4444',
    errorBright: '#f87171',
    info: '#3b82f6',
    infoBright: '#60a5fa',

    glowPrimary: '0 0 20px rgba(16, 185, 129, 0.4)',
    glowPrimaryStrong: '0 0 30px rgba(16, 185, 129, 0.6)',
    glowGold: '0 0 20px rgba(246, 201, 69, 0.3)',
    glowCrimson: '0 0 20px rgba(255, 107, 138, 0.3)',

    shadow: '0 20px 40px rgba(2, 25, 15, 0.5)',
    shadowStrong: '0 25px 50px rgba(2, 25, 15, 0.65)',
    shadowSoft: '0 10px 25px rgba(2, 25, 15, 0.35)',

    gradientPrimary: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    gradientGold: 'linear-gradient(135deg, #f6c945 0%, #d4a12a 100%)',
    gradientCrimson: 'linear-gradient(135deg, #ff6b8a 0%, #e84c6f 100%)',
    gradientSuccess: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    gradientCard: 'linear-gradient(145deg, rgba(5, 30, 20, 0.75) 0%, rgba(10, 35, 25, 0.65) 100%)',
  }
};

// 👑 ADMIN THEME - Twitter Blue (Infrastructure Owner)
export const ADMIN_THEME: RoleTheme = {
  name: 'Admin',
  colors: {
    background: '#15202B',
    backgroundSolid: '#15202B',
    backgroundDark: '#192734',

    card: '#192734',
    cardBg: '#192734',
    cardHover: '#22303C',
    cardBorder: 'rgba(56, 68, 77, 0.5)',
    cardBorderHover: 'rgba(29, 155, 240, 0.5)',
    border: '#38444D',

    secondary: '#192734',
    secondaryHover: '#22303C',

    text: '#E7E9EA',
    textBright: '#ffffff',
    muted: '#8899A6',
    mutedDark: 'rgba(136, 153, 166, 0.6)',
    hint: 'rgba(136, 153, 166, 0.4)',

    primary: '#1D9BF0',
    accent: '#1D9BF0',
    accentBright: '#1DA1F2',
    accentDark: '#1A8CD8',
    white: '#ffffff',

    gold: '#FFD400',
    goldBright: '#FFE44D',
    crimson: '#F4212E',
    crimsonBright: '#F4585E',
    success: '#00BA7C',
    successBright: '#00D68F',
    warning: '#FFD400',
    warningBright: '#FFE44D',
    error: '#F4212E',
    errorBright: '#F4585E',
    info: '#1D9BF0',
    infoBright: '#1DA1F2',

    glowPrimary: '0 0 20px rgba(29, 155, 240, 0.3)',
    glowPrimaryStrong: '0 0 30px rgba(29, 155, 240, 0.5)',
    glowGold: '0 0 20px rgba(255, 212, 0, 0.3)',
    glowCrimson: '0 0 20px rgba(244, 33, 46, 0.3)',

    shadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
    shadowStrong: '0 4px 12px rgba(0, 0, 0, 0.4)',
    shadowSoft: '0 1px 2px rgba(0, 0, 0, 0.2)',

    gradientPrimary: 'linear-gradient(135deg, #1D9BF0 0%, #1A8CD8 100%)',
    gradientGold: 'linear-gradient(135deg, #FFD400 0%, #FFA500 100%)',
    gradientCrimson: 'linear-gradient(135deg, #F4212E 0%, #C9191E 100%)',
    gradientSuccess: 'linear-gradient(135deg, #00BA7C 0%, #00A368 100%)',
    gradientCard: 'linear-gradient(145deg, #192734 0%, #15202B 100%)',
  }
};

// 💰 BUSINESS OWNER THEME - Gold/Bronze
export const BUSINESS_OWNER_THEME: RoleTheme = {
  name: 'Business Owner',
  colors: {
    background: 'radial-gradient(125% 125% at 50% 0%, rgba(217, 119, 6, 0.55) 0%, rgba(35, 20, 2, 0.95) 45%, #0a0500 100%)',
    backgroundSolid: '#0a0500',
    backgroundDark: 'rgba(35, 20, 2, 0.95)',

    card: 'rgba(40, 25, 5, 0.75)',
    cardBg: '#281905',
    cardHover: 'rgba(50, 30, 10, 0.85)',
    cardBorder: 'rgba(217, 119, 6, 0.45)',
    cardBorderHover: 'rgba(217, 119, 6, 0.65)',
    border: 'rgba(217, 119, 6, 0.3)',

    secondary: 'rgba(45, 27, 7, 0.7)',
    secondaryHover: 'rgba(55, 32, 10, 0.8)',

    text: '#fffae6',
    textBright: '#ffffff',
    muted: '#ffd699',
    mutedDark: 'rgba(255, 214, 153, 0.6)',
    hint: 'rgba(255, 214, 153, 0.4)',

    primary: '#D97706',
    accent: '#D97706',
    accentBright: '#F59E0B',
    accentDark: '#B45309',
    white: '#ffffff',

    gold: '#F59E0B',
    goldBright: '#FCD34D',
    crimson: '#ff6b8a',
    crimsonBright: '#ff8aa5',
    success: '#10b981',
    successBright: '#34d399',
    warning: '#f59e0b',
    warningBright: '#fbbf24',
    error: '#ef4444',
    errorBright: '#f87171',
    info: '#3b82f6',
    infoBright: '#60a5fa',

    glowPrimary: '0 0 20px rgba(217, 119, 6, 0.4)',
    glowPrimaryStrong: '0 0 30px rgba(217, 119, 6, 0.6)',
    glowGold: '0 0 20px rgba(245, 158, 11, 0.4)',
    glowCrimson: '0 0 20px rgba(255, 107, 138, 0.3)',

    shadow: '0 20px 40px rgba(35, 20, 2, 0.5)',
    shadowStrong: '0 25px 50px rgba(35, 20, 2, 0.65)',
    shadowSoft: '0 10px 25px rgba(35, 20, 2, 0.35)',

    gradientPrimary: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
    gradientGold: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    gradientCrimson: 'linear-gradient(135deg, #ff6b8a 0%, #e84c6f 100%)',
    gradientSuccess: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    gradientCard: 'linear-gradient(145deg, rgba(40, 25, 5, 0.75) 0%, rgba(50, 30, 10, 0.65) 100%)',
  }
};

// 🛍️ CUSTOMER/SALES THEME - Teal/Mint
export const CUSTOMER_THEME: RoleTheme = {
  name: 'Customer',
  colors: {
    background: 'radial-gradient(125% 125% at 50% 0%, rgba(20, 184, 166, 0.55) 0%, rgba(2, 25, 22, 0.95) 45%, #000a08 100%)',
    backgroundSolid: '#000a08',
    backgroundDark: 'rgba(2, 25, 22, 0.95)',

    card: 'rgba(5, 30, 27, 0.75)',
    cardBg: '#051e1b',
    cardHover: 'rgba(10, 35, 32, 0.85)',
    cardBorder: 'rgba(20, 184, 166, 0.45)',
    cardBorderHover: 'rgba(20, 184, 166, 0.65)',
    border: 'rgba(20, 184, 166, 0.3)',

    secondary: 'rgba(8, 32, 29, 0.7)',
    secondaryHover: 'rgba(12, 38, 35, 0.8)',

    text: '#e7fffc',
    textBright: '#ffffff',
    muted: '#7ffff0',
    mutedDark: 'rgba(127, 255, 240, 0.6)',
    hint: 'rgba(127, 255, 240, 0.4)',

    primary: '#14B8A6',
    accent: '#14B8A6',
    accentBright: '#2DD4BF',
    accentDark: '#0D9488',
    white: '#ffffff',

    gold: '#f6c945',
    goldBright: '#ffd966',
    crimson: '#ff6b8a',
    crimsonBright: '#ff8aa5',
    success: '#10b981',
    successBright: '#34d399',
    warning: '#f59e0b',
    warningBright: '#fbbf24',
    error: '#ef4444',
    errorBright: '#f87171',
    info: '#3b82f6',
    infoBright: '#60a5fa',

    glowPrimary: '0 0 20px rgba(20, 184, 166, 0.4)',
    glowPrimaryStrong: '0 0 30px rgba(20, 184, 166, 0.6)',
    glowGold: '0 0 20px rgba(246, 201, 69, 0.3)',
    glowCrimson: '0 0 20px rgba(255, 107, 138, 0.3)',

    shadow: '0 20px 40px rgba(2, 25, 22, 0.5)',
    shadowStrong: '0 25px 50px rgba(2, 25, 22, 0.65)',
    shadowSoft: '0 10px 25px rgba(2, 25, 22, 0.35)',

    gradientPrimary: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
    gradientGold: 'linear-gradient(135deg, #f6c945 0%, #d4a12a 100%)',
    gradientCrimson: 'linear-gradient(135deg, #ff6b8a 0%, #e84c6f 100%)',
    gradientSuccess: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    gradientCard: 'linear-gradient(145deg, rgba(5, 30, 27, 0.75) 0%, rgba(10, 35, 32, 0.65) 100%)',
  }
};

// 📦 WAREHOUSE THEME - Slate/Gray
export const WAREHOUSE_THEME: RoleTheme = {
  name: 'Warehouse',
  colors: {
    background: 'radial-gradient(125% 125% at 50% 0%, rgba(100, 116, 139, 0.55) 0%, rgba(15, 18, 22, 0.95) 45%, #030507 100%)',
    backgroundSolid: '#030507',
    backgroundDark: 'rgba(15, 18, 22, 0.95)',

    card: 'rgba(20, 25, 30, 0.75)',
    cardBg: '#14191e',
    cardHover: 'rgba(25, 30, 38, 0.85)',
    cardBorder: 'rgba(100, 116, 139, 0.45)',
    cardBorderHover: 'rgba(100, 116, 139, 0.65)',
    border: 'rgba(100, 116, 139, 0.3)',

    secondary: 'rgba(22, 27, 32, 0.7)',
    secondaryHover: 'rgba(28, 33, 40, 0.8)',

    text: '#f1f5f9',
    textBright: '#ffffff',
    muted: '#cbd5e1',
    mutedDark: 'rgba(203, 213, 225, 0.6)',
    hint: 'rgba(203, 213, 225, 0.4)',

    primary: '#64748B',
    accent: '#64748B',
    accentBright: '#94A3B8',
    accentDark: '#475569',
    white: '#ffffff',

    gold: '#f6c945',
    goldBright: '#ffd966',
    crimson: '#ff6b8a',
    crimsonBright: '#ff8aa5',
    success: '#10b981',
    successBright: '#34d399',
    warning: '#f59e0b',
    warningBright: '#fbbf24',
    error: '#ef4444',
    errorBright: '#f87171',
    info: '#3b82f6',
    infoBright: '#60a5fa',

    glowPrimary: '0 0 20px rgba(100, 116, 139, 0.3)',
    glowPrimaryStrong: '0 0 30px rgba(100, 116, 139, 0.5)',
    glowGold: '0 0 20px rgba(246, 201, 69, 0.3)',
    glowCrimson: '0 0 20px rgba(255, 107, 138, 0.3)',

    shadow: '0 20px 40px rgba(15, 18, 22, 0.5)',
    shadowStrong: '0 25px 50px rgba(15, 18, 22, 0.65)',
    shadowSoft: '0 10px 25px rgba(15, 18, 22, 0.35)',

    gradientPrimary: 'linear-gradient(135deg, #64748B 0%, #475569 100%)',
    gradientGold: 'linear-gradient(135deg, #f6c945 0%, #d4a12a 100%)',
    gradientCrimson: 'linear-gradient(135deg, #ff6b8a 0%, #e84c6f 100%)',
    gradientSuccess: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    gradientCard: 'linear-gradient(145deg, rgba(20, 25, 30, 0.75) 0%, rgba(25, 30, 38, 0.65) 100%)',
  }
};

// Role to Theme mapping
export const ROLE_THEME_MAP: Record<User['role'], RoleTheme> = {
  driver: DRIVER_THEME,
  dispatcher: DISPATCHER_THEME,
  manager: MANAGER_THEME,
  infrastructure_owner: ADMIN_THEME,
  business_owner: BUSINESS_OWNER_THEME,
  sales: CUSTOMER_THEME,
  customer_service: CUSTOMER_THEME,
  warehouse: WAREHOUSE_THEME,
  user: ADMIN_THEME, // Default to admin theme for unassigned users
};

/**
 * Get theme for a specific role
 */
export function getRoleTheme(role: User['role']): RoleTheme {
  return ROLE_THEME_MAP[role] || ADMIN_THEME;
}

/**
 * Get theme colors for a specific role
 */
export function getRoleColors(role: User['role']) {
  return getRoleTheme(role).colors;
}

/**
 * Generate role-specific styles based on theme
 */
export function getRoleStyles(role: User['role']) {
  const colors = getRoleColors(role);

  return {
    pageContainer: {
      minHeight: '100vh',
      background: colors.background,
      padding: '20px',
      paddingBottom: '100px',
      direction: 'rtl' as const
    },

    pageHeader: {
      textAlign: 'center' as const,
      marginBottom: '32px'
    },

    pageTitle: {
      margin: 0,
      fontSize: '28px',
      fontWeight: '700' as const,
      color: colors.text,
      marginBottom: '8px',
      textShadow: colors.glowPrimary
    },

    pageSubtitle: {
      margin: 0,
      fontSize: '14px',
      color: colors.muted,
      fontWeight: '500' as const
    },

    card: {
      background: colors.card,
      border: `1px solid ${colors.cardBorder}`,
      borderRadius: '20px',
      padding: '24px',
      marginBottom: '20px',
      boxShadow: colors.shadow,
      transition: 'all 0.3s ease'
    },

    buttonPrimary: {
      padding: '12px 24px',
      background: colors.gradientPrimary,
      border: 'none',
      borderRadius: '12px',
      color: colors.textBright,
      fontSize: '16px',
      fontWeight: '600' as const,
      cursor: 'pointer',
      boxShadow: colors.glowPrimaryStrong,
      transition: 'all 0.3s ease'
    },

    statBox: {
      background: colors.secondary,
      border: `1px solid ${colors.cardBorder}`,
      borderRadius: '16px',
      padding: '20px',
      textAlign: 'center' as const
    },

    statValue: {
      fontSize: '32px',
      fontWeight: '700' as const,
      color: colors.accent,
      marginBottom: '8px',
      textShadow: colors.glowPrimary
    },

    statLabel: {
      fontSize: '14px',
      color: colors.muted,
      fontWeight: '500' as const,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px'
    },
  };
}
