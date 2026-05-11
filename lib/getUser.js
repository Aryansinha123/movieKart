import jwt from "jsonwebtoken";

export function getUserFromToken(req) {
  try {
    const authHeader =
      req.headers.get("authorization");

    console.log("AUTH HEADER:", authHeader);

    if (!authHeader) {
      return null;
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.NEXTAUTH_SECRET
    );

    console.log("DECODED:", decoded);

    return decoded;
  } catch (error) {
    console.log(error);

    return null;
  }
}