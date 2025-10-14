import { Router } from 'express';

import { loginWithGoogle, getSession, signOut } from '../controllers/authController';

export const authRouter = Router();

authRouter.post('/google', loginWithGoogle);
authRouter.get('/session', getSession);
authRouter.post('/signout', signOut);
