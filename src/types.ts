
export interface Catalog {
  type: string;
  stac_version: string;
  id: string;
  title?: string;
  description?: string;
  links: {
    rel: string;
    type: string;
    href: string;
    method?: string;
    title?: string;
  }[];
  stac_extensions: string[];
  conformsTo: string[];
};

export interface Collection {
  type: string;
  stac_version: string;
  stac_extensions?: string[];
  id: string;
  title?: string;
  description: string;
  links: {
    rel: string;
    type?: string;
    href: string;
    method?: string;
    title?: string;
  }[];
  keywords?: string[];
  license: string;
  providers?: {
    name: string;
    roles?: string[];
    url?: string;
  }[];
  extent: {
    spatial: {
      bbox: number[][];
    };
    temporal: {
      interval: (string | null)[][];
    };
  };
  summaries?: { [key: string]: [] };
  assets?: {
    [key: string]: {
      href: string;
      title?: string;
      type?: string;
      roles?: string[];
    };
  };
}
