/** 心数里程碑：到达指定心数弹事件卡并解锁任务 */
export type MilestoneQuestCheck = 'hasBirthday' | 'threeLoves' | 'hasTaboo' | 'activityTogether' | 'innerNote';

export interface MilestoneQuest {
  title: string;
  description: string;
  /** 自动判定完成的条件；无则只能手动完成 */
  check?: MilestoneQuestCheck;
}

export interface MilestoneConfig {
  hearts: number;
  title: string;
  description: string;
  unlocks: MilestoneQuest[];
}

export const MILESTONES: MilestoneConfig[] = [
  {
    hearts: 2,
    title: '初识',
    description: 'TA 开始把你当作熟人了。是时候记住 TA 的生日了。星婆婆说，她现在可以帮你看看你们俩。',
    unlocks: [{ title: '知道 TA 的生日', description: '在 TA 的资料里填上生日', check: 'hasBirthday' }],
  },
  {
    hearts: 4,
    title: '相知',
    description: '你们聊得越来越多。试着记下 TA 最爱的东西，以及不能碰的雷区。',
    unlocks: [
      { title: '记下 3 个 TA 最爱的东西', description: '喜好里的「最爱」满 3 条', check: 'threeLoves' },
      { title: '知道 1 个雷区', description: '在 TA 的资料里记一条忌讳', check: 'hasTaboo' },
    ],
  },
  {
    hearts: 6,
    title: '同行',
    description: '关系稳固起来了。一起去做一件 TA 喜欢的事吧。',
    unlocks: [{ title: '一起做一件 TA 喜欢的活动', description: '记一条「一起活动」', check: 'activityTogether' }],
  },
  {
    hearts: 8,
    title: '知心',
    description: 'TA 愿意和你聊心事了。笔记里多了一栏：TA 最近在烦什么、在期待什么。',
    unlocks: [{ title: '记下 TA 最近在烦什么 / 在期待什么', description: '在笔记 Tab 的「心事」栏写点什么', check: 'innerNote' }],
  },
  {
    hearts: 10,
    title: '挚友',
    description: '满心！TA 进入了挚友殿堂，人物卡变成金边。',
    unlocks: [],
  },
];
