import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../models/user.model.js', () => {
  return { default: { findById: vi.fn() } };
});
vi.mock('jsonwebtoken', () => ({ default: { verify: vi.fn() } }));

import authorize from '../middlewares/auth.middleware.js';
import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';
import { createMockRes, createNext } from './helpers.js';

afterEach(() => vi.clearAllMocks());

describe('middlewares/authorize', () => {
  it('rejects when no token', async () => {
    const req = { headers: {} };
    const res = createMockRes();
    const next = createNext();
    await authorize(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Unauthorized');
  });

  it('rejects when user not found', async () => {
    jwt.verify.mockReturnValue({ userId: 'u1' });
    User.findById.mockResolvedValue(null);
    const req = { headers: { authorization: 'Bearer token' } };
    const res = createMockRes();
    const next = createNext();
    await authorize(req, res, next);
    expect(res.statusCode).toBe(401);
  });

  it('passes when token valid and user exists', async () => {
    jwt.verify.mockReturnValue({ userId: 'u1' });
    User.findById.mockResolvedValue({ _id: 'u1', name: 'Ada' });
    const req = { headers: { authorization: 'Bearer token' } };
    const res = createMockRes();
    const next = createNext();
    await authorize(req, res, next);
    expect(next.calls[next.calls.length - 1]).toBeNull();
    expect(req.user).toEqual({ _id: 'u1', name: 'Ada' });
  });
});