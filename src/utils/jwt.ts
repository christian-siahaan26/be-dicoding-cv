import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.JWT_SECRET as string;

/**
 * Generates a JWT token with the user's email as payload.
 * @param email - The email of the user to store in the token.
 * @param id - The id of the user to store in the token.
 * @returns A signed JWT token.
 */
export const generateToken = (email: string, id: number): string => {
  const payload = { email, id };
  const options = { expiresIn: 3600 };

  return jwt.sign(payload, SECRET_KEY, options);
};

export const verifyToken = (
  token: string
): { email: string; id: number } | null => {
  try {
    const decoded = jwt.verify(token, SECRET_KEY) as {
      email: string;
      id: number;
    };
    return { ...decoded };
  } catch (err) {
    return null;
  }
};
