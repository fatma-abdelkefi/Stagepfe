export interface ActivityItem {
  id: string;
  wonum: string;
  description: string;
  status: string;
  asset?: string;
  location?: string;
  taskid?: string;
  siteid?: string;
  workorderid?: string;
  href?: string;
  parentWonum?: string;
}

export interface ActivityListParams {
  woHref?: string;
  wonum?: string;
  siteid?: string;
  items?: any[];
}