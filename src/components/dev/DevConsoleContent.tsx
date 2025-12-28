import React from 'react';
import type { DevTab } from './DevConsoleDrawer';
import { FlagsPanel } from './panels/FlagsPanel';
import { RoutesPanel } from './panels/RoutesPanel';
import { RolesPanel } from './panels/RolesPanel';
import { ShellsPanel } from './panels/ShellsPanel';
import { WireframesPanel } from './panels/WireframesPanel';
import { PagesPanel } from './panels/PagesPanel';
import { MocksPanel } from './panels/MocksPanel';
import { DiagnosticsPanel } from './panels/DiagnosticsPanel';
import { ThemePanel } from './panels/ThemePanel';

interface DevConsoleContentProps {
  activeTab: DevTab;
}

export function DevConsoleContent({ activeTab }: DevConsoleContentProps) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: 'rgba(18, 18, 20, 0.4)',
      }}
    >
      <div
        style={{
          padding: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          backgroundColor: 'rgba(10, 10, 12, 0.3)',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: 'rgba(255, 255, 255, 0.95)',
            letterSpacing: '-0.01em',
          }}
        >
          {getTitleForTab(activeTab)}
        </h2>
        <p
          style={{
            margin: '4px 0 0 0',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.4)',
          }}
        >
          {getDescriptionForTab(activeTab)}
        </p>
      </div>

      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px 20px',
        }}
      >
        {activeTab === 'flags' && <FlagsPanel />}
        {activeTab === 'routes' && <RoutesPanel />}
        {activeTab === 'roles' && <RolesPanel />}
        {activeTab === 'shells' && <ShellsPanel />}
        {activeTab === 'wireframes' && <WireframesPanel />}
        {activeTab === 'pages' && <PagesPanel />}
        {activeTab === 'mocks' && <MocksPanel />}
        {activeTab === 'diagnostics' && <DiagnosticsPanel />}
        {activeTab === 'themes' && <ThemePanel />}
      </div>
    </div>
  );
}

function getTitleForTab(tab: DevTab): string {
  const titles: Record<DevTab, string> = {
    flags: 'דגלי תכונות',
    routes: 'מפקח נתיבים',
    roles: 'מנהל תפקידים',
    shells: 'עקיפת מעטפת',
    wireframes: 'שלדות',
    pages: 'מפקח דפים',
    mocks: 'נתוני בדיקה',
    diagnostics: 'אבחון',
    themes: 'מנהל ערכות נושא',
  };
  return titles[tab];
}

function getDescriptionForTab(tab: DevTab): string {
  const descriptions: Record<DevTab, string> = {
    flags: 'החלף דגלי תכונות לפיתוח',
    routes: 'בדוק ונווט בנתיבים זמינים',
    roles: 'צפה ובדוק הרשאות תפקידים',
    shells: 'עקוף תצורת מעטפת',
    wireframes: 'צפה בשלדות רכיבים',
    pages: 'בדוק מבנה דפים',
    mocks: 'נהל נתוני בדיקה',
    diagnostics: 'צפה באבחון מערכת ואירועים',
    themes: 'החלף בין ערכות נושא זמינות',
  };
  return descriptions[tab];
}
