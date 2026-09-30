import { closeDb } from "../db";
import { reindexAllEmails } from "../services/search.service";

reindexAllEmails()
  .then(async (total) => {
    console.log(`Reindexed ${total} emails`);
    await closeDb();
    process.exit(0);
  })
  .catch((err) => {
    console.error("Reindex failed:", err.message);
    process.exit(1);
  });
