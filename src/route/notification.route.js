import { Router } from "express";
import authMiddleware from "../middleware/authenticate.js";
import { getNotifications, markAsRead,  markAllAsRead, deleteNotification, saveFcmToken } from "../controller/notificationController.js";

const router = Router();

router.use(authMiddleware);

//Get the list of alerts (80% near and 100% exceeded)
router.get("/all", getNotifications);

//Marking a specific notification as seen by user
router.put("/read/:id", markAsRead);

//Marking ALL notification as read
router.put("/read-all", markAllAsRead);

//Deleting one specific notification
router.delete("/delete/:id", deleteNotification);

//Save users FCM/device token for push notifications
router.post("/save-token", saveFcmToken);

export default router;