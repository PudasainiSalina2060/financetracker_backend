import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  console.log("AUTH HEADER:", JSON.stringify(req.headers.authorization));


  //Check header exists
  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Must start with "Bearer "
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Invalid token format" });
  }

  // Extract token
  const token = authHeader.split(" ")[1]; // Bearer <token>

  //  Verify token
  jwt.verify(token, "abcd", (err, user) => {
    if (err) {
      return res.status(401).json({ message: "Token invalid or expired" });
    }

    req.user = user; // userId & email now available
    next();
  });
};

export default authMiddleware;
