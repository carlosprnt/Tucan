import { type Href, useRouter } from 'expo-router';

import { hasPro } from '@/store';

/**
 * Pay-to-use gate. The app stays browsable after the free trial, but acting on
 * habits is locked: run the action if the user has Pro (trial active, subscribed,
 * admin override, or preview), otherwise open the paywall.
 */
export function useProGate() {
  const router = useRouter();
  return (action: () => void) => {
    if (hasPro()) {
      action();
      return;
    }
    router.push('/paywall' as Href);
  };
}
