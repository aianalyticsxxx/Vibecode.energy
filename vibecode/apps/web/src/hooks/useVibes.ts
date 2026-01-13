'use client';

// Re-export from useShots for backwards compatibility
export { useVibes, useShots } from './useShots';
export type { UseShotsReturn } from './useShots';

// Legacy type alias
export type UseVibesReturn = import('./useShots').UseShotsReturn;
