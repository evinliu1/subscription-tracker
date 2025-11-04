import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../models/user.model.js', () => ({
  default: {
    find: vi.fn(),
    findById: vi.fn()
  }
}));

import User from '../models/user.model.js';
import { getUsers, getUser } from '../controllers/user.controller.js';
import { createMockRes, createNext } from '../test/helpers.js';

afterEach(() => vi.clearAllMocks());

describe('controllers/user', () => {
  it('getUsers returns list', async () => {
    User.find.mockResolvedValue([{ _id: 'u1' }]);
    const req = {}; const res = createMockRes(); const next = createNext();
    await getUsers(req, res, next);
    expect(res.statusCode).toBe(200);
    expect(res.body.data[0]._id).toBe('u1');
  });

  it('getUser returns user without password', async () => {
    const selector = vi.fn().mockResolvedValue({ _id: 'u1', email: 'a@b.c' });
    User.findById.mockReturnValue({ select: selector });
    const req = { params: { id: 'u1' } }; const res = createMockRes(); const next = createNext();
    await getUser(req, res, next);
    expect(selector).toHaveBeenCalledWith('-password');
    expect(res.body.data._id).toBe('u1');
  });

  it('getUser not found', async () => {
    const selector = vi.fn().mockResolvedValue(null);
    User.findById.mockReturnValue({ select: selector });
    const req = { params: { id: 'nope' } }; const res = createMockRes(); const next = createNext();
    await getUser(req, res, next);
    expect(next.calls[0]).toBeInstanceOf(Error);
    expect(next.calls[0].statusCode).toBe(400);
  });
});