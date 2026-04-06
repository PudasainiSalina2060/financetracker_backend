import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "../database/dbconnection.js";

console.log("Prisma models:", Object.keys(prisma));

export const createResetPasswordToken = async (userId) => {
  //generate raw token (sent to email)
  //crypto.randomBytes:creates random string token
  const rawToken = crypto.randomBytes(2).toString("hex");

  //hash token before saving
  const tokenHash = await bcrypt.hash(rawToken, 10);

  //save in DB
  await prisma.passwordResetToken.create({
    data: {
      user_id: userId,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    },
  });

  return rawToken;
};