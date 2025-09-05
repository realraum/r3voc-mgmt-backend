export interface ApiSuccessResponse<TData = null> {
    success: true;
    data: TData;
}

export interface ApiErrorResponse {
    success: false;
    error: string;
}

export type ApiResponse<TData = null> =
    | ApiSuccessResponse<TData>
    | ApiErrorResponse;
