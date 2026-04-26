import Pool from "pg";

const dbUrl = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/ai_pulse";
const isLocal = dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1");

const pool = new Pool.Pool({
  connectionString: dbUrl,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

// Test connection on startup
pool.query("SELECT NOW()").then(() => {
  console.log("✅ PostgreSQL connected");
}).catch((err) => {
  console.error("❌ PostgreSQL connection failed:", err.message);
});

export default pool;
