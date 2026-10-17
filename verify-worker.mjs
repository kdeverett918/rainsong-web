import { parentPort, workerData } from 'node:worker_threads';
import { packedSeals } from './verify.bundle.mjs';
try {
  parentPort.postMessage(packedSeals(workerData.seed, workerData.turn, Buffer.from(workerData.log, 'hex')));
} catch { parentPort.postMessage(0); }
