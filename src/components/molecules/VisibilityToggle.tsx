import React, { useState } from 'react';

/**
 * Render Props Pattern: VisibilityToggle
 * Provides visibility state management to child components
 * Demonstrates inversion of control and maximum flexibility
 */

interface VisibilityToggleProps {
  initialVisible?: boolean;
  children: (props: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    toggle: () => void;
  }) => React.ReactNode;
}

export function VisibilityToggle({
  initialVisible = false,
  children,
}: VisibilityToggleProps) {
  const [isVisible, setIsVisible] = useState(initialVisible);

  const show = () => setIsVisible(true);
  const hide = () => setIsVisible(false);
  const toggle = () => setIsVisible((prev) => !prev);

  return <>{children({ isVisible, show, hide, toggle })}</>;
}

/**
 * Usage examples:
 *
 * // Basic usage
 * <VisibilityToggle>
 *   {({ isVisible, toggle }) => (
 *     <>
 *       <Button onClick={toggle}>
 *         {isVisible ? 'Hide' : 'Show'}
 *       </Button>
 *       {isVisible && <div>Content</div>}
 *     </>
 *   )}
 * </VisibilityToggle>
 *
 * // Advanced usage with modal
 * <VisibilityToggle>
 *   {({ isVisible, show, hide }) => (
 *     <>
 *       <Button onClick={show}>Open Modal</Button>
 *       <Modal isOpen={isVisible} onClose={hide}>
 *         <p>Modal content</p>
 *       </Modal>
 *     </>
 *   )}
 * </VisibilityToggle>
 */

/**
 * Custom Hook Pattern: useToggle
 * Alternative to render props for hook-based composition
 */
export function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = () => setValue((prev) => !prev);
  const setTrue = () => setValue(true);
  const setFalse = () => setValue(false);

  return {
    value,
    toggle,
    setTrue,
    setFalse,
    setValue,
  };
}

/**
 * Usage:
 * const modal = useToggle();
 *
 * <Button onClick={modal.setTrue}>Open</Button>
 * <Modal isOpen={modal.value} onClose={modal.setFalse}>
 *   Content
 * </Modal>
 */
