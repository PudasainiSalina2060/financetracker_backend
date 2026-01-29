import prisma from "../database/dbconnection.js";

// adding a new income or expense
export const addTransaction = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { account_id, category_id, type, amount, notes, date } = req.body;

    //checking if we have all required data
    if (!account_id || !category_id || !amount || !type) {
      return res.status(400).json({ message: "Please fill all fields" });
    }

    // converting amount to a number for calculation
    const amountValue = parseFloat(amount);

    // using $transaction 
    // DB operations succeed or fail together (if one step fails, nothing is saved)
    // this keeps the account balance and transaction record stay in sync
    // 'tx' is our temporary database client for this specific task
    const result = await prisma.$transaction(async (tx) => {
      
      //saving the actual transaction record
      const newTransaction = await tx.transaction.create({
        data: {
          user_id: userId,
          account_id: parseInt(account_id),
          category_id: parseInt(category_id),
          type: type, 
          amount: amountValue,
          date: new Date(date), 
          notes: notes
        }
      });

      //updating the current balance of the chosen account
      if (type === 'income') {
        // If income, adding it to balance
        await tx.account.update({
          where: { account_id: parseInt(account_id) },
          data: { 
            current_balance: { increment: amountValue } 
          }
        });
      } else {
        //if expense, subtracting amount from balance
        await tx.account.update({
          where: { account_id: parseInt(account_id) },
          data: { 
            current_balance: { decrement: amountValue } 
          }
        });
      }

      return newTransaction;
    });

    return res.status(201).json({ 
      message: "Transaction added", 
      transaction: result 
    });

  } catch (error) {
    console.error("Add transaction error:", error);
    return res.status(500).json({ message: "Failed to add transaction", error: error.message });
  }
};

//fetching transaction history with category and account details
export const getTransactions = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    //get last 20 tranactions
    const transactions = await prisma.transaction.findMany({
      where: { user_id: userId },
      orderBy: { date: 'desc' }, // newest transaction first
      take: 20, // last 20 tranactions
      
      //include:it gets data from other tables for us
      // we 'include' these so we can show the category name and account name in the list
      include: {
        category: { 
          select: { name: true, icon: true, color: true, type: true } 
        }, 
        account: { 
          select: { name: true, type: true } 
        }  
      }
    });

    return res.status(200).json(transactions);

  } catch (error) {
    console.error("Get Transactions Error:", error);
    return res.status(500).json({ message: "Failed to fetch transaction history" });
  }
};