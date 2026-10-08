import jwt from "jsonwebtoken";

export function signToken(userId, username) {
  return jwt.sign({ userId, username }, process.env.JWT_SECRET ?? "dev-secret", { expiresIn: "7d" });
}

export function verifyToken(token) {
  if (!token) return undefined;
  try {
    return jwt.verify(token, process.env.JWT_SECRET ?? "dev-secret");
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
