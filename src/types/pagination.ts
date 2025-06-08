export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
