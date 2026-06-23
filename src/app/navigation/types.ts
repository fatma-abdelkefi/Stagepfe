export type RootStackParamList = {
  Login: undefined;
  AddWorkOrder: undefined;

  WorkOrders: { showPermissionsModal?: boolean } | undefined;

  WorkOrderDetails: {
  workOrder?: {
    wonum?: string;
    siteid?: string;
    status?: string;
    href?: string;
    description?: string;
    workorderid?: number;
  };

  wonum?: string;
  siteid?: string;
  createdFromAdd?: boolean;
  shouldRefreshWorkOrders?: boolean;
  draftWorkOrder?: any;
};
  MaterialsList: {
    title: string;
    wonum: string;
    items: any[];
    mode: 'planned' | 'actual';
  };

  AddPlannedMaterial: {
    wonum?: string | number;
    workorderid?: string | number;
    siteid?: string;
    status?: string;
    ishistory?: boolean;
  };

  AddActualMaterial: {
    woHref?: string;
    wonum?: string | number;
    siteid?: string;
  };

  AddRelatedWorkOrder: {
    wonum: string;
    siteid?: string;
    description?: string | null;

    assetnum?: string | null;
    asset_description?: string | null;
    assetDescription?: string | null;

    location?: string | null;
    worktype?: string | null;
    priority?: number | string | null;

    woHref?: string;
    mxwoDetailsHref?: string;

    related_assets?: any[];
    relatedAssets?: any[];
    assets?: any[];
  };

  AddPlannedLabor: {
    wonum?: string | number;
    workorderid?: string | number;
    siteid?: string;
    status?: string;
    ishistory?: boolean;
  };

  AddActualLabor: {
    wonum?: string | number;
    siteid?: string;
    woHref?: string;
  };

  DetailsPlannedLabor: {
    workOrder: {
      wonum?: string;
      labor?: any[];
    };
  };

  DetailsActualLabor: {
    woHref: string;
    wonum?: string;
  };

  ActivityList: {
    woHref?: string;
    wonum?: string;
    siteid?: string;
    items?: any[];
  };

  DoclinksList: {
    workOrder: {
      wonum: string;
      docLinks?: any[];
    };
  };

  DoclinkDetails: {
    document: any;
  };

  AddDoclink: {
    ownerid: number;
    siteid: string;
    onRefresh?: () => void;
  };
  LocalDoclinkImageViewer: {
  uri: string;
  title?: string;
};

  AddWorkLog: {
    wonum?: string;
    worklogCollectionRef?: string;
    woHref?: string;
    mxwoDetailsHref?: string;
  };

  WorkLogList: {
    title: string;
    wonum: string;
    items: any[];
  };

  WorkLogDetails: {
    title: string;
    wonum: string;
    item: any;
  };
  RelatedWorkOrdersList: {
  wonum: string;
  siteid?: string;
  items: any[];
};

  FailureReporting: {
    wonum: string;
    siteid: string;
    description?: string;
    assetnum?: string;
    assetDescription?: string;
    location?: string;
    locationDescription?: string;
    status?: string;
    worklogText?: string;
    href?: string;
    woHref?: string;
    priority?: number;
    description_longdescription?: string;
  };

  FailureReportingDetails: {
    wonum: string;
    siteid: string;
    description?: string;
    assetnum?: string;
    assetDescription?: string;
    location?: string;
    locationDescription?: string;
    status?: string;
    worklogText?: string;
    initialReport?: {
      wonum: string;
      siteid: string;
      failureClass?: string;
      failureClassDescription?: string;
      problem?: string;
      problemDescription?: string;
      cause?: string;
      causeDescription?: string;
      remedy?: string;
      remedyDescription?: string;
      remark?: string;
      failureCode?: string;
      codes?: Array<{
        code: string;
        description?: string;
        level?: 'class' | 'problem' | 'cause' | 'remedy' | string;
      }>;
      source?: 'maximo' | 'local' | 'prediction';
      updatedAt?: string;
    } | null;
  };
};