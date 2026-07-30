'use client';

import { useFocusable, UseFocusableConfig } from '@noriginmedia/norigin-spatial-navigation';
import { useIsTV } from '@/hooks/use-tv';

export function useTVFocusable<E = unknown>(config?: UseFocusableConfig) {
  const isTV = useIsTV();
  const { ref, focused, focusSelf, focusKey } = useFocusable<object, E>({
    ...config,
    focusable: isTV && config?.focusable !== false,
    onEnterPress: config?.onEnterPress ?? (() => (ref.current as unknown as HTMLElement | null)?.click()),
  });

  return { ref, focused, focusSelf, focusKey, tvFocusClassName: focused ? 'tv-focus' : '' };
}
