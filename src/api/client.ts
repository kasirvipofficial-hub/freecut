export class APIClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  async get<T>(endpoint: string): Promise<T> {
    // TODO: Implement GET request
    throw new Error('Not implemented');
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    // TODO: Implement POST request
    throw new Error('Not implemented');
  }

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    // TODO: Implement PUT request
    throw new Error('Not implemented');
  }

  async delete<T>(endpoint: string): Promise<T> {
    // TODO: Implement DELETE request
    throw new Error('Not implemented');
  }
}

export const apiClient = new APIClient();
