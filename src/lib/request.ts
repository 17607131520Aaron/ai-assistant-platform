import type {
  BusinessErrorPayload,
  CreateRequestOptions,
  QueryParams,
  QueryValue,
  RequestConfig,
  RequestContext,
  RequestErrorOptions,
  RequestInstance,
  ResponseContext,
  ResponseType,
} from "@/types/request";

export type {
  BusinessErrorPayload,
  CreateRequestOptions,
  HttpMethod,
  QueryParams,
  QueryValue,
  RequestConfig,
  RequestContext,
  RequestErrorOptions,
  RequestInstance,
  ResponseContext,
  ResponseType,
} from "@/types/request";

export class RequestError<T = unknown> extends Error {
  status?: number;
  code?: string | number;
  data?: T;
  requestId?: string | null;
  response?: Response;
  cause?: unknown;

  constructor(message: string, options?: RequestErrorOptions<T>) {
    super(message);
    this.name = "RequestError";
    this.status = options?.status;
    this.code = options?.code;
    this.data = options?.data;
    this.requestId = options?.requestId;
    this.response = options?.response;
    this.cause = options?.cause;
  }
}

const DEFAULT_TIMEOUT = 15_000;
const DEFAULT_VALIDATE_STATUS = (status: number) =>
  status >= 200 && status < 300;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === "[object Object]";

const isBodyInit = (value: unknown): value is BodyInit =>
  typeof value === "string" ||
  value instanceof Blob ||
  value instanceof FormData ||
  value instanceof URLSearchParams ||
  value instanceof ArrayBuffer ||
  ArrayBuffer.isView(value) ||
  value instanceof ReadableStream;

const appendQueryValue = (
  searchParams: URLSearchParams,
  key: string,
  value: QueryValue,
): void => {
  if (value == null) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (item != null) {
        searchParams.append(key, String(item));
      }
    });
    return;
  }

  if (isPlainObject(value)) {
    Object.entries(value).forEach(([nestedKey, nestedValue]) => {
      appendQueryValue(
        searchParams,
        `${key}.${nestedKey}`,
        nestedValue as QueryValue,
      );
    });
    return;
  }

  searchParams.append(key, String(value));
};

const isAbsoluteURL = (value: string) => /^https?:\/\//i.test(value);

const joinUrlPath = (base: string, path: string): string => {
  const normalizedBase = base.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBase}${normalizedPath}`;
};

const appendParamsToUrl = (url: string, params?: QueryParams): string => {
  if (!params) {
    return url;
  }

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) =>
    appendQueryValue(searchParams, key, value),
  );

  const query = searchParams.toString();

  if (!query) {
    return url;
  }

  const separator = url.includes("?") ? "&" : "?";

  return `${url}${separator}${query}`;
};

const buildURL = (
  url: string,
  baseURL?: string,
  params?: QueryParams,
): string => {
  if (baseURL && isAbsoluteURL(baseURL)) {
    const target = new URL(url, baseURL);

    if (params) {
      Object.entries(params).forEach(([key, value]) =>
        appendQueryValue(target.searchParams, key, value),
      );
    }

    return target.toString();
  }

  if (baseURL) {
    return appendParamsToUrl(joinUrlPath(baseURL, url), params);
  }

  if (isAbsoluteURL(url)) {
    return appendParamsToUrl(url, params);
  }

  const target = new URL(url, "http://local-request-base");

  if (params) {
    Object.entries(params).forEach(([key, value]) =>
      appendQueryValue(target.searchParams, key, value),
    );
  }

  return target.pathname + target.search + target.hash;
};

const mergeHeaders = (...sources: Array<HeadersInit | undefined>): Headers => {
  const headers = new Headers();

  sources.forEach((source) => {
    if (!source) {
      return;
    }

    new Headers(source).forEach((value, key) => {
      headers.set(key, value);
    });
  });

  return headers;
};

const normalizeBody = (
  data: unknown,
  headers: Headers,
): BodyInit | undefined => {
  if (data == null) {
    return undefined;
  }

  if (isBodyInit(data)) {
    return data;
  }

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return JSON.stringify(data);
};

const parseResponse = async <T>(
  response: Response,
  responseType: ResponseType,
): Promise<T> => {
  if (responseType === "raw") {
    return response as T;
  }

  if (response.status === 204 || response.status === 205) {
    return undefined as T;
  }

  switch (responseType) {
    case "text":
      return (await response.text()) as T;
    case "blob":
      return (await response.blob()) as T;
    case "arrayBuffer":
      return (await response.arrayBuffer()) as T;
    case "json":
    default: {
      const text = await response.text();
      return (text ? JSON.parse(text) : undefined) as T;
    }
  }
};

const createTimeoutSignal = (
  timeout: number,
  externalSignal?: AbortSignal,
): {
  signal: AbortSignal;
  cleanup: () => void;
} => {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(`Request timeout after ${timeout}ms`),
    timeout,
  );

  const abortFromExternalSignal = () => {
    controller.abort(externalSignal?.reason);
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener("abort", abortFromExternalSignal, {
        once: true,
      });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener("abort", abortFromExternalSignal);
    },
  };
};

const toRequestError = (error: unknown): RequestError => {
  if (error instanceof RequestError) {
    return error;
  }

  if (error instanceof Error) {
    return new RequestError(error.message, { cause: error });
  }

  return new RequestError("Unknown request error", { cause: error });
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const isAbortError = (error: RequestError): boolean => {
  if (error.cause instanceof DOMException && error.cause.name === "AbortError") {
    return true;
  }

  return /aborted/i.test(error.message);
};

const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "OPTIONS", "PUT", "DELETE"]);

const defaultShouldRetry = (
  error: RequestError,
  attempt: number,
  config: RequestConfig,
): boolean => {
  if (isAbortError(error)) {
    return false;
  }

  const method = (config.method ?? "GET").toUpperCase();

  if (!IDEMPOTENT_METHODS.has(method)) {
    return false;
  }

  const status = error.status;

  if (status == null) {
    return true;
  }

  if (status === 408 || status === 429) {
    return true;
  }

  return status >= 500;
};

export const createRequest = (
  options: CreateRequestOptions = {},
): RequestInstance => {
  const request: RequestInstance = async <TResponse = unknown, TBody = unknown>(
    config: RequestConfig<TBody>,
  ): Promise<TResponse> => {
    const {
      url,
      method = "GET",
      baseURL = options.baseURL,
      params,
      data,
      timeout = options.timeout ?? DEFAULT_TIMEOUT,
      responseType = "json",
      headers,
      skipAuth = false,
      credentials = options.credentials ?? "omit",
      signal: externalSignal,
      retry = options.retry ?? 0,
      showLoading = options.showLoading ?? false,
      ...restConfig
    } = config;

    const showGlobalLoading = showLoading;
    const maxAttempts = Math.max(0, retry) + 1;
    let requestContext: RequestContext<TBody> | null = null;

    if (showGlobalLoading) {
      options.onLoadingStart?.();
    }

    try {
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        try {
          const [accessToken, dynamicHeaders] = await Promise.all([
            skipAuth || !options.getAccessToken
              ? Promise.resolve(undefined)
              : options.getAccessToken(),
            options.getHeaders
              ? options.getHeaders()
              : Promise.resolve(undefined),
          ]);

          const resolvedURL = buildURL(url, baseURL, params);
          const mergedHeaders = mergeHeaders(
            { Accept: "application/json" },
            options.headers,
            dynamicHeaders,
            headers,
          );

          if (accessToken && !mergedHeaders.has("Authorization")) {
            mergedHeaders.set("Authorization", `Bearer ${accessToken}`);
          }

          const body = normalizeBody(data, mergedHeaders);
          const abortSignal =
            externalSignal === null ? undefined : externalSignal;
          const { signal, cleanup } = createTimeoutSignal(timeout, abortSignal);

          try {
            const init: RequestInit = {
              ...restConfig,
              method,
              headers: mergedHeaders,
              body,
              credentials,
              signal,
            };

            requestContext = {
              url: resolvedURL,
              config,
              init,
            };

            await options.onRequest?.(requestContext);

            const response = await fetch(resolvedURL, init);

            if (responseType === "raw") {
              const validateStatus =
                options.validateStatus ?? DEFAULT_VALIDATE_STATUS;

              if (!validateStatus(response.status)) {
                throw new RequestError(`HTTP error: ${response.status}`, {
                  status: response.status,
                  requestId: response.headers.get("x-request-id"),
                  response,
                });
              }

              await options.onResponse?.({
                ...requestContext,
                response,
                data: response as TResponse,
              });

              return response as TResponse;
            }

            const parsed = await parseResponse<TResponse>(
              response,
              responseType,
            );
            const responseContext: ResponseContext<TResponse, TBody> = {
              ...requestContext,
              response,
              data: parsed,
            };

            const validateStatus =
              options.validateStatus ?? DEFAULT_VALIDATE_STATUS;

            if (!validateStatus(response.status)) {
              const message =
                isPlainObject(parsed) && typeof parsed.message === "string"
                  ? parsed.message
                  : `HTTP error: ${response.status}`;

              throw new RequestError(message, {
                status: response.status,
                data: parsed,
                requestId: response.headers.get("x-request-id"),
                response,
              });
            }

            const businessError = options.parseBusinessError?.(parsed);

            if (businessError) {
              throw new RequestError(
                businessError.message || "Business request error",
                {
                  status: response.status,
                  code: businessError.code,
                  data: businessError.data,
                  requestId: response.headers.get("x-request-id"),
                  response,
                },
              );
            }

            await options.onResponse?.(responseContext);
            return parsed;
          } finally {
            cleanup();
          }
        } catch (error) {
          const requestError = toRequestError(error);
          const canRetry =
            attempt < maxAttempts - 1 &&
            (options.shouldRetry?.(requestError, attempt, config) ??
              defaultShouldRetry(requestError, attempt, config));

          if (!canRetry) {
            if (requestContext) {
              await options.onError?.(requestError, requestContext);
            }

            throw requestError;
          }

          const retryDelay = options.retryDelay ?? 300;
          await sleep(retryDelay * 2 ** attempt);
        }
      }

      throw new RequestError("Request failed after retries");
    } finally {
      if (showGlobalLoading) {
        options.onLoadingEnd?.();
      }
    }
  };

  request.get = <TResponse = unknown>(
    url: string,
    config?: Omit<RequestConfig, "url" | "method">,
  ) => request<TResponse>({ ...config, url, method: "GET" });

  request.post = <TResponse = unknown, TBody = unknown>(
    url: string,
    data?: TBody,
    config?: Omit<RequestConfig<TBody>, "url" | "method" | "data">,
  ) => request<TResponse, TBody>({ ...config, url, data, method: "POST" });

  request.put = <TResponse = unknown, TBody = unknown>(
    url: string,
    data?: TBody,
    config?: Omit<RequestConfig<TBody>, "url" | "method" | "data">,
  ) => request<TResponse, TBody>({ ...config, url, data, method: "PUT" });

  request.patch = <TResponse = unknown, TBody = unknown>(
    url: string,
    data?: TBody,
    config?: Omit<RequestConfig<TBody>, "url" | "method" | "data">,
  ) => request<TResponse, TBody>({ ...config, url, data, method: "PATCH" });

  request.delete = <TResponse = unknown, TBody = unknown>(
    url: string,
    config?: Omit<RequestConfig<TBody>, "url" | "method">,
  ) => request<TResponse, TBody>({ ...config, url, method: "DELETE" });

  return request;
};
