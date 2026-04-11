import express from "express";
import authMiddleware from "../middleware/authenticate.js";
import {
  getSettingsController,
  updateProfileSettingsController,
  updateNotificationPrefsController,
  changePasswordController,
} from "../controller/settingController.js";

const router = express.Router();

router.use(authMiddleware);

//Load profile and notification preferences
router.get("/", getSettingsController);

//Update name andphone
router.patch("/profile", updateProfileSettingsController);

// Toggle notification preferences
router.patch("/notifications", updateNotificationPrefsController);

// Change password
router.patch("/password", changePasswordController);

export default router;