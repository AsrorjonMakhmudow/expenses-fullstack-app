import { useSyncExternalStore } from 'react';

const query = '(prefers-color-scheme: dark)';

function subscribe(onChange: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/** "light" | "dark", following the operating system and updating live when it changes. */
export function useColorScheme(): 'light' | 'dark' {
  return useSyncExternalStore(
    subscribe,
    () => (window.matchMedia(query).matches ? 'dark' : 'light'),
    () => 'light',
  );
}
