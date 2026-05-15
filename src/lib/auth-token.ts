export const WEB_ACCESS_TOKEN_KEY = "web-access-token";

export const getAccessToken = (): string => {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(WEB_ACCESS_TOKEN_KEY)?.trim() ?? "";
};

export const setAccessToken = (token: string): void => {
  window.localStorage.setItem(WEB_ACCESS_TOKEN_KEY, token.trim());
};

export const clearAccessToken = (): void => {
  window.localStorage.removeItem(WEB_ACCESS_TOKEN_KEY);
};
