/** 心数里程碑：到达指定心数弹事件卡并解锁任务 */
export interface MilestoneConfig {
  hearts: number;
  title: string;
  description: string;
  /** 解锁的任务标题列表 */
  unlocks: string[];
}

export const MILESTONES: MilestoneConfig[] = [
  {
    hearts: 2,
    title: '初识',
    description: 'TA 开始把你当作熟人了。是时候记住 TA 的生日了。',
    unlocks: ['知道 TA 的生日'],
  },
  {
    hearts: 4,
    title: '相知',
    description: '你们聊得越来越多。试着记下 TA 最爱的东西，以及不能碰的雷区。',
    unlocks: ['记下 3 个 TA 最爱的东西', '知道 1 个雷区'],
  },
  {
    hearts: 6,
    title: '同行',
    description: '关系稳固起来了。一起去做一件 TA 喜欢的事吧。',
    unlocks: ['一起做一件 TA 喜欢的活动'],
  },
  {
    hearts: 8,
    title: '知心',
    description: 'TA 愿意和你聊心事了。记下 TA 最近在烦什么、在期待什么。',
    unlocks: ['记下 TA 最近在烦什么 / 在期待什么'],
  },
  {
    hearts: 10,
    title: '挚友',
    description: '满心！TA 进入了挚友殿堂，人物卡变成金边。',
    unlocks: [],
  },
];
