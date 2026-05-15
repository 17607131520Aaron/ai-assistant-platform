import { getAccessToken } from "@/lib/auth-token";

export type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getErrorMessage = (value: unknown, fallback: string): string => {
  if (isRecord(value) && typeof value.message === "string") {
    return value.message;
  }

  if (value instanceof Error) {
    return value.message;
  }

  return fallback;
};

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

type ApiRequestOptions = RequestInit & {
  auth?: boolean;
};

export const apiRequest = async <T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> => {
  const { auth = true, headers: initHeaders, ...rest } = options;
  const headers = new Headers(initHeaders);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (rest.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (auth) {
    const accessToken = getAccessToken();

    if (!accessToken) {
      throw new Error("请先登录");
    }

    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(
    `${API_BASE_URL.replace(/\/$/, "")}${path}`,
    {
      ...rest,
      headers,
      credentials: "omit",
    },
  );

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new Error(`请求失败（${response.status}）`);
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `请求失败（${response.status}）`));
  }

  return parseApiEnvelope<T>(payload);
};
