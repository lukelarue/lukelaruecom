import type { RequestHandler } from 'express';

export type UserContext = {
  id: string;
  name?: string;
};

const USER_ID_HEADER = 'x-user-id';
const USER_NAME_HEADER = 'x-user-name';

export const requireUser: RequestHandler = (req, res, next) => {
  const userId = req.header(USER_ID_HEADER);

  if (!userId) {
    return res.status(401).json({
      message: 'Missing authentication header',
      requiredHeader: USER_ID_HEADER,
    });
  }

  req.user = {
    id: userId,
    name: req.header(USER_NAME_HEADER) ?? undefined,
  };

  return next();
};

declare module 'express-serve-static-core' {
  interface Request {
    user?: UserContext;
  }
}
