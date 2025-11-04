import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('mongoose', () => {
  const startSession = vi.fn();
  return { default: { startSession }, startSession };
});
vi.mock('../models/subscription.model.js', () => ({
  default: {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    deleteOne: vi.fn()
  }
}));
vi.mock('../config/upstash.js', () => ({
  workflowClient: { trigger: vi.fn() }
}));

import mongoose from 'mongoose';
import Subscription from '../models/subscription.model.js';
import { workflowClient } from '../config/upstash.js';
import {
  createSubscription,
  getUserSubscriptions,
  getAllSubscriptions,
  getSubscriptionDetails,
  updateSubscription,
  deleteSubscription,
  cancelSubscription,
  getUpcomingRenewals
} from '../controllers/subscription.controller.js';
import { createMockRes, createNext } from '../test/helpers.js';

afterEach(() => vi.clearAllMocks());

const mockSession = () => ({
  startTransaction: vi.fn(),
  commitTransaction: vi.fn(),
  abortTransaction: vi.fn(),
  endSession: vi.fn()
});

describe('controllers/subscription', () => {
  it('createSubscription creates and triggers workflow', async () => {
    const created = { id: 's1', _id: 's1' };
    Subscription.create.mockResolvedValue(created);
    workflowClient.trigger.mockResolvedValue({ workflowRunId: 'wr1' });

    const req = { body: { name: 'Pro' }, user: { _id: 'u1' } };
    const res = createMockRes();
    const next = createNext();
    await createSubscription(req, res, next);

    expect(res.statusCode).toBe(201);
    expect(res.body.data._id).toBe('s1');
    expect(res.body.workflowRunId).toBe('wr1');
    expect(workflowClient.trigger).toHaveBeenCalled();
  });

  it('getUserSubscriptions enforces ownership', async () => {
    const req = { params: { id: 'u2' }, user: { id: 'u1' } };
    const res = createMockRes();
    const next = createNext();
    await getUserSubscriptions(req, res, next);
    expect(next.calls[0]).toBeInstanceOf(Error);
    expect(next.calls[0].statusCode).toBe(401);
  });

  it('getUserSubscriptions returns user subs', async () => {
    Subscription.find.mockResolvedValue([{ _id: 's1' }]);
    const req = { params: { id: 'u1' }, user: { id: 'u1' } };
    const res = createMockRes();
    const next = createNext();
    await getUserSubscriptions(req, res, next);
    expect(res.statusCode).toBe(200);
    expect(res.body.data[0]._id).toBe('s1');
  });

  it('getAllSubscriptions returns list', async () => {
    Subscription.find.mockResolvedValue([{ _id: 's1' }]);
    const req = {};
    const res = createMockRes();
    const next = createNext();
    await getAllSubscriptions(req, res, next);
    expect(res.statusCode).toBe(200);
  });

  it('getSubscriptionDetails ownership + not found', async () => {
    Subscription.findById.mockResolvedValue(null);
    let req = { params: { id: 's1' }, user: { _id: 'u1' } };
    let res = createMockRes(); let next = createNext();
    await getSubscriptionDetails(req, res, next);
    expect(next.calls[0]).toBeInstanceOf(Error);
    expect(next.calls[0].statusCode).toBe(404);

    Subscription.findById.mockResolvedValue({ _id: 's1', user: 'other' });
    req = { params: { id: 's1' }, user: { _id: 'u1' } };
    res = createMockRes(); next = createNext();
    await getSubscriptionDetails(req, res, next);
    expect(next.calls[0]).toBeInstanceOf(Error);
    expect(next.calls[0].statusCode).toBe(401);
  });

  it('updateSubscription disallows changing owner and saves', async () => {
    const doc = {
      _id: 's1',
      user: { toString: () => 'u1' },
      save: vi.fn().mockResolvedValue(),
    };
    Subscription.findById.mockResolvedValue(doc);

    const req = { params: { id: 's1' }, user: { _id: 'u1' }, body: { name: 'New', user: 'evil' } };
    const res = createMockRes();
    const next = createNext();
    await updateSubscription(req, res, next);

    expect(doc.save).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.body.data.name).toBe('New');
    expect(res.body.data.user).not.toBe('evil');
  });

  it('deleteSubscription removes with transaction', async () => {
    const session = mockSession();
    mongoose.startSession.mockResolvedValue(session);
    Subscription.findById.mockResolvedValue({ _id: 's1', user: { toString: () => 'u1' } });
    Subscription.deleteOne.mockResolvedValue({ acknowledged: true });

    const req = { params: { id: 's1' }, user: { _id: 'u1' } };
    const res = createMockRes();
    const next = createNext();
    await deleteSubscription(req, res, next);

    expect(session.commitTransaction).toHaveBeenCalled();
    expect(Subscription.deleteOne).toHaveBeenCalledWith({ _id: 's1' }, { session });
    expect(res.statusCode).toBe(200);
  });

  it('cancelSubscription sets status cancelled', async () => {
    Subscription.findById.mockResolvedValue({ _id: 's1', user: { toString: () => 'u1' } });
    Subscription.findByIdAndUpdate.mockResolvedValue({ _id: 's1', status: 'cancelled' });

    const req = { params: { id: 's1' }, user: { _id: 'u1' } };
    const res = createMockRes();
    const next = createNext();
    await cancelSubscription(req, res, next);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });

  it('getUpcomingRenewals returns future subs', async () => {
    Subscription.find.mockResolvedValue([{ _id: 's2' }]);
    const req = {};
    const res = createMockRes();
    const next = createNext();
    await getUpcomingRenewals(req, res, next);
    expect(res.statusCode).toBe(200);
    expect(res.body.data[0]._id).toBe('s2');
  });
});