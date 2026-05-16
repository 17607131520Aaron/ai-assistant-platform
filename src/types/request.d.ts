export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ResponseType =
  | "json"
  | "text"
  | "blob"
  | "arrayBuffer"
  | "raw";

export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | QueryValue[]
  | { [key: string]: QueryValue };

export type QueryParams = Record<string, QueryValue>;

export interface BusinessErrorPayload<T = unknown> {
  message?: string;
  code?: string | number;
  data?: T;
}

export interface RequestErrorOptions<T = unknown> {
  status?: number;
  code?: string | number;
  data?: T;
  requestId?: string | null;
  response?: Response;
  cause?: unknown;
}

export interface RequestConfig<TBody = unknown> extends Omit<
  RequestInit,
  "body" | "method"
> {
  url: string;
  method?: HttpMethod;
  baseURL?: string;
  params?: QueryParams;
  data?: TBody;
  timeout?: number;
  responseType?: ResponseType;
  headers?: HeadersInit;
  skipAuth?: boolean;
  /** 额外重试次数（不含首次请求），默认由 createRequest 决定 */
  retry?: number;
  /** 是否展示全局 loading，默认 false */
  showLoading?: boolean;
}

export interface RequestContext<TBody = unknown> {
  url: string;
  config: RequestConfig<TBody>;
  init: RequestInit;
}

export interface ResponseContext<TResponse = unknown, TBody = unknown>
  extends RequestContext<TBody> {
  response: Response;
  data: TResponse;
}

export interface RequestErrorLike extends Error {
  status?: number;
  code?: string | number;
  data?: unknown;
  requestId?: string | null;
  response?: Response;
  cause?: unknown;
}

export interface CreateRequestOptions {
  baseURL?: string;
  timeout?: number;
  credentials?: RequestCredentials;
  headers?: HeadersInit;
  getAccessToken?: () => string | null | undefined | Promise<string | null | undefined>;
  getHeaders?: () => HeadersInit | Promise<HeadersInit | undefined>;
  validateStatus?: (status: number) => boolean;
  parseBusinessError?: (data: unknown) => BusinessErrorPayload | null;
  /** 默认额外重试次数 */
  retry?: number;
  /** 重试间隔基数（毫秒），实际延迟会指数退避 */
  retryDelay?: number;
  shouldRetry?: (
    error: RequestErrorLike,
    attempt: number,
    config: RequestConfig,
  ) => boolean;
  /** 默认是否展示全局 loading */
  showLoading?: boolean;
  onLoadingStart?: () => void;
  onLoadingEnd?: () => void;
  onRequest?: (context: RequestContext) => void | Promise<void>;
  onResponse?: (context: ResponseContext) => void | Promise<void>;
  onError?: (
    error: RequestErrorLike,
    context: RequestContext,
  ) => void | Promise<void>;
}

export type RequestInstance = {
  <TResponse = unknown, TBody = unknown>(
    config: RequestConfig<TBody>,
  ): Promise<TResponse>;
  get: <TResponse = unknown>(
    url: string,
    config?: Omit<RequestConfig, "url" | "method">,
  ) => Promise<TResponse>;
  post: <TResponse = unknown, TBody = unknown>(
    url: string,
    data?: TBody,
    config?: Omit<RequestConfig<TBody>, "url" | "method" | "data">,
  ) => Promise<TResponse>;
  put: <TResponse = unknown, TBody = unknown>(
    url: string,
    data?: TBody,
    config?: Omit<RequestConfig<TBody>, "url" | "method" | "data">,
  ) => Promise<TResponse>;
  patch: <TResponse = unknown, TBody = unknown>(
    url: string,
    data?: TBody,
    config?: Omit<RequestConfig<TBody>, "url" | "method" | "data">,
  ) => Promise<TResponse>;
  delete: <TResponse = unknown, TBody = unknown>(
    url: string,
    config?: Omit<RequestConfig<TBody>, "url" | "method">,
  ) => Promise<TResponse>;
};
