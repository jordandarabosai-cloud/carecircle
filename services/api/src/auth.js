import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "carecircle-dev-secret";
const EXPIRES_IN = "12h";

export function signUserToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
      fullName: user.fullName,
    },
    JWT_SECRET,
    { expiresIn: EXPIRES_IN }
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.auth = {
      userId: decoded.sub,
      role: decoded.role,
      email: decoded.email,
      fullName: decoded.fullName,
    };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
