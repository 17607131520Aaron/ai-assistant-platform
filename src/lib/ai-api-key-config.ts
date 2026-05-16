import { apiRequest } from "@/lib/api-client";

export type WebAiApiKeyConfig = {
  requestUrl: string;
  model: string;
  hasApiKeyToken: boolean;
  apiKeyTokenMasked: string;
  updatedAt: string | null;
};

const LEGACY_SETTINGS_STORAGE_KEY = "ai-assistant-settings";

export const invalidateCustomAiRequestConfigCache = (): void => {
  // 聊天改由后端从 Redis 读取配置，保留空实现供设置页回调
};

export const fetchApiKeyConfig = async (): Promise<WebAiApiKeyConfig> => {
  return apiRequest.get<WebAiApiKeyConfig>("/web/ai/api-key-config");
};

export const saveApiKeyConfig = async (
  requestUrl: string,
  model: string,
  apiKeyToken?: string,
): Promise<WebAiApiKeyConfig> => {
  return apiRequest.put<WebAiApiKeyConfig>("/web/ai/api-key-config", {
    requestUrl: requestUrl.trim(),
    model: model.trim(),
    ...(apiKeyToken?.trim() ? { apiKeyToken: apiKeyToken.trim() } : {}),
  });
};

export const deleteApiKeyConfig = async (): Promise<WebAiApiKeyConfig> => {
  return apiRequest.delete<WebAiApiKeyConfig>("/web/ai/api-key-config");
};

export const migrateLegacyLocalSettings = async (): Promise<boolean> => {
  if (typeof window === "undefined") {
    return false;
  }

  const rawSettings = window.localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY);

  if (!rawSettings) {
    return false;
  }

  try {
    const parsed = JSON.parse(rawSettings) as Partial<{
      requestUrl: string;
      apiKeyToken: string;
      apiKey: string;
      model: string;
    }>;
    const requestUrl = parsed.requestUrl?.trim() ?? "";
    const apiKeyToken = (parsed.apiKeyToken ?? parsed.apiKey ?? "").trim();
    const model = parsed.model?.trim() ?? "gpt-4o-mini";

    if (requestUrl && apiKeyToken) {
      await saveApiKeyConfig(requestUrl, model, apiKeyToken);
    }

    window.localStorage.removeItem(LEGACY_SETTINGS_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
};
