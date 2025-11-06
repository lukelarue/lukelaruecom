import type { RequestHandler } from 'express';

export type UserContext = {
  id: string;
  name?: string;
};

const USER_ID_HEADER = 'x-user-id';
const USER_NAME_HEADER = 'x-user-name';

export const requireUser: RequestHandler = (req, res, next) => {
  const userIdHeader = req.header(USER_ID_HEADER);
  const userNameHeader = req.header(USER_NAME_HEADER) ?? undefined;

  // Fallback to query parameters to support transports like SSE/EventSource
  const userIdQueryRaw = (req.query['userId'] ?? req.query[USER_ID_HEADER]) as
    | string
    | string[]
    | undefined;
  const userNameQueryRaw = (req.query['userName'] ?? req.query[USER_NAME_HEADER]) as
    | string
    | string[]
    | undefined;

  const userId = userIdHeader ?? (Array.isArray(userIdQueryRaw) ? userIdQueryRaw[0] : userIdQueryRaw);
  const userName = userNameHeader ?? (Array.isArray(userNameQueryRaw) ? userNameQueryRaw[0] : userNameQueryRaw);

  if (!userId) {
    return res.status(401).json({
      message: 'Missing authentication header',
      requiredHeader: USER_ID_HEADER,
    });
  }

  req.user = {
    id: userId,
    name: userName ?? undefined,
  };

  return next();
};

declare module 'express-serve-static-core' {
  interface Request {
    user?: UserContext;
  }
}
