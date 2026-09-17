/**
 * 命书生成任务：挂在模块级，离开页面也继续写；写完（或断掉时保留已写部分）落库。
 * 组件用 useBookJob 订阅进度，App 里的 BookJobWatcher 负责完成 / 失败提示。
 */
import { db } from '@/db/db';
import type { Person } from '@/db/types';
import type { AiModelId } from '@/ai/client';
import { friendlyError } from '@/ai/client';
import type { ChapterKey } from '@/config/fortune-book';
import { appendChapterRound, bookOf, resumeChapterRound, saveChapter, saveGuide } from '@/db/fortune';
import { chapterHash, isInflight, partialChapter, requestChapter, requestGuide, type GenerateMode } from './book';
import { emitNow, emitSoon, getJobsMutable, clearEmitTimer, notifyDone, type BookJob, type JobResult } from './bookJobs';

export * from './bookJobs';

/** 开始写一章；已经在写返回 false */
export function startBookJob(opts: { person: Person; me: Person | null; key: ChapterKey; mode: GenerateMode; model: AiModelId }): boolean {
  const { person, me, key, mode, model } = opts;
  const tag = `${person.id}:${key}`;
  const jobs = getJobsMutable();
  if (jobs[tag] || isInflight(person.id, key)) return false;
  const job: BookJob = { personId: person.id, personName: person.isMe ? '我' : person.nickname || person.name, key, mode, since: Date.now(), text: '' };
  jobs[tag] = job;
  emitNow();

  void (async () => {
    const book = bookOf(person);
    let text = '';
    const onProgress = (t: string) => {
      text = t;
      const cur = getJobsMutable();
      cur[tag] = { ...cur[tag], text: t };
      emitSoon();
    };
    let result: JobResult = { job, ok: true, message: '', keptPartial: false };
    try {
      if (key === 'guide') {
        if (!book) throw new Error('先翻开至少一章');
        const out = await requestGuide(person, book, model, onProgress);
        const fresh = (await db.persons.get(person.id)) ?? person;
        await saveGuide(fresh, out, chapterHash('overview', fresh, me), model);
      } else {
        const out = await requestChapter({ key, person, me, book, mode, model, onProgress });
        const fresh = (await db.persons.get(person.id)) ?? person;
        if (mode === 'continue') await appendChapterRound(fresh, key, out, model);
        else if (mode === 'resume') await resumeChapterRound(fresh, key, out, model);
        else await saveChapter(fresh, key, out, chapterHash(key, fresh, me), model);
      }
    } catch (e) {
      const message = friendlyError(e);
      let kept = false;
      if (key !== 'guide') {
        // 保留已经写出来的部分
        const partial = partialChapter(text);
        if (partial && partial.sections.some((s) => s.body.length > 20)) {
          try {
            const fresh = (await db.persons.get(person.id)) ?? person;
            const out = { sections: partial.sections, traits: partial.traits };
            if (mode === 'continue') await appendChapterRound(fresh, key, out, model, { error: message });
            else if (mode === 'resume') await resumeChapterRound(fresh, key, out, model, { error: message });
            else await saveChapter(fresh, key, out, chapterHash(key, fresh, me), model, { error: message });
            kept = true;
          } catch {
            // 落库失败就只报错
          }
        }
      }
      result = { job, ok: false, message, keptPartial: kept };
    } finally {
      delete getJobsMutable()[tag];
      clearEmitTimer();
      emitNow();
      notifyDone(result);
    }
  })();
  return true;
}
