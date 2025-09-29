import React, { useState } from 'react';
import { telegram } from '../lib/telegram';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { hebrew } from '../src/lib/hebrew';

interface DemoLandingProps {
  onNavigate: (page: string) => void;
}

export function DemoLanding({ onNavigate }: DemoLandingProps) {
  const [selectedRole, setSelectedRole] = useState<string>('dispatcher');
  const { theme, haptic } = useTelegramUI();

  const demoRoles = [
    { id: 'manager', name: 'מנהל', icon: '👔', description: 'ניהול כללי, דוחות, אישורים' },
    { id: 'dispatcher', name: 'מוקדן', icon: '📋', description: 'תיאום הזמנות ומשלוחים' },
    { id: 'driver', name: 'נהג', icon: '🚚', description: 'ביצוע משלוחים ומסלולים' },
    { id: 'warehouse', name: 'מחסנאי', icon: '📦', description: 'ניהול מלאי והכנת הזמנות' },
    { id: 'sales', name: 'מכירות', icon: '💼', description: 'קבלת הזמנות ושירות לקוחות' }
  ];

  const handleRoleDemo = (roleId: string) => {
    haptic();
    
    // Store demo role in localStorage
    localStorage.setItem('demo_role', roleId);
    
    // Navigate to dashboard with demo role
    onNavigate('dashboard');
    
    // Show success message
    telegram.showAlert(`עברת למצב דמו כ${demoRoles.find(r => r.id === roleId)?.name}!`);
  };

  return (
    <div style={{ 
      backgroundColor: theme.bg_color,
      color: theme.text_color,
      minHeight: '100vh',
      direction: 'rtl'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '24px 16px',
        background: `linear-gradient(135deg, ${theme.button_color}20, ${theme.button_color}10)`,
        borderBottom: `1px solid ${theme.hint_color}20`
      }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🚚</div>
          <h1 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '28px', 
            fontWeight: '700',
            color: theme.text_color
          }}>
            מערכת לוגיסטיקה מתקדמת
          </h1>
          <p style={{ 
            margin: 0, 
            fontSize: '16px',
            color: theme.hint_color,
            lineHeight: '1.5'
          }}>
            חווה את המערכת המלאה במצב דמו
          </p>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Features Overview */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ 
            margin: '0 0 16px 0', 
            fontSize: '20px', 
            fontWeight: '600'
          }}>
            ✨ יכולות המערכת
          </h2>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
            gap: '12px',
            marginBottom: '24px'
          }}>
            <FeatureCard
              icon="📋"
              title="ניהול הזמנות"
              description="מעקב מלא אחר הזמנות"
              theme={theme}
            />
            <FeatureCard
              icon="🚚"
              title="משלוחים"
              description="תיאום נהגים ומסלולים"
              theme={theme}
            />
            <FeatureCard
              icon="📦"
              title="ניהול מלאי"
              description="מעקב מוצרים ומחסן"
              theme={theme}
            />
            <FeatureCard
              icon="💬"
              title="תקשורת"
              description="צ'אט וערוצי עדכונים"
              theme={theme}
            />
          </div>
        </div>

        {/* Role Selection */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ 
            margin: '0 0 16px 0', 
            fontSize: '20px', 
            fontWeight: '600'
          }}>
            🎭 בחר תפקיד לדמו
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {demoRoles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                isSelected={selectedRole === role.id}
                onSelect={() => setSelectedRole(role.id)}
                onDemo={() => handleRoleDemo(role.id)}
                theme={theme}
                haptic={haptic}
              />
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div style={{
          padding: '20px',
          backgroundColor: theme.button_color + '10',
          borderRadius: '12px',
          textAlign: 'center',
          border: `1px solid ${theme.button_color}30`
        }}>
          <h3 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '18px', 
            fontWeight: '600',
            color: theme.button_color
          }}>
            💡 מעוניין בגישה מלאה?
          </h3>
          <p style={{ 
            margin: '0 0 16px 0', 
            fontSize: '14px',
            color: theme.hint_color,
            lineHeight: '1.5'
          }}>
            צור קשר עם המנהל לקבלת הרשאות מלאות במערכת
          </p>
          <button
            onClick={() => {
              haptic();
              telegram.showAlert('לקבלת גישה מלאה, פנה למנהל המערכת או צור קשר בהגדרות');
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: theme.button_color,
              color: theme.button_text_color,
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            📞 צור קשר
          </button>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description, theme }: {
  icon: string;
  title: string;
  description: string;
  theme: any;
}) {
  return (
    <div style={{
      padding: '16px',
      backgroundColor: theme.secondary_bg_color || '#f1f1f1',
      borderRadius: '12px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
      <h3 style={{ 
        margin: '0 0 4px 0', 
        fontSize: '14px', 
        fontWeight: '600',
        color: theme.text_color
      }}>
        {title}
      </h3>
      <p style={{ 
        margin: 0, 
        fontSize: '12px', 
        color: theme.hint_color,
        lineHeight: '1.3'
      }}>
        {description}
      </p>
    </div>
  );
}

function RoleCard({ role, isSelected, onSelect, onDemo, theme, haptic }: {
  role: any;
  isSelected: boolean;
  onSelect: () => void;
  onDemo: () => void;
  theme: any;
  haptic: () => void;
}) {
  return (
    <div style={{
      padding: '16px',
      backgroundColor: theme.secondary_bg_color || '#f1f1f1',
      borderRadius: '12px',
      border: isSelected ? `2px solid ${theme.button_color}` : `1px solid ${theme.hint_color}20`,
      cursor: 'pointer'
    }}>
      <div 
        onClick={() => {
          haptic();
          onSelect();
        }}
        style={{ marginBottom: '12px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ fontSize: '32px' }}>{role.icon}</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ 
              margin: '0 0 4px 0', 
              fontSize: '18px', 
              fontWeight: '600',
              color: theme.text_color
            }}>
              {role.name}
            </h3>
            <p style={{ 
              margin: 0, 
              fontSize: '14px', 
              color: theme.hint_color,
              lineHeight: '1.4'
            }}>
              {role.description}
            </p>
          </div>
        </div>
      </div>
      
      <button
        onClick={() => {
          haptic();
          onDemo();
        }}
        style={{
          width: '100%',
          padding: '10px',
          backgroundColor: isSelected ? theme.button_color : theme.hint_color + '40',
          color: isSelected ? theme.button_text_color : theme.text_color,
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer'
        }}
      >
        🎮 התחל דמו כ{role.name}
      </button>
    </div>
  );
}