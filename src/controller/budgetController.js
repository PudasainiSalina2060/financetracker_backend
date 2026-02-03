import prisma from "../database/dbconnection.js";

// Set a budget (create new or update existing budget
export const setBudget = async (req, res) => {
  try {
    const userId = req.user.userId;
    //monthly limit
    const { category_id, limit_amount } = req.body; 

    //upsert method: it updates if found, creates if not.
    //prevents duplicates
    const budget = await prisma.budget.upsert({
      where: {
        user_id_category_id_period: {
          user_id: userId,
          category_id: parseInt(category_id),
          period: 'monthly' 
        }
      },
      //if budget exists : just updating the limit and reset alerts
      update: {
        limit_amount: parseFloat(limit_amount),
        alert_sent_80: false, 
        alert_sent_100: false
      },
      //f ibudget does not exist, creating a new one
      create: {
        user_id: userId,
        category_id: parseInt(category_id),
        limit_amount: parseFloat(limit_amount),
        period: 'monthly',
        start_date: new Date()
      }
    });

    return res.status(200).json({ message: "Budget saved successfully", budget });

  } catch (error) {
    console.error("Set Budget Error:", error);
    return res.status(500).json({ message: "Error setting budget" });
  }
};

//get Budgets and check Progress
export const getBudgets = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // get date for the 1st of the current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

    //get all budgets the user has set
    const budgets = await prisma.budget.findMany({
      where: { user_id: userId },
      include: { category: true } // joins the category table to get the name like "Food")
    });

    // Loop through each budget to calculate spending
    // Promise.all used: as we are running a database query inside a map loop
    const budgetProgress = await Promise.all(budgets.map(async (budget) => {
      
      //calculate total expenses for this specific category this month
      const totalSpent = await prisma.transaction.aggregate({
        where: {
          user_id: userId,
          category_id: budget.category_id,
          type: 'expense',
          date: { gte: firstDay } 
        },
        _sum: { amount: true }
      });

      const spent = parseFloat(totalSpent._sum.amount || 0);
      const limit = parseFloat(budget.limit_amount);
      const percentage = (spent / limit) * 100;

      return {
        category: budget.category.name,
        limit: limit,
        spent: spent,
        remaining: limit - spent,
        //percentage set
        percentage: percentage.toFixed(1) + "%", 
        //ternary operator to check percentage is 100 or more
        status: percentage >= 100 ? "Over Budget" : "On Track"
      };
    }));

    return res.status(200).json(budgetProgress);

  } catch (error) {
    console.error("Get Budget Error:", error);
    return res.status(500).json({ message: "Error fetching budget status" });
  }
};