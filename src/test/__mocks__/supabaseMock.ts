/**
 * Shared Supabase mock factory for hook integration tests.
 */
import { vi } from "vitest";

type MockResponse = { data: any; error: any; count?: number };

export function createSupabaseMock() {
  const chainable: Record<string, any> = {};
  const methods = [
    "from", "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "in", "is", "gte", "lte", "gt", "lt",
    "order", "limit", "maybeSingle", "single",
    "head", "range", "filter", "not", "or",
  ];

  let resolvedValue: MockResponse = { data: null, error: null };

  methods.forEach((m) => {
    chainable[m] = vi.fn().mockReturnValue(chainable);
  });

  // Terminal — returns promise
  chainable.maybeSingle = vi.fn().mockImplementation(() => Promise.resolve(resolvedValue));
  chainable.single = vi.fn().mockImplementation(() => Promise.resolve(resolvedValue));

  // Make chainable thenable so await works on chain
  chainable.then = function (resolve: any, reject: any) {
    return Promise.resolve(resolvedValue).then(resolve, reject);
  };

  const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });

  const channelMock = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  };

  const supabaseMock = {
    from: vi.fn().mockReturnValue(chainable),
    rpc: rpcMock,
    channel: vi.fn().mockReturnValue(channelMock),
    removeChannel: vi.fn(),
    _chain: chainable,
    _setChainResponse: (resp: MockResponse) => {
      resolvedValue = resp;
      chainable.maybeSingle = vi.fn().mockImplementation(() => Promise.resolve(resp));
      chainable.single = vi.fn().mockImplementation(() => Promise.resolve(resp));
      chainable.then = function (resolve: any, reject: any) {
        return Promise.resolve(resp).then(resolve, reject);
      };
    },
  };

  return supabaseMock;
}
