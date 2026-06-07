// Side-effecting sync configuration (persist plugin + shared Supabase config).
import './sync';

import { initAuth } from './auth';

export * from './auth';
export * from './habits$';
export * from './completions$';
export * from './profile$';

/** Start the store: wire auth so sync can begin once a session exists. */
export function initStore(): void {
  initAuth();
}
