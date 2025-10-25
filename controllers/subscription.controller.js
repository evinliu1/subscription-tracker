import mongoose from "mongoose";
import Subscription from "../models/subscription.model.js";
import { workflowClient } from "../config/upstash.js";
import { SERVER_URL } from "../config/env.js";

export const createSubscription = async (req, res, next) => {
    try {
        const subscription = await Subscription.create({
            ... req.body,
            user: req.user._id,
        });

        const { workflowRunId } = await workflowClient.trigger({
            url: `${SERVER_URL}/api/v1/workflows/subscription/reminder`,
            body: {
                subscriptionId: subscription.id,
            },
            headers: {
                'content-type': 'application/json',
            },
            retries: 0,
        });

        res.status(201).json({
            success: true,
            data: subscription, workflowRunId
        });

    } catch (error) {
        next(error);
    }
};

export const getUserSubscriptions = async (req, res, next) => {
    try {

        // Ensure the authenticated user is requesting their own subscriptions
        if (req.user.id !== req.params.id) {
            const error = new Error('You are not the owner of this account');
            error.statusCode = 401;
            throw error;
        }

        const subscriptions = await Subscription.find({ user: req.params.id });

        res.status(200).json({
            success: true,
            data: subscriptions
        });

    } catch (error) {
        next(error);
    }   
}

export const getAllSubscriptions = async (req, res, next) => {
    try {
        
        const subscriptions = await Subscription.find();

        res.status(200).json({
            success: true,
            data: subscriptions
        });

    } catch (error) {
        next(error);
    }
}

export const getSubscriptionDetails = async (req, res, next) => {
    try {
        const subscriptionDetails = await Subscription.findById(req.params.id);
        if (!subscriptionDetails) {
            const error = new Error('Could not find subscription details');
            error.statusCode = 404;
            throw error;
        }

        if (subscriptionDetails.user.toString() !== req.user._id.toString()) {
            const error = new Error('You are not the owner of this subscription');
            error.statusCode = 401;
            throw error;
        }

        res.status(200).json({
            success: true,
            data: subscriptionDetails
        });

    } catch (error) {
        next(error);
    }
}

export const updateSubscription = async (req, res, next) => {
    try {
        // Find subscription
        const subscription = await Subscription.findById(req.params.id);
        if (!subscription) {
            const error = new Error('Could not find subscription');
            error.statusCode = 404;
            throw error;
        }

        // Ownership check
        if (subscription.user.toString() !== req.user._id.toString()) {
            const error = new Error('You are not the owner of this subscription');
            error.statusCode = 401;
            throw error;
        }

        // Prepare updates (prevent changing owner)
        const updates = { ...req.body };
        delete updates.user;

        // Apply updates and save (runs validators/hooks)
        Object.keys(updates).forEach((thisKey) => {
            subscription[thisKey] = updates[thisKey];
        });
        await subscription.save();

        res.status(200).json({
            success: true,
            data: subscription
        });

    } catch (error) {
        next(error);
    }
}

export const deleteSubscription = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        // Find subscription
        const subscription = await Subscription.findById(req.params.id);
        if (!subscription) {
            const error = new Error('Could not find subscription');
            error.statusCode = 404;
            throw error;
        }

        // Ownership check
        if (subscription.user.toString() !== req.user._id.toString()) {
            const error = new Error('You are not the owner of this subscription');
            error.statusCode = 401;
            throw error;
        }

        // Remove subscription (use doc.deleteOne() to trigger middleware/hooks)
        await Subscription.deleteOne({_id: req.params.id}, {session});

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            data: {}
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
}

export const cancelSubscription = async (req, res, next) => {
    try {
        // load and check ownership
        const subscription = await Subscription.findById(req.params.id);
        if (!subscription) {
            const error = new Error('Could not find subscription you are looking for');
            error.statusCode = 404;
            throw error;
        }
        if (subscription.user.toString() !== req.user._id.toString()) {
            const error = new Error('You are not the owner of this subscription');
            error.statusCode = 401;
            throw error;
        }

        const updated = await Subscription.findByIdAndUpdate(
            req.params.id,
            { status: 'cancelled' },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            data: updated
        });

    } catch (error) {
        next(error);
    }
}

export const getUpcomingRenewals = async (req, res, next) => {
    try {
        console.log('hello')
        const now = new Date();

        const upcomingRenewals = await Subscription.find({
            renewalDate: { $gt: now }
        });

        res.status(200).json({
            success: true,
            data: upcomingRenewals
        });

    } catch (error) {
        next(error);
    }
}