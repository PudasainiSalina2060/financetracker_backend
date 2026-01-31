import prisma from "../database/dbconnection.js";

// Get all categories (Default categories and categories created by user)
export const getCategories = async (req, res) => {
  try {
    const userId = req.user.userId; 

    //Fetch default categories (where user_id is null) and users custom categories
    const categories = await prisma.category.findMany({
      where: {
        OR: [
          { user_id: null },      // Default categories 
          { user_id: userId }     // Custom categories(created by specific user) 
        ]
      }
    });

    return res.status(200).json(categories);
  } catch (error) {
    console.error("Get Categories Error:", error);
    return res.status(500).json({ message: "Failed to get categories" });
  }
};

//Adding a new custom category
export const createCategory = async (req, res) => {
  try {
    const { name, type, color, icon } = req.body;
    const userId = req.user.userId;

    //basic validation
    if (!name || !type) {
      return res.status(400).json({ message: "Name and Type are required to create a custom category" });
    }

    //Checking if category already exist
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: {
          equals: name,
          //to make Food and food treated as the same thing
          mode: 'insensitive' 
        },
        user_id: userId
      }
    });

    if (existingCategory) {
      return res.status(400).json({ message: "Category already exists" });
    }

    // Create in DB
    const newCategory = await prisma.category.create({
      data: {
        user_id: userId,
        name,
        type, // income or expenses
        color,
        icon
      }
    });

    return res.status(201).json({ 
      message: "Category created", 
      category: newCategory 
    });

  } catch (error) {
    console.error("Create Category Error:", error);
    return res.status(500).json({ message: "Could not add a new category" });
  }
};