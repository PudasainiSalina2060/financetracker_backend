import prisma from "../database/dbconnection.js";
import bcrypt from "bcryptjs";

// Helper: get or create UserSettings row for a user
// This prevents crashes when the row dont exist yet
async function getOrCreateSettings(userId) {
  let settings = await prisma.userSettings.findUnique({
    where: { user_id: userId },
  });

  if (!settings) {
    settings = await prisma.userSettings.create({
      data: { user_id: userId },
      // all other fields use their defaults from schema
    });
  }

  return settings;
}

// Returns user profile (from User table) and notification prefs (from UserSettings table)
export const getSettingsController = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get profile data from User table
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { name: true, email: true, phone: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    //get or create settings if not exists
    const settings = await getOrCreateSettings(userId);

    // send all setting and profile data 
    return res.status(200).json({
      name: user.name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      currency: settings.currency,
      notifications_enabled: settings.notifications_enabled,
      notify_expense: settings.notify_expense,
      notify_income: settings.notify_income,
      notify_budget: settings.notify_budget,
      notify_bill_split: settings.notify_bill_split,
    });
  } catch (error) {
    console.error("Get settings error:", error);
    return res.status(500).json({ message: "Failed to load settings" });
  }
};

// Updates name and phone in the User table
export const updateProfileSettingsController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, phone } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const updatedUser = await prisma.user.update({
      where: { user_id: userId },
      data: { name, phone },
      select: { user_id: true, name: true, email: true, phone: true },
    });

    return res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ message: "Failed to update profile" });
  }
};


//saves the 4 notification toggles into UserSettings table
export const updateNotificationPrefsController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { notify_expense, notify_income, notify_budget, notify_bill_split } = req.body;

    // upsert: update if row exists, insert if not
    const settings = await prisma.userSettings.upsert({
      where: { user_id: userId },
      update: {
        notify_expense,
        notify_income,
        notify_budget,
        notify_bill_split,
      },
      create: {
        user_id: userId,
        notify_expense,
        notify_income,
        notify_budget,
        notify_bill_split,
      },
    });

    return res.status(200).json({
      message: "Notification preferences updated",
      settings,
    });
  } catch (error) {
    console.error("Update notification prefs error:", error);
    return res.status(500).json({ message: "Failed to update notification preferences" });
  }
};


// Verifies old password then saves new hashed password
export const changePasswordController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ message: "Both current and new password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { user_id: userId },
    });

    //google login users have no password_hash
    if (!user.password_hash) {
      return res.status(400).json({ message: "Password change not available for Google login" });
    }

    // Check if current password is correct
    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Hash and save new password
    const newHash = await bcrypt.hash(new_password, 10);
    await prisma.user.update({
      where: { user_id: userId },
      data: { password_hash: newHash },
    });

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ message: "Failed to change password" });
  }
};