export type ApiSuccess<T> = { success: true; data: T };
export type ApiFail = { success: false; message: string; meta?: Record<string, unknown> };
export type ApiResponse<T> = ApiSuccess<T> | ApiFail;

export type PaystackInitResponse = {
  authorization_url: string;
  access_code: string;
  reference: string;
};
