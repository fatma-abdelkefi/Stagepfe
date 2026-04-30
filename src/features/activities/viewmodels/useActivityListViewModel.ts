import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../app/providers/AuthProvider';
import { getActivities } from '../services/activitiesService';
import { mapActivity } from '../utils/mapActivity';
import { ActivityItem, ActivityListParams } from '../types/activity.types';

export function useActivityListViewModel(params: ActivityListParams) {
  const { username, password } = useAuth();

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);

      if (Array.isArray(params?.items) && params.items.length > 0) {
        const mapped = params.items.map(mapActivity);
        setActivities(mapped);
        return;
      }

      const data = await getActivities({
        ...params,
        username,
        password,
      });

      const mapped = Array.isArray(data) ? data.map(mapActivity) : [];
      console.log('✅ MAPPED ACTIVITIES:', mapped);
      setActivities(mapped);
    } catch (e) {
      console.log('❌ ACTIVITIES ERROR:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [params, username, password]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return {
    activities,
    loading,
    error,
    refresh: fetchActivities,
  };
}