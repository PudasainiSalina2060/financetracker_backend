import { Router } from "express";
import authMiddleware from "../middleware/authenticate.js";
import { getNotifications, markAsRead } from "../controller/notificationController.js";

const router = Router();

router.use(authMiddleware);

//Get the list of alerts (80% near and 100% exceeded)
router.get("/all", getNotifications);

//Marking a specific notification as seen by user
router.put("/read/:id", markAsRead);

export default router;