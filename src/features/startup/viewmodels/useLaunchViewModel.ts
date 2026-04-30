import { useEffect } from 'react';
import { requestLaunchPermissions } from '../../../shared/utils/appPermissions';

export function useLaunchViewModel() {
  useEffect(() => {
    const run = async () => {
      await requestLaunchPermissions();
    };

    run();
  }, []);

  return {};
}