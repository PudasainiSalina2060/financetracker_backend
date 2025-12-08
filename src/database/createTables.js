//imports the connection from database.js.
const pool = require("../config/database");

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
        created_time TIMESTAMP DEFAULT NOW()
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
//createUsersTable();

//CREATING A  TABLE FOR CATEFORIES
async function createCategoriesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        category_id SERIAL PRIMARY KEY,
        category_name VARCHAR(50) NOT NULL,
        type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
        user_id INT NOT NULL REFERENCES users(user_id)
      );
    `);
    console.log("Categories table created successfully");
  } catch (err) {
    console.error("Error creating categories table", err);
  } 
}

//createCategoriesTable();


//CREATING A  TABLE FOR TRANSACTIONS
/**
 * NUMERIC(precision, scale)
         * NUMERIC(10,2) means up to 10 digits total, with 2 digits after the decimal point
         * (e.g.12345678.90)
 */
async function createTransactionsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (

        transaction_id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(user_id),
        category_id INT NOT NULL REFERENCES categories(category_id),
        amount NUMERIC(10,2) NOT NULL,
        type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
        note TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        is_recurring BOOLEAN DEFAULT FALSE,
        is_synced BOOLEAN DEFAULT TRUE

      );
    `);
    console.log("Transactions table created successfully");
  } catch (err) {
    console.error("Error creating transaction table", err);
  } 
}
//createTransactionsTable();

//CREATING A  BUDGET TABLE
async function createBudgetTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        budget_id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(user_id),
        category_id INT NOT NULL REFERENCES categories(category_id),
        amount_limit NUMERIC(10,2) NOT NULL,
        budget_start_date DATE NOT NULL,
        budget_end_date DATE NOT NULL,
        alert_triggered BOOLEAN DEFAULT FALSE
      );
    `);
    console.log("Budget table created successfully");
  } catch (err) {
    console.error("Error creating Budget table", err);
  } 
}
//createBudgetTable();

//TABLES FOR BILL SPLITTING  ~ APP REGISTERED USERS
// - users table : exists

//CREATING GROUPS TABLE

async function createGroupsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS groups (
        group_id SERIAL PRIMARY KEY,
        group_name VARCHAR(100) NOT NULL,
        created_by INT NOT NULL REFERENCES users(user_id),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("Groups table created successfully");
  } catch (err) {
    console.error("Error creating Groups table", err);
  } 
}
//createGroupsTable();

//CREATING GROUP MEMBERS TABLE
async function createGroupMembersTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS group_members (
        member_id SERIAL PRIMARY KEY,
        group_id INT NOT NULL REFERENCES groups(group_id),
        user_id INT NOT NULL REFERENCES users(user_id),
        balance NUMERIC(10,2) DEFAULT 0
      );
    `);
    console.log("Groupmembers table created successfully");
  } catch (err) {
    console.error("Error creating Groupmembers table", err);
  } 
}
//createGroupMembersTable();

//CREATING SPLIT TRANSACTIONS TABLE
async function createSplitTransactionsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS split_transactions (
        split_id SERIAL PRIMARY KEY,
        group_id INT NOT NULL REFERENCES groups(group_id),
        paid_by INT NOT NULL REFERENCES users(user_id),
        description TEXT,
        total_amount_paid NUMERIC(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()

      );
    `);
    console.log("Split Transaction table created successfully");
  } catch (err) {
    console.error("Error creating Split Transaction table", err);
  } 
}
//createSplitTransactionsTable();

//CREATING SPLIT EXPENSES SHARING TABLE
async function createSplitExpensesSharingTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS split_shares (
        share_id SERIAL PRIMARY KEY,
        split_id INT NOT NULL REFERENCES split_transactions(split_id),
        user_id INT NOT NULL REFERENCES users(user_id),
        share_amount NUMERIC(10,2) NOT NULL,
        is_settled BOOLEAN DEFAULT FALSE 
      );
    `);
    console.log("Split Expenses Sharing table created successfully");
  } catch (err) {
    console.error("Error creating Split Expenses Sharing table", err);
  } 
}
//createSplitExpensesSharingTable();

/**
 * createAllTables
 * This function creates all database tables in the correct order.
 * 
 * Use of sequential await?
 * - Some tables depend on others via foreign keys.
 * - Here, split_shares references split_transactions table,
 *   so split_transactions must exist before split_shares is created.
 * - Using await ensures each table is created before moving to the next.
 */


async function createAllTables() {
  await createUsersTable();
  await createCategoriesTable();
  await createTransactionsTable();
  await createBudgetTable();
  await createGroupsTable();
  await createGroupMembersTable();
  await createSplitTransactionsTable();   // parent first
  await createSplitExpensesSharingTable(); // child after
}

createAllTables()
  .then(() => console.log("All tables created successfully"))
  .catch(err => console.error("Error creating tables", err));

  createSplitExpensesSharingTable().then(() => process.exit());

 