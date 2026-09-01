import { useCallback, useEffect, useState } from 'react';

import { checkPermissions, PermissionState, requestAllPermissions } from '@/services/permissions';

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionState>({ callLog: false, sms: false });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const perms = await checkPermissions();
    setPermissions(perms);
    setLoading(false);
  }, []);

  const requestAll = useCallback(async () => {
    const next = await requestAllPermissions();
    setPermissions(next);
    return next;
  }, []);

  useEffect(() => {
    let mounted = true;
    const doRefresh = async () => {
      const perms = await checkPermissions();
      if (mounted) {
        setPermissions(perms);
        setLoading(false);
      }
    };
    doRefresh();
    return () => { mounted = false; };
  }, []);

  return { permissions, loading, refresh, requestAll };
}
