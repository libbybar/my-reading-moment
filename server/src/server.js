import "dotenv/config";

import app from "./app.js";
import { connectToDatabase } from "./config/db.js";

const PORT = process.env.PORT || 7000;

async function start() {
  await connectToDatabase();

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

start();
