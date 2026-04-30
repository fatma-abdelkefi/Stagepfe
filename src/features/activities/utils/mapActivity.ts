import type { ActivityItem } from '../types/activity.types';

function asString(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function pickHref(item: any): string {
  if (!item) return '';

  if (typeof item.href === 'string') return item.href.trim();
  if (item.href && typeof item.href === 'object' && typeof item.href.href === 'string') {
    return item.href.href.trim();
  }
  if (typeof item._href === 'string') return item._href.trim();
  if (typeof item.rdf_about === 'string') return item.rdf_about.trim();
  if (typeof item['rdf:about'] === 'string') return item['rdf:about'].trim();

  return '';
}

export function mapActivity(item: any): ActivityItem {
  const wonum = asString(item?.wonum);
  const taskid =
    asString(item?.taskid) ||
    asString(item?.taskId) ||
    wonum;

  const workorderid = asString(item?.workorderid);
  const siteid = asString(item?.siteid);
  const href = pickHref(item);

  return {
    id: workorderid || taskid || wonum || Math.random().toString(36).slice(2),
    wonum,
    description: asString(item?.description),
    status: asString(item?.status),
    asset: asString(item?.assetnum || item?.asset),
    location: asString(item?.location),
    taskid,
    siteid,
    workorderid,
    href,
    parentWonum: asString(item?.parentwonum || item?.parent || ''),
  };
}