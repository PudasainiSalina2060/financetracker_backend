//gooogle login controller
import jwt from "jsonwebtoken";
import prisma from "../database/dbconnection.js";

export const googleLogin = async (req, res) => {

    if (!req.firebaseUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const { uid, email, name, picture } = req.firebaseUser;

  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name,
        google_id: uid,
      },
    });
  }

  const accessToken = jwt.sign(
    { userId: user.user_id },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  res.json({
    message: "Google login successful",
    accessToken,
    user,
  });
};
