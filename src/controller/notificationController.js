import prisma from "../database/dbconnection.js";

//getting all notifications for the user
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;

    const notifications = await prisma.notification.findMany({
      where: {user_id: userId},
      orderBy: {timestamp: 'desc' }, 
    });

    return res.status(200).json(notifications);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "failed to fetch notifications" });
  }
};

//marking a single notification as read
export const markAsRead = async (req, res) => {
  try {
    const {id} = req.params;
    await prisma.notification.update({
      where: {notification_id: parseInt(id) },
      data: {is_read: true }
    });
    return res.status(200).json({ message: "notification marked as read" });
  } catch (error) {
    return res.status(500).json({ message: "error updating notification" });
  }
};

//marking All notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
 
    // updateMany updates every notification that belongs to this user
    await prisma.notification.updateMany({
      where: {
        user_id: userId,
        is_read: false, // only update unread ones 
      },
      data: { is_read: true },
    });
 
    return res.status(200).json({ message: "all notifications marked as read" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "error marking all as read" });
  }
};

//deleting single notification
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
 
    await prisma.notification.delete({
      where: { notification_id: parseInt(id) },
    });
 
    return res.status(200).json({ message: "notification deleted" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "error deleting notification" });
  }
};