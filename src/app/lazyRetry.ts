import { lazy, type ComponentType } from 'react';

/**
 * 按需加载的页面分块：版本刚更新时，旧页面可能还拿着旧的分块名，去请求会 404。
 * 第一次失败就整页刷新一次（拿新的入口文件），刷新后仍失败才把错误抛给错误页。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- 任意 props 的组件都能包
export function lazyRetry<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>, key: string) {
  return lazy(async () => {
    const flag = `renqing.chunk-retry.${key}`;
    try {
      const m = await factory();
      try {
        sessionStorage.removeItem(flag);
      } catch {
        // 无 sessionStorage 也没关系
      }
      return m;
    } catch (e) {
      let retried = false;
      try {
        retried = sessionStorage.getItem(flag) === '1';
        if (!retried) sessionStorage.setItem(flag, '1');
      } catch {
        retried = true;
      }
      if (!retried) {
        window.location.reload();
        // 刷新前先挂起，别让错误页闪一下
        await new Promise(() => {});
      }
      throw e;
    }
  });
}
