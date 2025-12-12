import React from 'react';
import { migrationFlags } from '../migration/flags';

type Resolver = () => Promise<React.ComponentType<any>>;
type Adapter = (props: any) => any;

interface ModalState {
  id: string | null;
  props: any;
}

export function useModalController(resolver: Resolver, adapter?: Adapter) {
  const [Component, setComponent] = React.useState<React.ComponentType<any> | null>(null);
  const [state, setState] = React.useState<ModalState>({ id: null, props: {} });

  React.useEffect(() => {
    resolver().then((mod) => setComponent(() => mod));
  }, [resolver]);

  const open = (idOrProps: string | any, maybeProps?: any) => {
    if (!migrationFlags.modal) return;
    const id = typeof idOrProps === 'string' ? idOrProps : null;
    const nextProps = (typeof idOrProps === 'string' ? maybeProps : idOrProps) || {};
    setState({ id, props: { ...nextProps, isOpen: true } });
  };

  const close = () => {
    setState((prev) => ({ ...prev, props: { ...prev.props, isOpen: false } }));
  };

  const Render = () => {
    if (!migrationFlags.modal) return null;
    if (!Component) return null;
    const mapped = adapter ? adapter(state.props) : state.props;
    return <Component {...mapped} />;
  };

  return {
    open,
    close,
    Render,
    setProps: (next: any) =>
      setState((prev) => ({ ...prev, props: typeof next === 'function' ? next(prev.props) : next })),
    currentId: state.id,
    props: state.props
  };
}
