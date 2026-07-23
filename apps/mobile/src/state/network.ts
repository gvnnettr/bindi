import { useEffect, useState } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

export function useNetworkStatus(): { online: boolean; type: string } {
  const [state, setState] = useState<NetInfoState | null>(null);
  useEffect(() => {
    const unsub = NetInfo.addEventListener(setState);
    NetInfo.fetch().then(setState);
    return () => unsub();
  }, []);
  return {
    online: state?.isConnected === true && state?.isInternetReachable !== false,
    type: state?.type ?? 'unknown',
  };
}
