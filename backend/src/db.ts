import Pool from "pg";

const pool = new Pool.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.startsWith("postgresql")
    ? { rejectUnauthorized: false }
    : undefined,
});

// Test connection on startup
pool.query("SELECT NOW()").then(() => {
  console.log("✅ PostgreSQL connected");
}).catch((err) => {
  console.error("❌ PostgreSQL connection failed:", err.message);
});

export default pool;
