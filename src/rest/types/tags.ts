export interface TagEntry {
  name: string;
  values: string[];
}

export interface Meta {
  totalCount: number;
}

export interface TagsResponse {
  tags: TagEntry[];
  meta: Meta;
}
