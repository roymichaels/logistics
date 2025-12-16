import React from 'react';
import { colors, spacing } from '../../design-system';

export interface DetailSection {
  title: string;
  content: React.ReactNode;
}

export interface DetailPageTemplateProps {
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  sections?: DetailSection[];
  sidebar?: React.ReactNode;
  backButton?: {
    label: string;
    onClick: () => void;
  };
  children?: React.ReactNode;
}

export function DetailPageTemplate({
  title,
  subtitle,
  headerActions,
  sections = [],
  sidebar,
  backButton,
  children,
}: DetailPageTemplateProps) {
  const containerStyles: React.CSSProperties = {
    minHeight: '100vh',
    background: colors.background.primary,
    color: colors.text.primary,
  };

  const headerStyles: React.CSSProperties = {
    padding: spacing[6],
    borderBottom: `1px solid ${colors.border.primary}`,
    background: colors.background.secondary,
  };

  const headerTopStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  };

  const titleContainerStyles: React.CSSProperties = {
    flex: 1,
  };

  const mainStyles: React.CSSProperties = {
    display: 'flex',
    gap: spacing[6],
    padding: spacing[6],
    maxWidth: '1280px',
    margin: '0 auto',
  };

  const contentStyles: React.CSSProperties = {
    flex: 1,
  };

  const sidebarStyles: React.CSSProperties = {
    width: '300px',
    flexShrink: 0,
  };

  const sectionStyles: React.CSSProperties = {
    marginBottom: spacing[8],
  };

  const sectionTitleStyles: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: spacing[4],
    color: colors.text.primary,
  };

  return (
    <div style={containerStyles}>
      <header style={headerStyles}>
        {backButton && (
          <button
            onClick={backButton.onClick}
            style={{
              background: 'none',
              border: 'none',
              color: colors.brand.primary,
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: spacing[2],
              padding: 0,
            }}
          >
            ← {backButton.label}
          </button>
        )}

        <div style={headerTopStyles}>
          <div style={titleContainerStyles}>
            <h1
              style={{
                fontSize: '32px',
                fontWeight: '700',
                margin: 0,
                color: colors.text.primary,
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                style={{
                  fontSize: '16px',
                  color: colors.text.secondary,
                  margin: `${spacing[2]} 0 0 0`,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>

          {headerActions && <div>{headerActions}</div>}
        </div>
      </header>

      <main style={mainStyles}>
        <div style={contentStyles}>
          {sections.map((section, index) => (
            <section key={index} style={sectionStyles}>
              <h2 style={sectionTitleStyles}>{section.title}</h2>
              <div>{section.content}</div>
            </section>
          ))}
          {children}
        </div>

        {sidebar && (
          <aside style={sidebarStyles}>
            {sidebar}
          </aside>
        )}
      </main>
    </div>
  );
}
