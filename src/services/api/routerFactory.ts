import React from 'react';
import { lazy } from 'react';

export type RouteConfig = {
  path: string;
  element: React.ReactNode;
  children?: RouteConfig[];
};

/**
 * Basic lazy loader helper to keep route declarations concise.
 * This does NOT wire into App.tsx yet; it is a staging utility for module-based routing.
 */
export function createLazyRoute(importer: () => Promise<{ default: React.ComponentType<any> }>, path: string): RouteConfig {
  const Component = lazy(importer);
  return { path, element: <Component /> };
}

/**
 * Factory for namespaced module routes. Currently unused; safe placeholder.
 */
export function createModuleRoutes(namespace: '/store' | '/business' | '/driver' | '/kyc', routes: RouteConfig[]): RouteConfig {
  return {
    path: namespace,
    element: <React.Fragment />,
    children: routes,
  };
}
