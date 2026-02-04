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
    //checking if this expense triggers an alert for budget notifications
    if (type === 'expense') {
      checkBudget(userId, parseInt(category_id)); 
    }

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

//Deleting a transaction and reversing the balance change
export const deleteTransactions = async( req, res)=>{
  try{
    const { id } = req.params; //get id from the URL (/delete/1)
    const userId = req.user.userId;

    //find the transaction to see how much it was and what type
    const transaction = await prisma.transaction.findFirst({
      where:{
        transaction_id: parseInt(id),
        //ensuring user owns this transaction
        user_id : userId
      }
    });

    if(!transaction) {
      return res.status(404).json({message: "Transaction not found"});
    }
    const amountValue = parseFloat(transaction.amount);

    //Using $transaction to delete and update balance at the same time
    await prisma.$transaction(async(tx)=>{

      //Deleting the transaction record
      await tx.transaction.delete({
        where : {transaction_id: parseInt(id)}
      });

      //Reversing the balance as per transaction deleted
      if(transaction.type == 'income') {
        //if income transaction is deleted, we subtract it from account balance
        await tx.account.update({
          where: {account_id : transaction.account_id },
          data: {current_balance: { decrement: amountValue } }
        });
      }else{
        //if expenses is deleted, we add money back to account
        await tx.account.update({
          where: { account_id: transaction.account_id},
          data: {current_balance: { increment: amountValue}}
        });
      }
    });
    return res.status(200).json({message: "Transaction deleted and balance updated"});
  }catch(error){
    console.error("Delete Transaction error:",error);
    return res.status(500).json({message: "failed to delete transaction"});
  }
};

//Function to check budget limits 
const checkBudget = async (userId, catId) => {
  //get the budget for this category
  const budget = await prisma.budget.findFirst({
    where: {user_id: userId, category_id: catId }
  });

  //if no budget set, stop here
  if (!budget) return; 

  //sum current month expenses
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const total = await prisma.transaction.aggregate({
    where: {
      user_id: userId,
      category_id: catId,
      type: 'expense',
      date: { gte: startOfMonth }
    },
    //_sum: Prisma aggregator for adding up all the amount values from the filtered transactions
    _sum: { amount: true }
  });

  const spent = parseFloat(total._sum.amount || 0);
  const limit = parseFloat(budget.limit_amount);
  const percent = (spent / limit) * 100;

  //creating notifications based on percentage
  if (percent >= 100 && !budget.alert_sent_100) {
    // send budget exceeded (100% alert)
    await prisma.notification.create({
      data: {
        user_id: userId,
        type: 'budget_exceeded',
        message: `Limit exceeded for category ${catId}`,
      }
    });
    // mark as sent so we don't spam
    await prisma.budget.update({
      where: { budget_id: budget.budget_id },
      data: { alert_sent_100: true }
    });
  } 
  else if (percent >= 80 && !budget.alert_sent_80 && !budget.alert_sent_100) {
    //send 80% alert
    await prisma.notification.create({
      data: {
        user_id: userId,
        type: 'budget_near',
        message: `You reached 80% of your budget for category ${catId}`,
      }
    });
    await prisma.budget.update({
      where: { budget_id: budget.budget_id },
      data: { alert_sent_80: true }
    });
  }
};