import { HealthResponseSchema, type HealthResponse } from '@bbt/shared';
import { API_URL } from '../config';

/** Fetches the API health status. The only place that calls fetch against the API. */
export async function fetchHealth(fetchImpl: typeof fetch = fetch): Promise<HealthResponse> {
  const response = await fetchImpl(`${API_URL}/health`);
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  return HealthResponseSchema.parse(await response.json());
}
