const { parentPort, workerData } = require("node:worker_threads");
parentPort.postMessage({ from: "fichero-worker", workerData });
