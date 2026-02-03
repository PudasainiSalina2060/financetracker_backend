/*
  Warnings:

  - A unique constraint covering the columns `[user_id,category_id,period]` on the table `Budget` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Budget_user_id_category_id_period_key" ON "Budget"("user_id", "category_id", "period");
