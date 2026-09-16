/** 好感度数值规则（照搬星露谷），全部集中在这里方便修改 */
export const SCORING = {
  /** 每颗心的点数 */
  pointsPerHeart: 250,
  /** 心数上限 */
  maxHearts: 10,
  /** 点数上限 = 10 心 */
  get maxPoints() {
    return this.pointsPerHeart * this.maxHearts;
  },
  /** 半心阈值：一颗心内累计 >= 125 显示半心 */
  halfHeartThreshold: 125,

  /** 送礼各档得分 */
  gift: {
    love: 80,
    like: 45,
    neutral: 20,
    dislike: -20,
    hate: -40,
  },
  /** 生日送礼倍率 */
  birthdayGiftMultiplier: 8,
  /** 生日当天非送礼互动倍率 */
  birthdayOtherMultiplier: 2,
  /** 每周送礼上限（周一 00:00 本地时区重置），生日当天不受限 */
  weeklyGiftLimit: 2,

  /** 非送礼互动得分 */
  interaction: {
    meet: 40,
    chat: 20,
    help: 50,
    activity: 60,
    festival: 30,
    other: 20,
  },
  /** 同一人同一天：聊天只算一次，其他类型第二次起减半 */
  sameDayRepeatFactor: 0.5,

  /** 衰减：每天未互动扣分（最后互动次日起） */
  decayPerDay: 2,
  /** 满心后不衰减 */
  noDecayAtMaxHearts: true,
  /** 超过多少天不联系，头像变灰挂问号 */
  ghostAfterDays: 30,
  /** 手动加减心的步长 */
  manualHeartStep: 250,
} as const;
