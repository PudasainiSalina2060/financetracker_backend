import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "../database/dbconnection.js";

console.log("Prisma models:", Object.keys(prisma));

export const createResetPasswordToken = async (userId) => {
  //1.Generate raw token (sent to email)
  //crypto.randomBytes:creates random string token
  const rawToken = crypto.randomBytes(32).toString("hex");

  // 2. Hash token before saving
  const tokenHash = await bcrypt.hash(rawToken, 10);

  // 3. Save in DB
  await prisma.passwordResetToken.create({
    data: {
      user_id: userId,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    },
  });

  return rawToken;
};