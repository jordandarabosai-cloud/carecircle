import { randomUUID } from "node:crypto";
import { query } from "./db.js";

export function attachAudit(req, _res, next) {
  req.audit = async ({ caseId, action, resourceType, resourceId, meta }) => {
    if (!req.auth?.userId) return null;

    const result = await query(
      `INSERT INTO audit_events(id, actor_user_id, case_id, action, resource_type, resource_id, meta)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        randomUUID(),
        req.auth.userId,
        caseId || null,
        action,
        resourceType,
        String(resourceId),
        meta || null,
      ]
    );

    return result.rows[0];
  };

  next();
}
