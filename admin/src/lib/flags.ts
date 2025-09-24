/**
 * Feature flags system for progressive rollout
 * Reads from NEXT_PUBLIC_UI_FLAGS environment variable
 */

// Define all available feature flags
export type FeatureFlag = 
  | 'courses_public'
  | 'sso'
  | 'continue_strip'
  | 'lesson_resources'
  | 'lesson_mobile_nav';

// Cache parsed flags
let flagsCache: Set<string> | null = null;

/**
 * Check if a feature flag is enabled
 * @param flag - The feature flag to check
 * @returns true if the flag is enabled, false otherwise
 */
export function isOn(flag: FeatureFlag): boolean {
  // Parse flags from env if not cached
  if (flagsCache === null) {
    const flagsEnv = process.env.NEXT_PUBLIC_UI_FLAGS || '';
    flagsCache = new Set(
      flagsEnv
        .split(',')
        .map(f => f.trim())
        .filter(Boolean)
    );
  }

  return flagsCache.has(flag);
}

/**
 * Get all enabled flags (for debugging)
 * @returns Array of enabled flag names
 */
export function getEnabledFlags(): FeatureFlag[] {
  const allFlags: FeatureFlag[] = [
    'courses_public',
    'sso',
    'continue_strip',
    'lesson_resources',
    'lesson_mobile_nav'
  ];
  
  return allFlags.filter(flag => isOn(flag));
}

