/**
 * Shared test harness for Edge Function integration tests.
 * Provides helpers for building Request objects and standard mocks.
 */

export interface TestContext {
  supabaseUrl: string;
  serviceKey: string;
}

export const MOCK_CONTEXT: TestContext = {
  supabaseUrl: "http://localhost:54321",
  serviceKey: "mock-service-key",
};

/**
 * Build a Request object for an Edge Function handler.
 */
export function buildRequest(url: string, body: any = {}, method = "POST"): Request {
  return new Request(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${MOCK_CONTEXT.serviceKey}`,
    },
    body: method === "GET" ? null : JSON.stringify(body),
  });
}

/**
 * Build a toxic/malformed Request object.
 */
export function buildToxicRequest(url: string): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "This is not { json: true } !!!",
  });
}

/**
 * Standard patient fixture for clinical engine tests.
 */
export const PATIENT_FIXTURE = {
  id: "d83fe021-8519-49e3-a651-c9192e7a25d0", // Wannubia (canonical)
  name: "Wannubia Priscila Wanzeler",
  nutritionist_id: "67f47696-a778-4ada-9ff9-9615fb7a7c48",
};

/**
 * Standard meal plan fixture.
 */
export const MEAL_PLAN_FIXTURE = {
  id: "plan-123",
  patient_id: PATIENT_FIXTURE.id,
  title: "Plano de Teste",
};

/**
 * Create a chainable mock Supabase client for testing.
 */
export function createMockSupabaseClient(data: any = {}) {
  const chain: any = {
    from: () => chain,
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    upsert: () => chain,
    delete: () => chain,
    eq: () => chain,
    neq: () => chain,
    in: () => chain,
    is: () => chain,
    or: () => chain,
    order: () => chain,
    limit: () => chain,
    gte: () => chain,
    lte: () => chain,
    single: () => Promise.resolve({ data, error: null }),
    maybeSingle: () => Promise.resolve({ data, error: null }),
    rpc: () => Promise.resolve({ data, error: null }),
    then: (onRes: any) => Promise.resolve({ data: [data], error: null }).then(onRes),
  };
  return chain;
}

