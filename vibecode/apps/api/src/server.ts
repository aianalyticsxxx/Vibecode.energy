import { config } from 'dotenv';
config();

import { buildApp } from './app.js';

const PORT = parseInt(process.env.PORT || process.env.API_PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`Server running at http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
