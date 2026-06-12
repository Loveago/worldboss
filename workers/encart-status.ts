import { PrismaClient } from "@prisma/client";
import { syncOutstandingDataOrders } from "../lib/encart";

const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

const prisma = new PrismaClient({
  log: ["warn", "error"],
});

let running = true;

async function tick() {
  try {
    const results = await syncOutstandingDataOrders(prisma);
    console.log(
      `[${new Date().toISOString()}] Encart sync: checked=${results.checked}, updated=${results.updated}, failed=${results.failed}`
    );
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Encart sync error:`, err);
  }
}

async function run() {
  console.log(`[${new Date().toISOString()}] Encart status worker started — polling every ${POLL_INTERVAL_MS / 1000}s`);

  // Quick DB connectivity sanity check
  try {
    const count = await prisma.order.count({ where: { dataStatus: { in: ["PLACED", "PROCESSING"] } } });
    console.log(`[${new Date().toISOString()}] DB connected. Outstanding data orders: ${count}`);
  } catch (e) {
    console.error(`[${new Date().toISOString()}] DB connectivity check failed:`, e);
  }

  // Run immediately on startup
  await tick();

  while (running) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    if (!running) break;
    await tick();
  }

  await prisma.$disconnect();
  console.log(`[${new Date().toISOString()}] Encart status worker stopped.`);
}

function shutdown() {
  if (!running) return;
  running = false;
  console.log(`[${new Date().toISOString()}] Shutting down Encart worker...`);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

run();
