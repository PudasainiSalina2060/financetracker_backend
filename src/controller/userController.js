import { generateAccessToken, generateRefreshToken } from "../auth/auth.js";
import prisma from "../database/dbconnection.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

export const registerController = async (req, res) => {
  //return res.json("smartbudget");
  try {
    const { name, email, password } = req.body;

    console.log("Register request body:", req.body);

    // validation
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    // check existing user
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Hashed password:", hashedPassword);

    // create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password_hash: hashedPassword,
      },
    });

    return res.status(201).json({
      message: "User registered successfully",
      user,
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      message: "Register API failed",
      error: error.message,
    });
  }
};

export const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Login request body:", req.body);

    // validation
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // compare password
    const isValid = await bcrypt.compare(
      password,
      user.password_hash
    );
    console.log("Password valid:", isValid);

    if (!isValid) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const accessToken = await generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user);

    //Saving the refresh token in UserSession Table
     await prisma.userSession.create({
      data: {
        user_id: user.user_id,
        refresh_token: refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    
    // success
    return res.status(200).json({
      message: "Login successful",
      user:{
        user_id: user.user_id,
        name: user.name,
        email: user.email,
      },
      accessToken,
      refreshToken,
    });
    

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const refreshController = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    console.log("REQ BODY:", req.body);

    // Validate input
    if (!refreshToken) {
      return res.status(401).json({
        message: "Refresh token is required",
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, "cdef");

    // Check refresh token in DB
    const session = await prisma.userSession.findFirst({
      where: {
        refresh_token: refreshToken,
        user_id: decoded.userId,
      },
    });

    if (!session) {
      return res.status(403).json({
        message: "Invalid refresh token",
      });
    }

    // Check expiry
    if (new Date() > session.expires_at) {
      return res.status(403).json({
        message: "Refresh token expired",
      });
    }

    //  Get user
    const user = await prisma.user.findUnique({
      where: { user_id: decoded.userId },
    });

    // Generate new access token
    const newAccessToken = await generateAccessToken(user);

    return res.status(200).json({
      accessToken: newAccessToken,
    });
    

  } catch (error) {
    console.error("Refresh token error:", error);

    return res.status(403).json({
      message: "Invalid or expired refresh token",
    });
  }
  
};

export const logoutController = async(req,res) => {
//simply clearing token from database - deleting refresh token
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        message: "Refresh token is required",
      });
    }

    // Delete refresh token from DB
    const deleted = await prisma.userSession.deleteMany({
      where: {
        refresh_token: refreshToken,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        message: "Refresh token not found or already logged out",
      });
    }

    return res.status(200).json({
      message: "Logout successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      message: "Logout failed",
    });
  }
};

export const profileController = async(req,res) => {
    //return res.json("Smart Budget Dashboard");
    try {
    const userId = req.user.userId; // assuming middleware decoded accessToken
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { user_id: true, name: true, email: true, phone: true, created_at: true },
    });
    return res.status(200).json({ user });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({ message: "Failed to fetch profile" });
  }
};

export const updateProfileController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, phone } = req.body;

    const updatedUser = await prisma.user.update({
      where: { user_id: userId },
      data: { name, phone },
      select: { user_id: true, name: true, email: true, phone: true },
    });

    return res.status(200).json({ message: "Profile updated", user: updatedUser });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ message: "Failed to update profile" });
  }
};

export const forgotPassword = async (req, res) => {
  //get the user bases on the posted email
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    //checking if user exist in database or not
    if (!user) {
      return res.status(404).json({
        message: "Could not find user with such email",
      });
    }

    // Prevent reset for Google users
    if (!user.password_hash) {
      return res.status(400).json({
        message: "Password reset not available for social login",
      });
    }

    //generate random reset token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    //storing tore hashed token with expiry
    await prisma.passwordResetToken.create({
      data: {
        user_id: user.user_id,
        token_hash: hashedToken,
        expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    // send email (raw token only)
    await sendResetPasswordEmail(user.email, rawToken);

    //respond success
    return res.status(200).json({
      message: "Password reset link sent to your email",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

