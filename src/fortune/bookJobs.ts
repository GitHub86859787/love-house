/**
 * 命书生成任务的状态仓（轻量，不带 SDK / zod）：进度订阅、完成回调。
 * 真正发请求的 startBookJob 在 bookRuntime.ts，按需加载。
 */
import { useSyncExternalStore } from 'react';
import { CHAPTERS, type ChapterKey } from '@/config/fortune-book';
import type { GenerateMode } from './bookCore';

export interface BookJob {
  personId: string;
  personName: string;
  key: ChapterKey;
  mode: GenerateMode;
  since: number;
  /** 到目前为止的原始输出 */
  text: string;
}

let jobs: Record<string, BookJob> = {};
const listeners = new Set<() => void>();
let emitTimer: number | null = null;

export function emitNow() {
  jobs = { ...jobs };
  listeners.forEach((l) => l());
}
/** 进度更新很密，合并到每 120ms 一次 */
export function emitSoon() {
  if (emitTimer !== null) return;
  emitTimer = window.setTimeout(() => {
    emitTimer = null;
    emitNow();
  }, 120);
}

export function subscribeJobs(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function getJobs(): Record<string, BookJob> {
  return jobs;
}
/** 给 bookRuntime 直接改的引用（改完要 emit） */
export function getJobsMutable(): Record<string, BookJob> {
  return jobs;
}
export function clearEmitTimer(): void {
  if (emitTimer !== null) {
    window.clearTimeout(emitTimer);
    emitTimer = null;
  }
}
export function useBookJobs(): Record<string, BookJob> {
  return useSyncExternalStore(subscribeJobs, getJobs, getJobs);
}
export function useBookJob(personId: string, key: ChapterKey): BookJob | null {
  const all = useBookJobs();
  return all[`${personId}:${key}`] ?? null;
}
export function jobsOf(personId: string): BookJob[] {
  return Object.values(jobs).filter((j) => j.personId === personId);
}

export interface JobResult {
  job: BookJob;
  ok: boolean;
  /** 失败原因（ok 时为空） */
  message: string;
  /** 失败但保留了已写出的部分 */
  keptPartial: boolean;
}
const doneListeners = new Set<(r: JobResult) => void>();
export function onJobDone(fn: (r: JobResult) => void): () => void {
  doneListeners.add(fn);
  return () => doneListeners.delete(fn);
}
export function notifyDone(r: JobResult): void {
  doneListeners.forEach((l) => l(r));
}

export function chapterTitleOf(key: ChapterKey): string {
  return CHAPTERS.find((c) => c.key === key)?.title ?? key;
}

