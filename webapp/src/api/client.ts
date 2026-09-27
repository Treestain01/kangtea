import {
  AccountSchema,
  AuthSessionSchema,
  HealthResponseSchema,
  MeResponseSchema,
  MenuSchema,
  StoreSchema,
  type Account,
  type AccountUpdate,
  type AuthSession,
  type HealthResponse,
  type MeResponse,
  type Menu,
  type SignInRequest,
  type SignUpRequest,
  type Store,
} from '@bbt/shared';
import type { z } from 'zod';
import { API_URL } from '../config';

/** A non 2xx answer. `message` is the api's `error` string when it sent one. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly issues: unknown[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  token?: string;
  fetchImpl?: typeof fetch;
}

/** The only place that calls fetch against the API. Throws ApiError on a non 2xx status. */
async function request(path: string, options: RequestOptions = {}): Promise<Response> {
  const { method = 'GET', body, token, fetchImpl = fetch } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetchImpl(`${API_URL}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    const fallback = `${method} ${path} failed with status ${response.status}`;
    const parsed = await response
      .json()
      .then((data: unknown) => (typeof data === 'object' && data !== null ? data : {}))
      .catch(() => ({}));
    const { error, issues } = parsed as { error?: unknown; issues?: unknown };
    throw new ApiError(
      response.status,
      typeof error === 'string' ? error : fallback,
      Array.isArray(issues) ? issues : [],
    );
  }
  return response;
}

/** Every JSON response is parsed against the shared contract before anyone sees it. */
async function requestJson<T extends z.ZodType>(
  path: string,
  schema: T,
  options: RequestOptions = {},
): Promise<z.output<T>> {
  const response = await request(path, options);
  return schema.parse(await response.json());
}

export function fetchHealth(fetchImpl: typeof fetch = fetch): Promise<HealthResponse> {
  return requestJson('/health', HealthResponseSchema, { fetchImpl });
}

export function fetchStore(fetchImpl: typeof fetch = fetch): Promise<Store> {
  return requestJson('/store', StoreSchema, { fetchImpl });
}

export function fetchMenu(fetchImpl: typeof fetch = fetch): Promise<Menu> {
  return requestJson('/menu', MenuSchema, { fetchImpl });
}

export function signUp(
  input: SignUpRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<AuthSession> {
  return requestJson('/auth/sign-up', AuthSessionSchema, {
    method: 'POST',
    body: input,
    fetchImpl,
  });
}

export function signIn(
  input: SignInRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<AuthSession> {
  return requestJson('/auth/sign-in', AuthSessionSchema, {
    method: 'POST',
    body: input,
    fetchImpl,
  });
}

export async function signOut(token: string, fetchImpl: typeof fetch = fetch): Promise<void> {
  await request('/auth/sign-out', { method: 'POST', token, fetchImpl });
}

export function fetchMe(token: string, fetchImpl: typeof fetch = fetch): Promise<MeResponse> {
  return requestJson('/auth/me', MeResponseSchema, { token, fetchImpl });
}

export function updateAccount(
  token: string,
  update: AccountUpdate,
  fetchImpl: typeof fetch = fetch,
): Promise<Account> {
  return requestJson('/auth/me', AccountSchema, {
    method: 'PATCH',
    body: update,
    token,
    fetchImpl,
  });
}
