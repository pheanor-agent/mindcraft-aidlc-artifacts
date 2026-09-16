import { randomUUID } from "node:crypto";

export const TaskStatus = Object.freeze({ ACTIVE: "active", COMPLETED: "completed", CANCELLED: "cancelled" });
export const RunStatus = Object.freeze({ QUEUED: "queued", RUNNING: "running", COMPLETED: "completed", FAILED: "failed", ABORTED: "aborted" });

export class InMemoryStore {
  tasks = new Map();
  episodes = new Map();
  runs = new Map();
}

export function createTask(store, input) {
  const task = { id: randomUUID(), title: input.title, objective: input.objective, purpose: input.purpose ?? "general", status: TaskStatus.ACTIVE, episodeIds: [], createdAt: new Date().toISOString() };
  store.tasks.set(task.id, task);
  return task;
}

export function createEpisode(store, task, prompt) {
  const episode = { id: randomUUID(), taskId: task.id, sequence: task.episodeIds.length + 1, prompt, purpose: task.purpose ?? "general", runId: null, status: "queued" };
  task.episodeIds.push(episode.id);
  store.episodes.set(episode.id, episode);
  return episode;
}
