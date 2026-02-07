import prisma from "../database/dbconnection.js";

export const getBalanceSummary = async (req, res) => {
  try {
    const userId = req.user.userId;

    //get the total balance from all accounts: all time money in pocket
    const accounts = await prisma.account.aggregate({
      where: { user_id: userId },
      //Prisma method:adds up current balance of all accounts
      _sum: { current_balance: true } 
    });

    //get total income for the current month
    const income = await prisma.transaction.aggregate({
      where: { 
        user_id: userId, 
        type: 'income' 
      },
      //Prisma method:adds up all transaction amounts for income
      _sum: { amount: true } 
    });

    //get total expenses for the current month
    const expense = await prisma.transaction.aggregate({
      where: { 
        user_id: userId, 
        type: 'expense' 
      },
      //adds up all transaction amounts for expenses
      _sum: { amount: true } 
    });

    return res.status(200).json({
      totalBalance: accounts._sum.current_balance || 0,
      totalIncome: income._sum.amount || 0,
      totalExpense: expense._sum.amount || 0
    });

  } catch (error) {
    console.error("Dashboard Summary Error:", error);
    return res.status(500).json({ message: "error while fetching summary" });
  }
};

  //For Analytics(Pie Chart(Category-wise))
  //Get spending breakdown for Pie Chart (Category-wise)

export const getCategorySpending = async(req, res) => {
  try {
    const userId =req.user.userId;
    const now =new Date();
    
    //Getting the first day of the current month to filter transactions
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    //Grouping transactions by category_id and sum the amount for expenses
    const categoryStats = await prisma.transaction.groupBy({
      by:['category_id'],
      where:{
        user_id: userId,
        //only fetching expenses for the spending chart
        type:'expense', 
        date: { gte:startOfMonth }
      },
      //Prisma method: adds up the amount for each category group
      _sum: { amount: true }
    });

    //Combining the calculated totals with category details (name and color) for the chart
    //Fetching categoryfor each group in parallel to prepare the final dataset
    //using Promise.all to handle multiple asynchronous database 
    const chartData = await Promise.all(categoryStats.map(async (stat) => {
      const category = await prisma.category.findUnique({
        where: { category_id: stat.category_id },
        select: { name: true, color: true }
      });

      return {
        name: category?.name || 'Unknown',
        //Converting prisma decimal to float 
        amount: parseFloat(stat._sum.amount || 0),
        color: category?.color || '#000000' 
      };
    }));

    return res.status(200).json(chartData);

  } catch (error) {
    console.error("category Spending Error:", error);
    return res.status(500).json({ message: "error while fetching analytics data" });
  }
};