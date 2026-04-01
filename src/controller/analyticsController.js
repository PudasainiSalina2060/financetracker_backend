import prisma from "../database/dbconnection.js";

// Helper function: returns start date based on period string
// Used to filter transactions for weekly, monthly or yearly
function getStartDate(period) {
  const now = new Date();

  if (period === "yearly") {
    return new Date(now.getFullYear(), 0, 1); // Jan 1 this year
  }

  if (period === "weekly") {
    //finding most recent Monday
    const day = now.getDay(); // 0=Sun, 1=Mon like 6=Sat
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  // Default = monthly: first day of this month
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

//Get summary of users transactions
// returns totalIncome, totalExpense, balance, transactionCount
export const getSummary = async (req, res) => {
  try {
    const userId = parseInt(req.user.userId);
    const period = req.query.period || "monthly"; //default monthly
    const startDate = getStartDate(period);

    //fetch transactions from database for user after startDate
    const transactions = await prisma.transaction.findMany({
      where: {
        user_id: userId,
        date: { gte: startDate },
      },
    });

    let totalIncome = 0;
    let totalExpense = 0;

    //sum income and expense separately
    for (const t of transactions) {
      if (t.type === "income") {
        totalIncome += parseFloat(t.amount);
      } else {
        totalExpense += parseFloat(t.amount);
      }
    }

    //sends summary response
    return res.status(200).json({
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      transactionCount: transactions.length,
    });
  } catch (error) {
    console.error("getSummary error:", error);
    return res.status(500).json({ message: "Failed to fetch summary" });
  }
};

//get expense breakdown by category
//returns each category with amount spent and % of total expense
export const getCategoryBreakdown = async (req, res) => {
  try {
    const userId = parseInt(req.user.userId);
    const period = req.query.period || "monthly";
    const startDate = getStartDate(period);

    //fetch only expense transactions with category info
    const transactions = await prisma.transaction.findMany({
      where: {
        user_id: userId,
        type: "expense",
        date: { gte: startDate },
      },
      include: { category: true },
    });

    //group transactions by category
    const categoryMap = {};
    for (const t of transactions) {
      const id = t.category_id;
      if (!categoryMap[id]) {
        categoryMap[id] = {
          name: t.category.name,
          color: t.category.color || "#009688",
          total: 0,
        };
      }
      categoryMap[id].total += parseFloat(t.amount);
    }

    // Convert map to sorted array with percentage of total
    const list = Object.values(categoryMap);
    const grandTotal = list.reduce((sum, c) => sum + c.total, 0);

    const categories = list
      .map((cat) => ({
        name: cat.name,
        color: cat.color,
        amount: cat.total,
        percent:
          grandTotal > 0
            ? parseFloat(((cat.total / grandTotal) * 100).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.amount - a.amount); //highest first

    return res.status(200).json({
      categories,
      totalExpense: grandTotal, 
    });
  } catch (error) {
    console.error("getCategoryBreakdown error:", error);
    return res.status(500).json({ message: "Failed to fetch categories" });
  }
};

//get income vs expense for last 6 months
//returns array of months with income and expense total
export const getIncomeVsExpense = async (req, res) => {
  try {
    const userId = parseInt(req.user.userId);
    const now = new Date();

    //prepare last 6 months structure 
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        year: d.getFullYear(),
        month: d.getMonth(), // 0-indexed
        label: d.toLocaleString("default", { month: "short" }), // "Jan"
        income: 0,
        expense: 0,
      });
    }

    //starting from 6 months ago
    const startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    //fetch transactions from last 6 months
    const transactions = await prisma.transaction.findMany({
      where: { user_id: userId, date: { gte: startDate } },
    });

    //sum of income/expense per month
    for (const t of transactions) {
      const tDate = new Date(t.date);
      const match = months.find(
        (m) => m.year === tDate.getFullYear() && m.month === tDate.getMonth()
      );
      if (match) {
        if (t.type === "income") match.income += parseFloat(t.amount);
        else match.expense += parseFloat(t.amount);
      }
    }

    //sends response with month label, income, and expense
    return res.status(200).json(
      months.map((m) => ({
        month: m.label,
        income: m.income,
        expense: m.expense,
      }))
    );
  } catch (error) {
    console.error("getIncomeVsExpense error:", error);
    return res.status(500).json({ message: "Failed to fetch income vs expense" });
  }
};


//get daily cumulative spending trend for current month
export const getSpendingTrend = async (req, res) => {
  try {
    const userId = parseInt(req.user.userId);
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);

    const transactions = await prisma.transaction.findMany({
      where: {
        user_id: userId,
        type: "expense",
        date: { gte: startDate },
      },
      orderBy: { date: "asc" },
    });

    //group total expense per day
    const dayMap = {};
    for (const t of transactions) {
      const day = new Date(t.date).getDate();
      if (!dayMap[day]) dayMap[day] = 0;
      dayMap[day] += parseFloat(t.amount);
    }

    //builds cumulative spending array
    const today = now.getDate();
    const result = [];
    let runningTotal = 0;

    for (let day = 1; day <= today; day++) {
      runningTotal += dayMap[day] || 0;
      result.push({ day, amount: runningTotal });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("getSpendingTrend error:", error);
    return res.status(500).json({ message: "Failed to fetch trend" });
  }
};

//get budget utilization for each category
//returns spent, budget limit, and percent used

export const getBudgetUtilization = async (req, res) => {
  try {
    const userId = parseInt(req.user.userId);
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);

    //fetch all budgets for user
    const budgets = await prisma.budget.findMany({
      where: { user_id: userId },
      include: { category: true },
    });

    const result = [];

    for (const budget of budgets) {
        //sum total spent in this category for current month
      const spentData = await prisma.transaction.aggregate({
        where: {
          user_id: userId,
          category_id: budget.category_id,
          type: "expense",
          date: { gte: startDate },
        },
        _sum: { amount: true },
      });

      const spent = parseFloat(spentData._sum.amount || 0);
      const limit = parseFloat(budget.limit_amount);
      const percent = limit > 0 ? parseFloat((spent / limit).toFixed(2)) : 0;

      result.push({
        name: budget.category.name,
        spent,
        budget: limit,
        percent, // 0.0 to 1.0+
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("getBudgetUtilization error:", error);
    return res.status(500).json({ message: "Failed to fetch budget utilization" });
  }
};