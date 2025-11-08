import React from 'react';
import { colors, spacing, borderRadius } from '../../styles/design-system';

type SpacingKey = keyof typeof spacing;
type ColorKey = string;

export interface BoxProps<T extends React.ElementType = 'div'> {
  as?: T;
  children?: React.ReactNode;
  padding?: SpacingKey | { x?: SpacingKey; y?: SpacingKey; top?: SpacingKey; right?: SpacingKey; bottom?: SpacingKey; left?: SpacingKey };
  margin?: SpacingKey | { x?: SpacingKey; y?: SpacingKey; top?: SpacingKey; right?: SpacingKey; bottom?: SpacingKey; left?: SpacingKey };
  background?: ColorKey;
  color?: ColorKey;
  borderRadius?: keyof typeof borderRadius;
  display?: 'block' | 'flex' | 'inline-flex' | 'grid' | 'inline-block' | 'none';
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  gap?: SpacingKey;
  flex?: string | number;
  width?: string;
  height?: string;
  maxWidth?: string;
  maxHeight?: string;
  position?: 'relative' | 'absolute' | 'fixed' | 'sticky';
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
  style?: React.CSSProperties;
}

type PolymorphicBoxProps<T extends React.ElementType> = BoxProps<T> &
  Omit<React.ComponentPropsWithoutRef<T>, keyof BoxProps<T>>;

/**
 * Polymorphic Box component - the foundation for layout composition
 * Can be rendered as any HTML element while maintaining type safety
 *
 * @example
 * <Box as="section" padding="lg" background={colors.ui.card}>
 *   <Box as="h2" margin={{ bottom: 'md' }}>Title</Box>
 *   <Box display="flex" gap="md">
 *     <Box>Item 1</Box>
 *     <Box>Item 2</Box>
 *   </Box>
 * </Box>
 */
export function Box<T extends React.ElementType = 'div'>({
  as,
  children,
  padding,
  margin,
  background,
  color: textColor,
  borderRadius: radius,
  display,
  flexDirection,
  alignItems,
  justifyContent,
  gap,
  flex,
  width,
  height,
  maxWidth,
  maxHeight,
  position,
  overflow,
  style,
  ...props
}: PolymorphicBoxProps<T>) {
  const Component = as || 'div';

  const getSpacingValue = (value: SpacingKey | undefined): string | undefined => {
    return value ? spacing[value] : undefined;
  };

  const getPaddingStyles = () => {
    if (!padding) return {};
    if (typeof padding === 'string') {
      return { padding: getSpacingValue(padding) };
    }
    return {
      paddingTop: getSpacingValue(padding.top || padding.y),
      paddingRight: getSpacingValue(padding.right || padding.x),
      paddingBottom: getSpacingValue(padding.bottom || padding.y),
      paddingLeft: getSpacingValue(padding.left || padding.x),
    };
  };

  const getMarginStyles = () => {
    if (!margin) return {};
    if (typeof margin === 'string') {
      return { margin: getSpacingValue(margin) };
    }
    return {
      marginTop: getSpacingValue(margin.top || margin.y),
      marginRight: getSpacingValue(margin.right || margin.x),
      marginBottom: getSpacingValue(margin.bottom || margin.y),
      marginLeft: getSpacingValue(margin.left || margin.x),
    };
  };

  const boxStyles: React.CSSProperties = {
    ...getPaddingStyles(),
    ...getMarginStyles(),
    ...(background && { background }),
    ...(textColor && { color: textColor }),
    ...(radius && { borderRadius: borderRadius[radius] }),
    ...(display && { display }),
    ...(flexDirection && { flexDirection }),
    ...(alignItems && { alignItems }),
    ...(justifyContent && { justifyContent }),
    ...(gap && { gap: getSpacingValue(gap) }),
    ...(flex && { flex }),
    ...(width && { width }),
    ...(height && { height }),
    ...(maxWidth && { maxWidth }),
    ...(maxHeight && { maxHeight }),
    ...(position && { position }),
    ...(overflow && { overflow }),
    ...style,
  };

  return (
    <Component style={boxStyles} {...props}>
      {children}
    </Component>
  );
}

/**
 * Flex - Shorthand for Box with display="flex"
 */
export function Flex<T extends React.ElementType = 'div'>(props: PolymorphicBoxProps<T>) {
  return <Box display="flex" {...props} />;
}

/**
 * Stack - Vertical flex layout
 */
export function Stack<T extends React.ElementType = 'div'>(
  props: Omit<PolymorphicBoxProps<T>, 'display' | 'flexDirection'>
) {
  return <Box display="flex" flexDirection="column" {...props} />;
}

/**
 * HStack - Horizontal flex layout
 */
export function HStack<T extends React.ElementType = 'div'>(
  props: Omit<PolymorphicBoxProps<T>, 'display' | 'flexDirection'>
) {
  return <Box display="flex" flexDirection="row" {...props} />;
}

/**
 * Center - Centers content both horizontally and vertically
 */
export function Center<T extends React.ElementType = 'div'>(
  props: Omit<PolymorphicBoxProps<T>, 'display' | 'alignItems' | 'justifyContent'>
) {
  return <Box display="flex" alignItems="center" justifyContent="center" {...props} />;
}
