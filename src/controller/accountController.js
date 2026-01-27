import prisma from "../database/dbconnection.js";

//Creating a new Account (Wallet)
export const addAccount = async (req, res) => {
  try {
    const { name, type, initial_balance } = req.body;
    const userId = req.user.userId;

    if (!name || !type || initial_balance === undefined) {
      return res.status(400).json({ message: "Name, type, and initial balance are required" });
    }

    const newAccount = await prisma.account.create({
      data: {
        user_id: userId,
        name,
        type, 
        // Convert initial_balance to a number for database storage
        initial_balance: parseFloat(initial_balance),
        current_balance: parseFloat(initial_balance), 
      },
    });

    return res.status(201).json({ message: "Account created", account: newAccount });
  } catch (error) {
    console.error("Add account error:", error);
    return res.status(500).json({ message: "Failed to create account" });
  }
};

//Updating existing account
export const updateAccount = async (req, res) => {
  try {
    const { accountId } = req.params;
    const { name, type, current_balance } = req.body;
    const userId = req.user.userId;
    // updateMany allows us to filter by both account_id and user_id(for security)
    const updatedAccount = await prisma.account.updateMany({
      where: {
        account_id: parseInt(accountId),
        user_id: userId, // Checking if the account belongs to user
      },
      data: {
        name,
        type,
        current_balance: current_balance ? parseFloat(current_balance) : undefined,
      },
    });

    if (updatedAccount.count === 0) {
      return res.status(404).json({ message: "Account not found or unauthorized" });
    }

    return res.status(200).json({ message: "Account updated successfully" });
  } catch (error) {
    console.error("Update account error:", error);
    return res.status(500).json({ message: "Failed to update account" });
  }
};

// Deleting the existing account
export const deleteAccount = async (req, res) => {
  try {
    const { accountId } = req.params;
    const userId = req.user.userId;
    const id = parseInt(accountId);

    // Checking the account first to make sure it belongs to the logged-in user
    const account = await prisma.account.findFirst({
      where: {
        account_id: id,
        user_id: userId,
      },
    });

    // If the account doesn't exist or belongs to someone else
    if (!account) {
      return res.status(404).json({ message: "Account not found or access denied" });
    }

    // Checking if there are any transactions linked to this account
    const transactionCount = await prisma.transaction.count({
      where: { account_id: id },
    });

    if (transactionCount > 0) {
      return res.status(400).json({ 
        message: "Cannot delete account with transaction history. Please clear your transaction records first." 
      });
    }

    // Deleting account after checking we know it is empty and belongs to the user
    await prisma.account.delete({
      where: { account_id: id },
    });

    return res.status(200).json({ message: "Account deleted successfully" });

  } catch (error) {
    console.error("Delete account error:", error);
    return res.status(500).json({ message: "Failed to delete account" });
  }
};

//Getting all accounts for the logged in user
export const getAccounts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const accounts = await prisma.account.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
    });
    return res.status(200).json(accounts);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch accounts" });
  }
};