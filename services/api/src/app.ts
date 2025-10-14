import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { config } from './config';
import { authRouter } from './routes/auth';

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
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

  app.use('/auth', authRouter);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    void _next;
    // eslint-disable-next-line no-console
    console.error('Unhandled error in request pipeline', err);
    res.status(500).json({ message: 'Internal server error' });
  });

  return app;
};

export type CreateApp = typeof createApp;
