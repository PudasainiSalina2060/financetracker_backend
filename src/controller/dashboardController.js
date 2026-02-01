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