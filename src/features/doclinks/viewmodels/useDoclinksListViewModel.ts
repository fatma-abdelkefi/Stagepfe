import { useMemo } from 'react';
import { isValidDoclink, mapDoclink } from '../utils/mapDoclink';
import type { DoclinksListParams } from '../types/doclink.types';

export function useDoclinksListViewModel(params: DoclinksListParams) {
  const doclinks = useMemo(() => {
    const rawDocs = params?.workOrder?.docLinks ?? [];
    return rawDocs
      .filter(isValidDoclink)
      .map((item: any, index: number) => mapDoclink(item, index));
  }, [params]);

  return {
    doclinks,
    wonum: params?.workOrder?.wonum ?? '',
  };
}