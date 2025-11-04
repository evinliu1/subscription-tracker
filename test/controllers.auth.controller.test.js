import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('mongoose', () => {
  const startSession = vi.fn();
  return { default: { startSession }, startSession };
});
vi.mock('../models/user.model.js', () => ({ default: { findOne: vi.fn(), create: vi.fn(), findById: vi.fn() } }));
vi.mock('bcryptjs', () => ({ default: { genSalt: vi.fn(), hash: vi.fn(), compare: vi.fn() } }));
vi.mock('jsonwebtoken', () => ({ default: { sign: vi.fn() } }));

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { signUp, signIn } from '../controllers/auth.controller.js';
import User from '../models/user.model.js';
import { createMockRes, createNext } from '../test/helpers.js';

afterEach(() => vi.clearAllMocks());

const mockSession = () => ({
  startTransaction: vi.fn(),
  commitTransaction: vi.fn(),
  abortTransaction: vi.fn(),
  endSession: vi.fn()
});

describe('controllers/auth', () => {
  it('signUp creates user and returns token', async () => {
    const session = mockSession();
    mongoose.startSession.mockResolvedValue(session);
    User.findOne.mockResolvedValue(null);
    bcrypt.genSalt.mockResolvedValue('salt');
    bcrypt.hash.mockResolvedValue('hashed');
    User.create.mockResolvedValue([{ _id: 'u1', name: 'Ada', email: 'a@b.c' }]);
    jwt.sign.mockReturnValue('jwt-token');

    const req = { body: { name: 'Ada', email: 'a@b.c', password: 'p' } };
    const res = createMockRes();
    const next = createNext();

    await signUp(req, res, next);
    expect(res.statusCode).toBe(201);
    expect(res.body.data.token).toBe('jwt-token');
    expect(User.create).toHaveBeenCalled();
    expect(session.commitTransaction).toHaveBeenCalled();
  });

  it('signUp rejects when user exists', async () => {
    const session = mockSession();
    mongoose.startSession.mockResolvedValue(session);
    User.findOne.mockResolvedValue({ _id: 'x' });

    const req = { body: { name: 'Ada', email: 'a@b.c', password: 'p' } };
    const res = createMockRes();
    const next = createNext();

    await signUp(req, res, next);
    expect(session.abortTransaction).toHaveBeenCalled();
    expect(next.calls[0]).toBeInstanceOf(Error);
  });

  it('signIn success', async () => {
    User.findOne.mockResolvedValue({ _id: 'u1', password: 'hashed' });
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('tok');
    const req = { body: { email: 'a@b.c', password: 'p' } };
    const res = createMockRes();
    const next = createNext();
    await signIn(req, res, next);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.token).toBe('tok');
  });

  it('signIn no user', async () => {
    User.findOne.mockResolvedValue(null);
    const req = { body: { email: 'x', password: 'y' } };
    const res = createMockRes();
    const next = createNext();
    await signIn(req, res, next);
    expect(next.calls[0]).toBeInstanceOf(Error);
    expect(next.calls[0].statusCode).toBe(404);
  });

  it('signIn invalid password', async () => {
    User.findOne.mockResolvedValue({ _id: 'u1', password: 'hashed' });
    bcrypt.compare.mockResolvedValue(false);
    const req = { body: { email: 'x', password: 'y' } };
    const res = createMockRes();
    const next = createNext();
    await signIn(req, res, next);
    expect(next.calls[0]).toBeInstanceOf(Error);
    expect(next.calls[0].statusCode).toBe(401);
  });
});