import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../config/arcjet.js', () => ({
  default: { protect: vi.fn() }
}));

import aj from '../config/arcjet.js';
import arcjetMiddleware from '../middlewares/arcjet.middleware.js';
import { createMockRes, createNext } from './helpers.js';

afterEach(() => vi.clearAllMocks());

const deny = (kind) => ({
  isDenied: () => true,
  reason: {
    isRateLimit: () => kind === 'rate',
    isBot: () => kind === 'bot'
  }
});

describe('middlewares/arcjet', () => {
  it('allows when not denied', async () => {
    aj.protect.mockResolvedValue({ isDenied: () => false, reason: {} });
    const req = {};
    const res = createMockRes();
    const next = createNext();
    await arcjetMiddleware(req, res, next);
    expect(next.calls.pop()).toBeNull();
  });

  it('429 on rate limit', async () => {
    aj.protect.mockResolvedValue(deny('rate'));
    const req = {};
    const res = createMockRes();
    const next = createNext();
    await arcjetMiddleware(req, res, next);
    expect(res.statusCode).toBe(429);
  });

  it('403 on bot', async () => {
    aj.protect.mockResolvedValue(deny('bot'));
    const req = {};
    const res = createMockRes();
    const next = createNext();
    await arcjetMiddleware(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/Bot/i);
  });
});