import React from 'react';
import { spacing, colors } from '../../design-system';

export interface ListProps extends React.HTMLAttributes<HTMLUListElement | HTMLOListElement> {
  ordered?: boolean;
  spacing?: 'none' | 'sm' | 'md' | 'lg';
  dividers?: boolean;
}

export function List({
  ordered = false,
  spacing: spacingSize = 'md',
  dividers = false,
  children,
  style,
  ...props
}: ListProps) {
  const spacingMap: Record<string, string> = {
    none: '0',
    sm: spacing[2],
    md: spacing[3],
    lg: spacing[4],
  };

  const listStyles: React.CSSProperties = {
    margin: 0,
    padding: 0,
    listStyle: 'none',
    ...style,
  };

  const Element = ordered ? 'ol' : 'ul';

  const childrenWithSpacing = React.Children.map(children, (child, index) => {
    if (!React.isValidElement(child)) return child;

    const itemStyle: React.CSSProperties = {
      marginBottom: index < React.Children.count(children) - 1 ? spacingMap[spacingSize] : '0',
      paddingBottom: dividers && index < React.Children.count(children) - 1 ? spacingMap[spacingSize] : '0',
      borderBottom: dividers && index < React.Children.count(children) - 1 ? `1px solid ${colors.border.primary}` : 'none',
    };

    return <li style={itemStyle}>{child}</li>;
  });

  return React.createElement(Element, { style: listStyles, ...props }, childrenWithSpacing);
}
