//imports the connection from database.js.
const pool = require("./database");

// CREATING A  TABLE FOR USERS
//Define an async function to create the users table
async function createUsersTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        user_pw VARCHAR(100) NOT NULL,
        created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    //Display success message if table creation succeeds
    console.log("Users table created successfully");
    //Log error if table creation fails
  } catch (err) {
    console.error("Error creating users table", err);
  } 
}

//Function call to run the table creation
createUsersTable();


