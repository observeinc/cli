import {
  BaseAPI,
  type HTTPHeaders,
  type HTTPQuery,
} from "../generated/runtime";
import type {
  SourceDatasetCreateRequest,
  SourceDatasetListResponse,
  SourceDatasetResource,
  SourceDatasetUpdateRequest,
} from "./types";

/**
 * Stand-in for the generated SourceDatasetApi until /v1/source-datasets is
 * public (see ./types.ts). Built on the generated runtime so auth, base URL,
 * headers and tracing come from createApiConfiguration, and non-2xx responses
 * throw the usual ResponseError.
 */
export class SourceDatasetApi extends BaseAPI {
  private async headers(json: boolean): Promise<HTTPHeaders> {
    const headers: HTTPHeaders = {};
    if (json) headers["Content-Type"] = "application/json";
    const token = this.configuration.accessToken;
    if (token) {
      const value = await token("bearerAuth", []);
      if (value) headers.Authorization = `Bearer ${value}`;
    }
    return headers;
  }

  private static path(id?: string): string {
    return id === undefined
      ? "/v1/source-datasets"
      : `/v1/source-datasets/${encodeURIComponent(id)}`;
  }

  async listSourceDatasets(params: {
    filter?: string;
    orderBy?: string;
    limit?: number;
    offset?: number;
    expand?: boolean;
  }): Promise<SourceDatasetListResponse> {
    const query: HTTPQuery = {};
    if (params.filter) query.filter = params.filter;
    if (params.orderBy) query.orderBy = params.orderBy;
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.offset !== undefined) query.offset = params.offset;
    if (params.expand) query.expand = true;
    const response = await this.request({
      path: SourceDatasetApi.path(),
      method: "GET",
      headers: await this.headers(false),
      query,
    });
    return (await response.json()) as SourceDatasetListResponse;
  }

  async getSourceDataset(params: {
    id: string;
    expand?: boolean;
  }): Promise<SourceDatasetResource> {
    const response = await this.request({
      path: SourceDatasetApi.path(params.id),
      method: "GET",
      headers: await this.headers(false),
      query: params.expand ? { expand: true } : {},
    });
    return (await response.json()) as SourceDatasetResource;
  }

  async createSourceDataset(
    body: SourceDatasetCreateRequest,
  ): Promise<SourceDatasetResource> {
    const response = await this.request({
      path: SourceDatasetApi.path(),
      method: "POST",
      headers: await this.headers(true),
      body,
    });
    return (await response.json()) as SourceDatasetResource;
  }

  async updateSourceDataset(params: {
    id: string;
    body: SourceDatasetUpdateRequest;
  }): Promise<SourceDatasetResource> {
    const response = await this.request({
      path: SourceDatasetApi.path(params.id),
      method: "PATCH",
      headers: await this.headers(true),
      body: params.body,
    });
    return (await response.json()) as SourceDatasetResource;
  }

  async deleteSourceDataset(params: {
    id: string;
    force?: boolean;
  }): Promise<void> {
    await this.request({
      path: SourceDatasetApi.path(params.id),
      method: "DELETE",
      headers: await this.headers(false),
      query: params.force ? { force: true } : {},
    });
  }
}
