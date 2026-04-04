import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export function useSubscription() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/subscriptions/status')
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  const isBlocked = !loading && status && !['trial_active', 'active'].includes(status.access);

  return { status, loading, isBlocked };
}
