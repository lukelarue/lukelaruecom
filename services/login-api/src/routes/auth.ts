import { Router, type RequestHandler } from 'express';

import { loginWithGoogle, getSession, signOut } from '../controllers/authController';

export const authRouter = Router();

type AsyncRequestHandler = (
  ...args: Parameters<RequestHandler>
) => ReturnType<RequestHandler> | Promise<unknown>;

const wrapAsync = (handler: AsyncRequestHandler): RequestHandler => {
  return (req, res, next) => {
    try {
      const result = handler(req, res, next);
      if (result instanceof Promise) {
        void result.catch(next);
      }
    } catch (error) {
      next(error);
    }
  };
};

authRouter.post('/google', wrapAsync(loginWithGoogle));
authRouter.get('/session', wrapAsync(getSession));
authRouter.post('/signout', wrapAsync(signOut));
