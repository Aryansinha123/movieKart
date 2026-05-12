import jwt from "jsonwebtoken";

export function getUserFromToken(req) {
  try {
    // Next.js headers.get is generally case-insensitive, 
    // but we can be explicit if needed.
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.split(" ")[1];
    if (!token || token === "null" || token === "undefined") {
      return null;
    }

    const decoded = jwt.verify(
      token,
      process.env.NEXTAUTH_SECRET
    );

    return decoded;
  } catch (error) {
    // Only log actual verification errors, not missing headers
    if (error.name !== "JsonWebTokenError" && error.name !== "TokenExpiredError") {
      console.log("JWT Verify Error:", error.message);
    }
    return null;
  }
}