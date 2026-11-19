import app from './app';
import { env } from './config/env';
import { testDatabaseConnection } from './config/db';

async function startServer(): Promise<void> {
  try {
    await testDatabaseConnection();
    app.listen(env.PORT, () => {
      console.log(`MR Cafe API running at http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error('Unable to start MR Cafe API:', error);
    process.exit(1);
  }
}

void startServer();
