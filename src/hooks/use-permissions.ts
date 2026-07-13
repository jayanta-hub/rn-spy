import { useCallback, useEffect, useState } from 'react';

import { checkPermissions, PermissionState, requestAllPermissions } from '@/services/permissions';

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionState>({ callLog: false, sms: false });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setPermissions(await checkPermissions());
    setLoading(false);
  }, []);

  const requestAll = useCallback(async () => {
    const next = await requestAllPermissions();
    setPermissions(next);
    return next;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { permissions, loading, refresh, requestAll };
}
