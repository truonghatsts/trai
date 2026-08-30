import { claimNextQueuedJob, requeueStaleJobs } from '../db/jobs.js';
import { runJob } from './pipeline.js';
import { config } from '../config.js';

let busy = false;

async function tick(): Promise<void> {
  if (busy) return;
  busy = true;
  try {
    const job = await claimNextQueuedJob();
    if (job) {
      await runJob(job.id);
      setTimeout(tick, 10); // drain the queue before idling
    } else {
      setTimeout(tick, config.workerPollMs);
    }
  } catch (err) {
    console.error('worker error:', err);
    setTimeout(tick, config.workerPollMs);
  } finally {
    busy = false;
  }
}

// FR-012 / SC-004: jobs keep running after the tab closes (worker is 24/7 on
// Railway); requeueStaleJobs guarantees jobs left in-flight by a crash still
// reach a terminal state after restart.
export function startWorker(): void {
  requeueStaleJobs().catch((err) => console.error('worker requeue failed:', err));
  tick();
}
