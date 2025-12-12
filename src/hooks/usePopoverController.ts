import React from 'react';
import { migrationFlags } from '../migration/flags';

type Resolver = () => Promise<React.ComponentType<any>>;
type Adapter = (props: any) => any;

export function usePopoverController(resolver: Resolver, adapter?: Adapter) {
  const [Component, setComponent] = React.useState<React.ComponentType<any> | null>(null);
  const [props, setProps] = React.useState<any>({});

  React.useEffect(() => {
    resolver().then((mod) => setComponent(() => mod));
  }, [resolver]);

  const open = (nextProps: any) => {
    if (!migrationFlags.popover) return;
    setProps(nextProps);
  };

  const close = () => {
    setProps((prev: any) => ({ ...prev, open: false }));
  };

  const Render = () => {
    if (!migrationFlags.popover) return null;
    if (!Component) return null;
    const mapped = adapter ? adapter(props) : props;
    return React.createElement(Component, mapped);
  };

  return { open, close, Render, setProps };
}
