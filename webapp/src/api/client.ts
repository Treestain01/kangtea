import {
  HealthResponseSchema,
  MenuSchema,
  StoreSchema,
  type HealthResponse,
  type Menu,
  type Store,
} from '@bbt/shared';
import type { z } from 'zod';
import { API_URL } from '../config';

/** The only place that calls fetch against the API. Every response is parsed against the shared contract. */
async function getJson<T extends z.ZodType>(
  path: string,
  schema: T,
  fetchImpl: typeof fetch,
): Promise<z.output<T>> {
  const response = await fetchImpl(`${API_URL}${path}`);
  if (!response.ok) {
    throw new Error(`GET ${path} failed with status ${response.status}`);
  }
  return schema.parse(await response.json());
}

export function fetchHealth(fetchImpl: typeof fetch = fetch): Promise<HealthResponse> {
  return getJson('/health', HealthResponseSchema, fetchImpl);
}

export function fetchStore(fetchImpl: typeof fetch = fetch): Promise<Store> {
  return getJson('/store', StoreSchema, fetchImpl);
}

export function fetchMenu(fetchImpl: typeof fetch = fetch): Promise<Menu> {
  return getJson('/menu', MenuSchema, fetchImpl);
}
