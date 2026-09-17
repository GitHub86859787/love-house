import { useEffect } from 'react';
import { useToast } from '@/ui/Toast';
import { play } from '@/audio/sound';
import { chapterTitleOf, onJobDone } from '@/fortune/bookJobs';

/** 命书写完 / 断掉时的全局提示：不管人在哪个页面 */
export function BookJobWatcher() {
  const toast = useToast();
  useEffect(
    () =>
      onJobDone((r) => {
        const title = chapterTitleOf(r.job.key);
        if (r.ok) {
          play('milestone');
          toast(`${r.job.personName}的「${title}」写好了`);
        } else if (r.keptPartial) {
          toast(`「${title}」写到一半断了，已写的留着，可以接着讲`, 'error');
        } else {
          toast(`「${title}」没写成：${r.message}`, 'error');
        }
      }),
    [toast],
  );
  return null;
}
