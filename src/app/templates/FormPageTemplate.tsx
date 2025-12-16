import React from 'react';
import { colors, spacing } from '../../design-system';

export interface FormSection {
  title: string;
  description?: string;
  fields: React.ReactNode;
}

export interface FormPageTemplateProps {
  title: string;
  subtitle?: string;
  sections: FormSection[];
  actions?: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  backButton?: {
    label: string;
    onClick: () => void;
  };
}

export function FormPageTemplate({
  title,
  subtitle,
  sections,
  actions,
  onSubmit,
  backButton,
}: FormPageTemplateProps) {
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

  const formStyles: React.CSSProperties = {
    maxWidth: '800px',
    margin: '0 auto',
    padding: spacing[6],
  };

  const sectionStyles: React.CSSProperties = {
    marginBottom: spacing[8],
    padding: spacing[6],
    background: colors.background.secondary,
    borderRadius: '12px',
    border: `1px solid ${colors.border.primary}`,
  };

  const sectionHeaderStyles: React.CSSProperties = {
    marginBottom: spacing[4],
  };

  const actionsStyles: React.CSSProperties = {
    display: 'flex',
    gap: spacing[3],
    justifyContent: 'flex-end',
    padding: spacing[6],
    borderTop: `1px solid ${colors.border.primary}`,
    background: colors.background.secondary,
    position: 'sticky',
    bottom: 0,
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
      </header>

      <form onSubmit={onSubmit} style={formStyles}>
        {sections.map((section, index) => (
          <section key={index} style={sectionStyles}>
            <div style={sectionHeaderStyles}>
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  margin: 0,
                  color: colors.text.primary,
                }}
              >
                {section.title}
              </h2>
              {section.description && (
                <p
                  style={{
                    fontSize: '14px',
                    color: colors.text.secondary,
                    margin: `${spacing[2]} 0 0 0`,
                  }}
                >
                  {section.description}
                </p>
              )}
            </div>
            {section.fields}
          </section>
        ))}
      </form>

      {actions && <div style={actionsStyles}>{actions}</div>}
    </div>
  );
}
