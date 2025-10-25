import express from 'express';
import cookieParser from 'cookie-parser';

import { PORT } from './config/env.js';
import userRouter from './routes/user.routes.js';
import authRouter from './routes/auth.routes.js';
import subscriptionRouter from './routes/subscription.routes.js';
import connectToDatabase from './database/mongodb.js';
import errorMiddleware from './middlewares/error.middleware.js';
import arcjetMiddleware from './middlewares/arcjet.middleware.js';
import workflowRouter from './routes/workflow.routes.js';


const app = express();

//middleware
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(arcjetMiddleware);

// routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/subscriptions', subscriptionRouter);
app.use('/api/v1/workflows', workflowRouter)

//error handling middleware
app.use(errorMiddleware);

app.get('/', (req, res) => {
    res.send(`THIS IS JOHN CENA.\n PORT IS - ${PORT}`);
});

app.listen( PORT, async () => {
    console.log(`LISTENING ON PORT : http://localhost:${PORT}\n`);

    await connectToDatabase();
});

export default app;