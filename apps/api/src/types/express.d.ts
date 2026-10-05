import 'express';

export interface AuthUser {
  id: number;
  email: string;
  role: 'customer' | 'admin';
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
    cartToken?: string;
  }
}
