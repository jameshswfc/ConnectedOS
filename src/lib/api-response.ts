export type ApiError = {
  code: string;
  message: string;
};

export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  errors: ApiError[];
};

export function successResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    errors: []
  };
}

export function errorResponse(code: string, message: string): ApiResponse<null> {
  return {
    success: false,
    data: null,
    errors: [{ code, message }]
  };
}
