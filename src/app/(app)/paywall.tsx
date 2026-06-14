import '@/theme/unistyles';

import { useRouter } from 'expo-router';

import { Paywall } from '@/components/Paywall';

export default function PaywallScreen() {
  const router = useRouter();
  return <Paywall dismissible onClose={() => router.back()} />;
}
