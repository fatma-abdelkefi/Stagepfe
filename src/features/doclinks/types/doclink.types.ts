export interface DoclinkItem {
  id: string;
  document: string;
  description: string;
  href?: string;
  urlname?: string;
  createdate?: string;
  doclinkId?: string;
  weburl?: string;
  raw?: any;
}

export interface DoclinksListParams {
  workOrder: {
    wonum: string;
    docLinks?: any[];
  };
}

export interface DoclinkInput {
  document: string;
  documentdata: string;
  description?: string;
}