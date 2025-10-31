import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { config } from './config.js';
import { createChatRouter } from './routes/chatRouter.js';
import type { MessageStoreContract } from './services/messageStore.js';

export type AppDependencies = {
  messageStore: MessageStoreContract;
};

export const createApp = ({ messageStore }: AppDependencies) => {
  const app = express();

  app.use(helmet());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(
    cors({
      origin: config.cors.origins,
      credentials: true,
    })
  );
  app.use(morgan(config.isProduction ? 'combined' : 'dev'));

  app.get('/healthz', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use(
    '/chat',
    createChatRouter({
      messageStore,
      defaultHistoryLimit: config.defaultHistoryLimit,
    })
  );

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    void _next;
    // eslint-disable-next-line no-console
    console.error('Unhandled error in request pipeline', err);
    res.status(500).json({ message: 'Internal server error' });
  });

  return app;
};
