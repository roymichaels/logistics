import React, { createContext, useContext, useState } from 'react';
import { colors, spacing, borderRadius, transitions } from '../../styles/design-system';

/**
 * Compound Component Pattern: Accordion
 * Demonstrates how to create flexible, composable components
 */

interface AccordionContextValue {
  openItems: string[];
  toggleItem: (id: string) => void;
  allowMultiple?: boolean;
}

const AccordionContext = createContext<AccordionContextValue | undefined>(undefined);

function useAccordionContext() {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error('Accordion compound components must be used within Accordion');
  }
  return context;
}

interface AccordionProps {
  children: React.ReactNode;
  allowMultiple?: boolean;
  defaultOpen?: string[];
}

export function Accordion({ children, allowMultiple = false, defaultOpen = [] }: AccordionProps) {
  const [openItems, setOpenItems] = useState<string[]>(defaultOpen);

  const toggleItem = (id: string) => {
    setOpenItems((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }
      return allowMultiple ? [...current, id] : [id];
    });
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem, allowMultiple }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

interface AccordionItemProps {
  id: string;
  children: React.ReactNode;
}

function AccordionItem({ id, children }: AccordionItemProps) {
  const { openItems } = useAccordionContext();
  const isOpen = openItems.includes(id);

  const itemStyles: React.CSSProperties = {
    background: colors.ui.card,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    transition: transitions.normal,
  };

  return (
    <div style={itemStyles} data-accordion-item data-open={isOpen}>
      {children}
    </div>
  );
}

interface AccordionTriggerProps {
  id: string;
  children: React.ReactNode;
}

function AccordionTrigger({ id, children }: AccordionTriggerProps) {
  const { openItems, toggleItem } = useAccordionContext();
  const isOpen = openItems.includes(id);

  const triggerStyles: React.CSSProperties = {
    width: '100%',
    padding: spacing.lg,
    background: 'transparent',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    color: colors.text.primary,
    fontSize: '16px',
    fontWeight: 600,
    transition: transitions.normal,
  };

  return (
    <button
      style={triggerStyles}
      onClick={() => toggleItem(id)}
      aria-expanded={isOpen}
    >
      <span>{children}</span>
      <span
        style={{
          transition: transitions.normal,
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        }}
      >
        ▼
      </span>
    </button>
  );
}

interface AccordionContentProps {
  id: string;
  children: React.ReactNode;
}

function AccordionContent({ id, children }: AccordionContentProps) {
  const { openItems } = useAccordionContext();
  const isOpen = openItems.includes(id);

  const contentStyles: React.CSSProperties = {
    maxHeight: isOpen ? '1000px' : '0',
    overflow: 'hidden',
    transition: 'max-height 0.3s ease',
  };

  const innerStyles: React.CSSProperties = {
    padding: isOpen ? spacing.lg : 0,
    paddingTop: 0,
    color: colors.text.secondary,
  };

  return (
    <div style={contentStyles}>
      <div style={innerStyles}>{children}</div>
    </div>
  );
}

// Attach compound components
Accordion.Item = AccordionItem;
Accordion.Trigger = AccordionTrigger;
Accordion.Content = AccordionContent;

/**
 * Usage example:
 *
 * <Accordion allowMultiple>
 *   <Accordion.Item id="1">
 *     <Accordion.Trigger id="1">Section 1</Accordion.Trigger>
 *     <Accordion.Content id="1">Content for section 1</Accordion.Content>
 *   </Accordion.Item>
 *   <Accordion.Item id="2">
 *     <Accordion.Trigger id="2">Section 2</Accordion.Trigger>
 *     <Accordion.Content id="2">Content for section 2</Accordion.Content>
 *   </Accordion.Item>
 * </Accordion>
 */
