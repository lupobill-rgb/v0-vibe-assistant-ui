import jwt from 'jsonwebtoken';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../auth';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

/**
 * Middleware: extract tenantId from a **verified** JWT Bearer token.
 *
 * The token is verified against SUPABASE_JWT_SECRET to prevent forgery.
 *
 * Resolution order:
 *   1. Authorization: Bearer <jwt>  → verified claims.tenant_id | claims.tenantId | claims.sub
 *   2. X-Tenant-Id header           (development only — disabled in production)
 *
 * Returns 401 when no tenant context can be established.
 * Cross-tenant 403s are enforced per-resource via assertTenantOwnership().
 */
export function extractTenantFromJwt() {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!JWT_SECRET) {
      console.error('FATAL: SUPABASE_JWT_SECRET is not set — refusing to process requests');
      res.status(500).json({ error: 'Server misconfiguration: JWT secret not set' });
      return;
    }

    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);

      try {
        const payload = jwt.verify(token, JWT_SECRET, {
          algorithms: ['HS256'],
        }) as Record<string, unknown>;

        const tenantId =
          (payload.tenant_id as string | undefined) ||
          (payload.tenantId as string | undefined) ||
          (payload.sub as string | undefined);

        if (tenantId) {
          req.tenantId = String(tenantId);
          next();
          return;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown error';
        res.status(401).json({ error: `Invalid token: ${message}` });
        return;
      }
    }

    // Fallback: explicit header — ONLY allowed in development
    if (process.env.NODE_ENV === 'development') {
      const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
      if (headerTenantId) {
        req.tenantId = headerTenantId;
        next();
        return;
      }
    }

    res.status(401).json({ error: 'Authentication required: no tenant context found' });
  };
}

/**
 * Assert that a resource's tenant matches the authenticated tenant.
 *
 * Returns false and sends 403 when the tenants differ; returns true on success.
 * Usage:
 *   if (!assertTenantOwnership(resource.tenant_id, req, res)) return;
 */
export function assertTenantOwnership(
  resourceTenantId: string | undefined,
  req: AuthRequest,
  res: Response,
): boolean {
  if (!resourceTenantId || resourceTenantId !== req.tenantId) {
    res.status(403).json({ error: 'Access denied: resource belongs to a different tenant' });
    return false;
  }
  return true;
}
