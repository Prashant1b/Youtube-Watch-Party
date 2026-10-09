import jwt from "jsonwebtoken";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("JWT_SECRET environment variable is required");
}

export function signToken(userId, username) {
  return jwt.sign({ userId, username }, jwtSecret, { expiresIn: "7d" });
}

export function verifyToken(token) {
  if (!token) return undefined;
  try {
    return jwt.verify(token, jwtSecret);
  } catch {
    return undefined;
  }
}

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ message: "Authentication required" });
  req.user = user;
  next();
}
