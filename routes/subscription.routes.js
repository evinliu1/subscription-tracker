import { Router } from 'express';
import authorize from '../middlewares/auth.middleware.js';
import { cancelSubscription, createSubscription, deleteSubscription, getAllSubscriptions, getSubscriptionDetails, getUpcomingRenewals, getUserSubscriptions, updateSubscription } from '../controllers/subscription.controller.js';

const subscriptionRouter = Router();

subscriptionRouter.get('/', authorize, getAllSubscriptions);

subscriptionRouter.get('/:id', authorize, getSubscriptionDetails);

subscriptionRouter.post('/', authorize, createSubscription);

subscriptionRouter.post('/:id', authorize, updateSubscription);

subscriptionRouter.delete('/:id', authorize, deleteSubscription);

subscriptionRouter.get('/user/:id', authorize, getUserSubscriptions);

subscriptionRouter.put('/:id/cancel', authorize, cancelSubscription);

subscriptionRouter.get('/upcoming-renewals', getUpcomingRenewals);

export default subscriptionRouter;