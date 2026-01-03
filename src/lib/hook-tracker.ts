import { runtimeRegistry } from './runtime-registry';
import React from 'react';

let currentComponentName: string | null = null;

export function setCurrentComponent(name: string | null): void {
  currentComponentName = name;
}

export function createHookTracker() {
  if (!import.meta.env.DEV) {
    return {
      trackHook: () => {},
      wrapHooks: () => {}
    };
  }

  const originalHooks = {
    useState: React.useState,
    useEffect: React.useEffect,
    useContext: React.useContext,
    useReducer: React.useReducer,
    useCallback: React.useCallback,
    useMemo: React.useMemo,
    useRef: React.useRef,
    useImperativeHandle: React.useImperativeHandle,
    useLayoutEffect: React.useLayoutEffect,
    useDebugValue: React.useDebugValue
  };

  function trackHook(hookName: string): void {
    if (currentComponentName) {
      runtimeRegistry.registerHookCall(currentComponentName, hookName);
    }
  }

  function wrapHook<T extends (...args: any[]) => any>(
    hookName: string,
    originalHook: T
  ): T {
    return ((...args: any[]) => {
      trackHook(hookName);
      return originalHook(...args);
    }) as T;
  }

  return {
    trackHook,
    wrapHooks: () => {
      (React as any).useState = wrapHook('useState', originalHooks.useState);
      (React as any).useEffect = wrapHook('useEffect', originalHooks.useEffect);
      (React as any).useContext = wrapHook('useContext', originalHooks.useContext);
      (React as any).useReducer = wrapHook('useReducer', originalHooks.useReducer);
      (React as any).useCallback = wrapHook('useCallback', originalHooks.useCallback);
      (React as any).useMemo = wrapHook('useMemo', originalHooks.useMemo);
      (React as any).useRef = wrapHook('useRef', originalHooks.useRef);
      (React as any).useImperativeHandle = wrapHook('useImperativeHandle', originalHooks.useImperativeHandle);
      (React as any).useLayoutEffect = wrapHook('useLayoutEffect', originalHooks.useLayoutEffect);
      (React as any).useDebugValue = wrapHook('useDebugValue', originalHooks.useDebugValue);
    }
  };
}

export const hookTracker = createHookTracker();

export function trackCustomHook(hookName: string, componentName?: string): void {
  if (!import.meta.env.DEV) return;

  const component = componentName || currentComponentName;
  if (component) {
    runtimeRegistry.registerHookCall(component, hookName);
  }
}
