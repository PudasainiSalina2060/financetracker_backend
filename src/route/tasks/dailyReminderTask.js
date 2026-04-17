import cron from "node-cron";
import admin from "../config/firebase.js";
import prisma from "../database/dbconnection.js";

export const startDailyReminderJob = () => {

  // runs every day at 8:00 PM
  cron.schedule("0 20 * * *", async () => {
    console.log("Daily reminder job started...");

    try {
      // get all users who have fcm token saved
      const users = await prisma.user.findMany({
        where: { fcm_token: { not: null } },
        select: { user_id: true, name: true, fcm_token: true },
      });

      //today from 12:00 AM to 11:59 PM
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      for (const user of users) {
        try {

          //Checking if user logged any transaction today
          const transactionToday = await prisma.transaction.findFirst({
            where: {
              user_id: user.user_id,
              date: { gte: todayStart, lte: todayEnd },
            },
          });

          // if user already active today: skip notification
          if (transactionToday) {
            console.log(`User ${user.user_id} already logged today, skipping`);
            continue;
          }

          //Checking if user has any budget set
          const activeBudget = await prisma.budget.findFirst({
            where: { user_id: user.user_id },
          });

          // Picking messages based on budget or no budget
          let messages = [];

          if (activeBudget) {
            messages = [
              "Your budget misses you! Log today's spending to stay on track.",
              "Keep your budget utilization accurate! Log today's expenses.",
              "Your budget is waiting! Don't let untracked spending ruin your goals.",
              "Budget check! Have you logged your expenses today?",
            ];
          } else {
            messages = [
              "Keep your wallet balance accurate! Log today's spending in seconds.",
              "Don't let your insights go stale! Log your transactions now.",
              "Keep the streak alive! Every entry helps you understand your habits.",
              "Forgot to log something? Update your expenses to see trends!",
            ];
          }

          // picking one random message
          const randomMsg = messages[Math.floor(Math.random() * messages.length)];

          // send push notification
          await admin.messaging().send({
            notification: {
              title: `Hey ${user.name || "there"}!`,
              body: randomMsg,
            },
            token: user.fcm_token,
          });

          console.log(`Reminder sent to user ${user.user_id}`);

        } catch (error) {
          // if token is expired or invalid, clearing it from db
          if (
            error.code === "messaging/invalid-registration-token" ||
            error.code === "messaging/registration-token-not-registered"
          ) {
            await prisma.user.update({
              where: { user_id: user.user_id },
              data: { fcm_token: null },
            });
            console.log(`Cleared bad token for user ${user.user_id}`);
          }
        }
      }

      console.log("Daily reminder job finished");

    } catch (error) {
      console.log("Error in daily reminder job:", error);
    }
  });

  console.log("Cron job scheduled — runs every day at 8 PM");
};