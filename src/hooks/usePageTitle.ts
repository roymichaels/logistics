import { useState } from 'react';

export function usePageTitle(initialTitle: string = '', initialSubtitle: string = '') {
  const [title, setTitle] = useState<string>(initialTitle);
  const [subtitle, setSubtitle] = useState<string>(initialSubtitle);
  return { title, setTitle, subtitle, setSubtitle };
}
