import {
  BaseAPI,
  type HTTPHeaders,
  type HTTPQuery,
} from "../generated/runtime";
import type {
  HealthStatus,
  RegisterShareRequest,
  RegistrationToken,
  SetupInfo,
  ShareListResponse,
  ShareResource,
  ShareState,
  TableListResponse,
  TableResource,
  TableUpdateRequest,
  TrackTableRequest,
  UntrackedTableListResponse,
  UpdateShareRequest,
} from "./types";

/**
 * Stand-in for the generated ExternalSharesApi until /v1/shares/inbound is
 * public (see ./types.ts). Built on the generated runtime so auth, base URL,
 * headers and tracing come from createApiConfiguration, and non-2xx responses
 * throw the usual ResponseError.
 */
export class InboundShareApi extends BaseAPI {
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

  private static sharePath(shareId?: string): string {
    return shareId === undefined
      ? "/v1/shares/inbound"
      : `/v1/shares/inbound/${encodeURIComponent(shareId)}`;
  }

  private static tablePath(shareId: string, tableId?: string): string {
    const base = `${InboundShareApi.sharePath(shareId)}/tables`;
    return tableId === undefined
      ? base
      : `${base}/${encodeURIComponent(tableId)}`;
  }

  async getSetupInfo(): Promise<SetupInfo> {
    const response = await this.request({
      path: "/v1/shares/inbound/setup",
      method: "GET",
      headers: await this.headers(false),
    });
    return (await response.json()) as SetupInfo;
  }

  async createRegistrationToken(body: {
    providerAccount: string;
  }): Promise<RegistrationToken> {
    const response = await this.request({
      path: "/v1/shares/inbound/registration-tokens",
      method: "POST",
      headers: await this.headers(true),
      body,
    });
    return (await response.json()) as RegistrationToken;
  }

  /** `created` is false when the share was already registered (200). */
  async registerShare(
    body: RegisterShareRequest,
  ): Promise<{ share: ShareResource; created: boolean }> {
    const response = await this.request({
      path: InboundShareApi.sharePath(),
      method: "POST",
      headers: await this.headers(true),
      body,
    });
    return {
      share: (await response.json()) as ShareResource,
      created: response.status === 201,
    };
  }

  async listShares(params: {
    status?: ShareState;
    healthStatus?: HealthStatus;
    orderBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<ShareListResponse> {
    const query: HTTPQuery = {};
    if (params.status) query.status = params.status;
    if (params.healthStatus) query.healthStatus = params.healthStatus;
    if (params.orderBy) query.orderBy = params.orderBy;
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.offset !== undefined) query.offset = params.offset;
    const response = await this.request({
      path: InboundShareApi.sharePath(),
      method: "GET",
      headers: await this.headers(false),
      query,
    });
    return (await response.json()) as ShareListResponse;
  }

  async getShare(params: { shareId: string }): Promise<ShareResource> {
    const response = await this.request({
      path: InboundShareApi.sharePath(params.shareId),
      method: "GET",
      headers: await this.headers(false),
    });
    return (await response.json()) as ShareResource;
  }

  async updateShare(params: {
    shareId: string;
    body: UpdateShareRequest;
  }): Promise<ShareResource> {
    const response = await this.request({
      path: InboundShareApi.sharePath(params.shareId),
      method: "PATCH",
      headers: await this.headers(true),
      body: params.body,
    });
    return (await response.json()) as ShareResource;
  }

  async deleteShare(params: {
    shareId: string;
    force?: boolean;
  }): Promise<void> {
    await this.request({
      path: InboundShareApi.sharePath(params.shareId),
      method: "DELETE",
      headers: await this.headers(false),
      query: params.force ? { force: true } : {},
    });
  }

  async listShareTables(params: {
    shareId: string;
    filter?: string;
    orderBy?: string;
    limit?: number;
    offset?: number;
    expand?: boolean;
  }): Promise<TableListResponse> {
    const query: HTTPQuery = {};
    if (params.filter) query.filter = params.filter;
    if (params.orderBy) query.orderBy = params.orderBy;
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.offset !== undefined) query.offset = params.offset;
    if (params.expand) query.expand = true;
    const response = await this.request({
      path: InboundShareApi.tablePath(params.shareId),
      method: "GET",
      headers: await this.headers(false),
      query,
    });
    return (await response.json()) as TableListResponse;
  }

  async listUntrackedShareTables(params: {
    shareId: string;
    filter?: string;
    orderBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<UntrackedTableListResponse> {
    const query: HTTPQuery = {};
    if (params.filter) query.filter = params.filter;
    if (params.orderBy) query.orderBy = params.orderBy;
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.offset !== undefined) query.offset = params.offset;
    const response = await this.request({
      path: `${InboundShareApi.sharePath(params.shareId)}/untracked-tables`,
      method: "GET",
      headers: await this.headers(false),
      query,
    });
    return (await response.json()) as UntrackedTableListResponse;
  }

  /** `created` is false when the table was already tracked (200). */
  async trackShareTable(params: {
    shareId: string;
    body: TrackTableRequest;
    expand?: boolean;
  }): Promise<{ table: TableResource; created: boolean }> {
    const response = await this.request({
      path: InboundShareApi.tablePath(params.shareId),
      method: "POST",
      headers: await this.headers(true),
      query: params.expand ? { expand: true } : {},
      body: params.body,
    });
    return {
      table: (await response.json()) as TableResource,
      created: response.status === 201,
    };
  }

  async getShareTable(params: {
    shareId: string;
    tableId: string;
    expand?: boolean;
  }): Promise<TableResource> {
    const response = await this.request({
      path: InboundShareApi.tablePath(params.shareId, params.tableId),
      method: "GET",
      headers: await this.headers(false),
      query: params.expand ? { expand: true } : {},
    });
    return (await response.json()) as TableResource;
  }

  async updateShareTable(params: {
    shareId: string;
    tableId: string;
    body: TableUpdateRequest;
    expand?: boolean;
  }): Promise<TableResource> {
    const response = await this.request({
      path: InboundShareApi.tablePath(params.shareId, params.tableId),
      method: "PATCH",
      headers: await this.headers(true),
      query: params.expand ? { expand: true } : {},
      body: params.body,
    });
    return (await response.json()) as TableResource;
  }

  async untrackShareTable(params: {
    shareId: string;
    tableId: string;
  }): Promise<void> {
    await this.request({
      path: InboundShareApi.tablePath(params.shareId, params.tableId),
      method: "DELETE",
      headers: await this.headers(false),
    });
  }
}
