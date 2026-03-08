import { addAuditEvent } from "./data.js";

export function attachAudit(req, _res, next) {
  req.audit = ({ caseId, action, resourceType, resourceId, meta }) => {
    if (!req.auth?.userId) return null;
    return addAuditEvent({
      actorUserId: req.auth.userId,
      caseId,
      action,
      resourceType,
      resourceId,
      meta,
    });
  };

  next();
}
