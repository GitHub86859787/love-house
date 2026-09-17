import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '@/db/db';
import { updateSettings, useSettings } from '@/db/settings';
import { FORTUNE_TELLER } from '@/config/fortune-prompt';
import { fortuneTellerAvatar } from '@/features/fortune/teller';
import { Avatar } from '@/pixel/avatar/Avatar';
import { Button } from '@/ui/Button';
import { play } from '@/audio/sound';
import styles from './Tutorial.module.css';

interface Step {
  n: 1 | 2 | 3;
  text: string;
  action: string;
  to: string;
}

const STEPS: Step[] = [
  { n: 1, text: '哟，新来的。这村子现在就你一个人。先把一个你在意的人请进来吧——名字、关系，生日知道就填，不知道也行。', action: '去认识第一位村民', to: '/person/new' },
  { n: 2, text: '人请进来了。往后和 TA 每次见面、聊天、送礼，都来「记一笔」。心就是这样一笔一笔涨起来的。', action: '去记第一笔', to: '/record' },
  { n: 3, text: '村东头那顶帐篷是我的。带着 TA 的生辰来，我给 TA 写一本命书。不来也不碍事，村子照样过。', action: '去帐篷看看', to: '/fortune' },
];

/** 首次使用教程：星婆婆三步引导，只在村口显示（别的页面会盖住表单），挂在底栏上方；三步都自然完成或点跳过就不再出现 */
export function Tutorial() {
  const settings = useSettings();
  const nav = useNavigate();
  const loc = useLocation();
  const personCount = useLiveQuery(() => db.persons.filter((p) => !p.isMe).count(), []);
  const interactionCount = useLiveQuery(() => db.interactions.count(), []);
  const [minimized, setMinimized] = useState(false);

  const step = useMemo<Step | null>(() => {
    if (personCount === undefined || interactionCount === undefined) return null;
    if (personCount === 0) return STEPS[0];
    if (interactionCount === 0) return STEPS[1];
    if (!settings.fortuneIntroSeen) return STEPS[2];
    return null;
  }, [personCount, interactionCount, settings.fortuneIntroSeen]);

  // 三步都完成 → 记下来，以后不再出现
  useEffect(() => {
    if (settings.tutorialDone) return;
    if (personCount === undefined || interactionCount === undefined) return;
    if (step === null) updateSettings({ tutorialDone: true });
  }, [step, personCount, interactionCount, settings.tutorialDone]);

  useEffect(() => setMinimized(false), [step?.n]);

  if (settings.tutorialDone || !step || loc.pathname !== '/') return null;

  if (minimized) {
    return (
      <button type="button" className={`${styles.mini} px-corner-sm`} onClick={() => setMinimized(false)} aria-label="展开教程">
        <Avatar config={fortuneTellerAvatar} scale={1} />
        <span>第 {step.n} / 3 步</span>
      </button>
    );
  }

  return (
    <div className={`${styles.box} px-corner`} role="dialog" aria-label="新手引导">
      <div className={styles.head}>
        <Avatar config={fortuneTellerAvatar} scale={2} />
        <div className={styles.speaker}>
          <span className={`${styles.name} px-corner-sm`}>{FORTUNE_TELLER.name}</span>
          <span className={styles.stepNo}>第 {step.n} / 3 步</span>
        </div>
        <button type="button" className={styles.close} aria-label="先收起" onClick={() => setMinimized(true)}>
          ▼
        </button>
      </div>
      <p className={styles.text}>{step.text}</p>
      <div className={styles.actions}>
        <Button
          size="small"
          variant="ghost"
          onClick={() => {
            play('click');
            updateSettings({ tutorialDone: true });
          }}
        >
          跳过教程
        </Button>
        <Button
          size="small"
          variant="primary"
          onClick={() => {
            play('pop');
            nav(step.to);
          }}
        >
          {step.action}
        </Button>
      </div>
    </div>
  );
}
