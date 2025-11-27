// Importing the PostgreSQL connection pool
const { Pool } = require("pg");

// Loading environment variables
require("dotenv").config();

// Create connection pool to PostgreSQL
const pool = new Pool({
    host: process.env.DB_HOST,       // Database host
    user: process.env.DB_USER,       // PostgreSQL username
    password: process.env.DB_PASSWORD, // PostgreSQL password
    database: process.env.DB_NAME,   // Database name
    port: 5432,                      // Default PostgreSQL port
});

// Export pool so other files can run queries
module.exports = pool;
