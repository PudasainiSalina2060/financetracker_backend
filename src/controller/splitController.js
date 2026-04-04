import prisma from "../database/dbconnection.js";

// Create a new group
export const createGroup = async (req, res) => {
  try {
    const userId = parseInt(req.user.userId);
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Group name is required" });
    }

    // Create the group and automatically add creator as a member
    const group = await prisma.$transaction(async (tx) => {
      const newGroup = await tx.group.create({
        data: {
          user_id: userId,
          name: name,
        },
      });

      // Add the creator as the first member
      await tx.groupMember.create({
        data: {
          group_id: newGroup.group_id,
          user_id: userId,
        },
      });

      return newGroup;
    });

    // Send a notification that a group was created
    await prisma.notification.create({
      data: {
        user_id: userId,
        type: "group_expense",
        message: `Group "${name}" created successfully`,
      },
    });

    return res.status(201).json({ message: "Group created", group });
  } catch (error) {
    console.error("Create group error:", error);
    return res.status(500).json({ message: "Failed to create group" });
  }
};

// Get all groups for the logged-in user
export const getGroups = async (req, res) => {
  try {
    const userId = parseInt(req.user.userId);

    // Find all groups where the user is a member
    const memberships = await prisma.groupMember.findMany({
      where: { user_id: userId },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: { select: { name: true, phone: true } },
                external: { select: { name: true, phone: true } },
              },
            },
          },
        },
      },
    });

    // Extract the group data from memberships
    const groups = memberships.map((m) => m.group);

    return res.status(200).json(groups);
  } catch (error) {
    console.error("Get groups error:", error);
    return res.status(500).json({ message: "Failed to fetch groups" });
  }
};

// Add a member to an existing group
export const addMemberToGroup = async (req, res) => {
  try {
    const userId = parseInt(req.user.userId);
    const groupId = parseInt(req.params.groupId);
    const { phone, name } = req.body; // phone of the person to add

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    // Check if this phone belongs to a registered user
    const registeredUser = await prisma.user.findFirst({
      where: { phone: phone },
    });

    if (registeredUser) {
      // Check if already a member
      const alreadyMember = await prisma.groupMember.findFirst({
        where: { group_id: groupId, user_id: registeredUser.user_id },
      });

      if (alreadyMember) {
        return res.status(400).json({ message: "User is already in this group" });
      }

      // Add as a registered member
      const member = await prisma.groupMember.create({
        data: {
          group_id: groupId,
          user_id: registeredUser.user_id,
        },
      });

      // Notify the added user
      await prisma.notification.create({
        data: {
          user_id: registeredUser.user_id,
          type: "invite",
          message: `You have been added to a group`,
        },
      });

      return res.status(201).json({ message: "Registered user added", member });
    } else {
      // Person is not on the app, add as external member
      // Check if this external person was already added by this user
      let external = await prisma.externalMember.findFirst({
        where: { phone: phone, added_by_user_id: userId },
      });

      // If not found, create a new external member
      if (!external) {
        external = await prisma.externalMember.create({
          data: {
            name: name || "Unknown",
            phone: phone,
            added_by_user_id: userId,
          },
        });
      }

      // Add the external member to the group
      const member = await prisma.groupMember.create({
        data: {
          group_id: groupId,
          external_contact_id: external.external_id,
        },
      });

      return res.status(201).json({ message: "External contact added", member });
    }
  } catch (error) {
    console.error("Add member error:", error);
    return res.status(500).json({ message: "Failed to add member" });
  }
};

// Add a group expense and split it
export const addGroupExpense = async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const userId = parseInt(req.user.userId);
    const { paid_by_member_id, amount, note, date, split_type, custom_splits } = req.body;

    // split_type: "equal" or "custom"
    // custom_splits: [{ member_id: 1, amount: 500 }, { member_id: 2, amount: 300 }]

    if (!paid_by_member_id || !amount) {
      return res.status(400).json({ message: "Paid by and amount are required" });
    }

    const totalAmount = parseFloat(amount);

    // Get all members in the group
    const members = await prisma.groupMember.findMany({
      where: { group_id: groupId },
    });

    if (members.length === 0) {
      return res.status(400).json({ message: "No members found in this group" });
    }

    // Calculate how much each person owes
    let shares = [];

    if (split_type === "equal") {
      // Equal split: divide total by number of members
      const shareAmount = parseFloat((totalAmount / members.length).toFixed(2));

      shares = members.map((member) => ({
        member_id: member.member_id,
        amount: shareAmount,
      }));
    } else if (split_type === "custom") {
      // Custom split: use the amounts provided
      if (!custom_splits || custom_splits.length === 0) {
        return res.status(400).json({ message: "Custom splits are required" });
      }

      // Validate that custom splits add up to the total
      const customTotal = custom_splits.reduce((sum, s) => sum + parseFloat(s.amount), 0);
      if (Math.abs(customTotal - totalAmount) > 0.01) {
        return res.status(400).json({ message: "Custom split amounts do not add up to the total" });
      }

      shares = custom_splits;
    } else {
      return res.status(400).json({ message: "Split type must be 'equal' or 'custom'" });
    }

    // Save the expense and all split shares in one transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the group expense record
      const expense = await tx.groupExpense.create({
        data: {
          group_id: groupId,
          paid_by_member_id: parseInt(paid_by_member_id),
          amount: totalAmount,
          note: note || "",
          date: new Date(date),
        },
      });

      // Create a split share for each member
      for (const share of shares) {
        const isPayer = parseInt(share.member_id) === parseInt(paid_by_member_id);

        await tx.splitShare.create({
          data: {
            group_expense_id: expense.group_expense_id,
            member_id: parseInt(share.member_id),
            amount: parseFloat(share.amount),
            is_settled: isPayer,
          },
        });
      }

      return expense;
    });

    // Notify the user who added the expense
    await prisma.notification.create({
      data: {
        user_id: userId,
        type: "group_expense",
        message: `Expense of NPR ${totalAmount} added to group`,
      },
    });

    return res.status(201).json({ message: "Expense added and split", expense: result });
  } catch (error) {
    console.error("Add group expense error:", error);
    return res.status(500).json({ message: "Failed to add group expense" });
  }
};

// Get all expenses for a group
export const getGroupExpenses = async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);

    const expenses = await prisma.groupExpense.findMany({
      where: { group_id: groupId },
      orderBy: { date: "desc" },
      include: {
        paid_by: {
          include: {
            user: { select: { name: true } },
            external: { select: { name: true } },
          },
        },
        shares: {
          include: {
            member: {
              include: {
                user: { select: { name: true } },
                external: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    return res.status(200).json(expenses);
  } catch (error) {
    console.error("Get group expenses error:", error);
    return res.status(500).json({ message: "Failed to fetch expenses" });
  }
};

// Mark a split share as settled (paid)
export const settleShare = async (req, res) => {
  try {
    const shareId = parseInt(req.params.shareId);
    const userId = parseInt(req.user.userId);
    const { method, to_member_id, group_id } = req.body;

    // method: "cash", "bank", or "card"

    if (!method) {
      return res.status(400).json({ message: "Payment method is required" });
    }

    // Find the share first
    const share = await prisma.splitShare.findFirst({
      where: { share_id: shareId },
    });

    if (!share) {
      return res.status(404).json({ message: "Share not found" });
    }

    if (share.is_settled) {
      return res.status(400).json({ message: "This share is already settled" });
    }

    // Mark the share as settled and create a settlement record
    await prisma.$transaction(async (tx) => {
      // Update the share to settled
      await tx.splitShare.update({
        where: { share_id: shareId },
        data: { is_settled: true },
      });

      // Record the settlement transaction
      await tx.settlement.create({
        data: {
          group_id: parseInt(group_id),
          from_member_id: share.member_id,
          to_member_id: parseInt(to_member_id),
          amount: share.amount,
          method: method,
          date: new Date(),
        },
      });
    });

    // Notify the user
    await prisma.notification.create({
      data: {
        user_id: userId,
        type: "settlement",
        message: `Settlement of NPR ${share.amount} recorded via ${method}`,
      },
    });

    return res.status(200).json({ message: "Share settled successfully" });
  } catch (error) {
    console.error("Settle share error:", error);
    return res.status(500).json({ message: "Failed to settle share" });
  }
};

// Delete a group expense and its shares
export const deleteGroupExpense = async (req, res) => {
  try {
    const expenseId = parseInt(req.params.expenseId);

    // Check if the expense exists
    const expense = await prisma.groupExpense.findFirst({
      where: { group_expense_id: expenseId },
    });

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    // Delete shares first (because of foreign key), then the expense
    await prisma.$transaction(async (tx) => {
      await tx.splitShare.deleteMany({
        where: { group_expense_id: expenseId },
      });

      await tx.groupExpense.delete({
        where: { group_expense_id: expenseId },
      });
    });

    return res.status(200).json({ message: "Expense deleted" });
  } catch (error) {
    console.error("Delete expense error:", error);
    return res.status(500).json({ message: "Failed to delete expense" });
  }
  
};

//Update Group expense when new member added
export const updateGroupExpense = async (req, res) => {
  try {
    const expenseId = parseInt(req.params.expenseId);
    const { note, amount, paid_by_member_id, split_type, custom_splits } = req.body;

    const expense = await prisma.groupExpense.findFirst({
      where: { group_expense_id: expenseId },
    });

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    const totalAmount = parseFloat(amount);

    // Get current members of the group
    const members = await prisma.groupMember.findMany({
      where: { group_id: expense.group_id },
    });

    // Recalculate shares
    let shares = [];

    if (split_type === "equal") {
      const shareAmount = parseFloat((totalAmount / members.length).toFixed(2));
      shares = members.map((m) => ({
        member_id: m.member_id,
        amount: shareAmount,
      }));
    } else if (split_type === "custom") {
      const customTotal = custom_splits.reduce((sum, s) => sum + parseFloat(s.amount), 0);
      if (Math.abs(customTotal - totalAmount) > 0.01) {
        return res.status(400).json({ message: "Custom amounts do not add up to total" });
      }
      shares = custom_splits;
    }

    // Update expense + delete old shares + save new shares in one transaction
    await prisma.$transaction(async (tx) => {

      // Update the expense record
      await tx.groupExpense.update({
        where: { group_expense_id: expenseId },
        data: {
          note: note,
          amount: totalAmount,
          paid_by_member_id: parseInt(paid_by_member_id),
        },
      });

      // Delete all old split shares for this expense
      await tx.splitShare.deleteMany({
        where: { group_expense_id: expenseId },
      });

      // Save new split shares
      for (const share of shares) {
        const isPayer = parseInt(share.member_id) === parseInt(paid_by_member_id);
        await tx.splitShare.create({
          data: {
            group_expense_id: expenseId,
            member_id: parseInt(share.member_id),
            amount: parseFloat(share.amount),
            is_settled: isPayer, // reset all to unsettled
          },
        });
      }
    });

    return res.status(200).json({ message: "Expense updated" });
  } catch (error) {
    console.error("Update expense error:", error);
    return res.status(500).json({ message: "Failed to update expense" });
  }
};

// Get members of a specific group
export const getGroupMembers = async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);

    const members = await prisma.groupMember.findMany({
      where: { group_id: groupId },
      include: {
        user: { select: { name: true, phone: true } },
        external: { select: { name: true, phone: true } },
      },
    });

    return res.status(200).json(members);
  } catch (error) {
    console.error("Get members error:", error);
    return res.status(500).json({ message: "Failed to fetch members" });
  }
};

//Deleting a group and all its data
export const deleteGroup = async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const userId = parseInt(req.user.userId);

    // Check if group exists and belongs to this user
    const group = await prisma.group.findFirst({
      where: { group_id: groupId, user_id: userId },
    });

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    await prisma.$transaction(async (tx) => {

      const expenses = await tx.groupExpense.findMany({
        where: { group_id: groupId },
        select: { group_expense_id: true },
      });

      const expenseIds = expenses.map((expense) => expense.group_expense_id);

      // deleting related data first to avoid foreign key issues
      await tx.splitShare.deleteMany({
        where: { group_expense_id: { in: expenseIds } },
      });

      await tx.settlement.deleteMany({
        where: { group_id: groupId },
      });

      await tx.groupExpense.deleteMany({
        where: { group_id: groupId },
      });

      await tx.groupMember.deleteMany({
        where: { group_id: groupId },
      });

      //deleting the group itself
      await tx.group.delete({
        where: { group_id: groupId },
      });
    });

    return res.status(200).json({ message: "Group deleted sucesfully" });
  } catch (error) {
    console.error("Delete group error:", error);
    return res.status(500).json({ message: "Failed to delete group" });
  }
};