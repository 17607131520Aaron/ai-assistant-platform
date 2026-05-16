import {
  getUnauthorizedMessage,
  handleUnauthorized,
  isUnauthorizedError,
} from "@/lib/auth-session";
import { getAccessToken } from "@/lib/auth-token";
import { requestLoading } from "@/lib/request-loading";
import { createRequest, type RequestConfig } from "@/lib/request";

export type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const parseApiEnvelope = <T>(payload: unknown): T => {
  if (!isRecord(payload) || typeof payload.code !== "number") {
    throw new Error("接口响应格式异常");
  }

  if (payload.code !== 0) {
    throw new Error(
      typeof payload.message === "string" ? payload.message : "请求失败",
    );
  }

  return payload.data as T;
};

/** 底层 HTTP 实例：baseURL、Token、重试、401、全局 loading */
export const http = createRequest({
  baseURL: API_BASE_URL.replace(/\/$/, ""),
  timeout: 120_000,
  credentials: "omit",
  retry: 2,
  retryDelay: 300,
  showLoading: false,
  getAccessToken: () => getAccessToken(),
  onLoadingStart: () => requestLoading.start(),
  onLoadingEnd: () => requestLoading.stop(),
  parseBusinessError: (payload) => {
    if (!isRecord(payload) || typeof payload.code !== "number") {
      return null;
    }

    if (payload.code === 0) {
      return null;
    }

    return {
      message:
        typeof payload.message === "string" ? payload.message : "请求失败",
      code: payload.code,
      data: payload.data,
    };
  },
  onError: (error, context) => {
    if (context.config.skipAuth || !isUnauthorizedError(error)) {
      return;
    }

    handleUnauthorized(getUnauthorizedMessage(error));
  },
});

type ApiRequestConfig<TBody = unknown> = Omit<
  RequestConfig<TBody>,
  "url" | "baseURL"
> & {
  /** 默认 true；为 false 时不附带 Authorization */
  auth?: boolean;
  /** 默认 true；流式等长连接请求请设为 false */
  showLoading?: boolean;
};

const resolveApiConfig = <TBody>(
  config: ApiRequestConfig<TBody> = {},
): Omit<RequestConfig<TBody>, "url"> => {
  const { auth = true, skipAuth, showLoading = true, ...rest } = config;

  return {
    ...rest,
    skipAuth: skipAuth ?? !auth,
    showLoading,
  };
};

/** 业务 API：自动解包 `{ code, message, data }` 中的 data */
export const apiRequest = async <T, TBody = unknown>(
  path: string,
  config: ApiRequestConfig<TBody> = {},
): Promise<T> => {
  const { auth = true, ...rest } = config;

  if (auth && !getAccessToken()) {
    handleUnauthorized("请先登录");
    throw new Error("请先登录");
  }

  const payload = await http<ApiEnvelope<T>>({
    url: path,
    ...resolveApiConfig({ auth, ...rest }),
  });

  return parseApiEnvelope<T>(payload);
};

apiRequest.get = <T>(path: string, config?: ApiRequestConfig) =>
  apiRequest<T>(path, { ...config, method: "GET" });

apiRequest.post = <T, TBody = unknown>(
  path: string,
  data?: TBody,
  config?: ApiRequestConfig<TBody>,
) => apiRequest<T, TBody>(path, { ...config, method: "POST", data });

apiRequest.put = <T, TBody = unknown>(
  path: string,
  data?: TBody,
  config?: ApiRequestConfig<TBody>,
) => apiRequest<T, TBody>(path, { ...config, method: "PUT", data });

apiRequest.patch = <T, TBody = unknown>(
  path: string,
  data?: TBody,
  config?: ApiRequestConfig<TBody>,
) => apiRequest<T, TBody>(path, { ...config, method: "PATCH", data });

apiRequest.delete = <T>(path: string, config?: ApiRequestConfig) =>
  apiRequest<T>(path, { ...config, method: "DELETE" });
