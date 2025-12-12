import { useState } from 'react';

export function useResponsiveHeader(initialTitle: string = '') {
  const [title, setTitle] = useState<string>(initialTitle);
  return { title, setTitle };
}
