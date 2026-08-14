import jwt from "jsonwebtoken";
import { AppError } from "./AppError.js";

const getSecret = () => process.env.JWT_SECRET || "default_super_secret_dev_key";
const getExpiry = () => process.env.JWT_EXPIRY || "7d";

export class JwtHelper {
  static generateToken(payload) {
    try {
      const secret = getSecret();
      const expiry = getExpiry();
      const token = jwt.sign(payload, secret, {
        expiresIn: expiry,
      });
      return token;
    } catch (error) {
      throw new AppError("Error generating JWT token", 500);
    }
  }

  static verifyToken(token) {
    try {
      const secret = getSecret();
      const decoded = jwt.verify(token, secret);
      return decoded;
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new AppError("Token has expired", 401);
      }
      throw new AppError("Invalid token", 401);
    }
  }

  static decodeToken(token) {
    try {
      const decoded = jwt.decode(token);
      return decoded;
    } catch (error) {
      throw new AppError("Error decoding token", 400);
    }
  }
}
