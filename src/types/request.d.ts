export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiResponse {
  code: number;
  message: string;
  data: T;
}
