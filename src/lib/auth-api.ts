import { apiRequest } from "@/lib/api-client";
import { setAccessToken } from "@/lib/auth-token";

export type WebLoginPayload = {
  username: string;
  password: string;
  rememberMe?: boolean;
};

export type WebRegisterPayload = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type WebLoginResponse = {
  accessToken: string;
};

type WebRegisterResponse = {
  token: string;
};

export const loginWebUser = async (payload: WebLoginPayload): Promise<void> => {
  const data = await apiRequest.post<WebLoginResponse>(
    "/web/users/login",
    payload,
    { auth: false, showLoading: false },
  );

  setAccessToken(data.accessToken);
};

export const registerWebUser = async (
  payload: WebRegisterPayload,
): Promise<void> => {
  const data = await apiRequest.post<WebRegisterResponse>(
    "/web/users/register",
    payload,
    { auth: false, showLoading: false },
  );

  setAccessToken(data.token);
};
