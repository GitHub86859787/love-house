/**
 * JSON 备份：全库导出 / 覆盖式导入 / 「我的档案」单独导出。
 * 不包含 API Key（Key 只在 localStorage，不进备份）。
 */
import { db } from '@/db/db';
import type { AchievementRecord, Interaction, Person, Quest, SettingRecord } from '@/db/types';
import { updateSettings } from '@/db/settings';
import { dateStamp, saveFile } from './file';

export const BACKUP_FORMAT = 'renqing-village-backup';
export const ME_FORMAT = 'renqing-village-me';
export const BACKUP_VERSION = 1;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  appVersion: string;
  exportedAt: number;
  persons: Person[];
  interactions: Interaction[];
  quests: Quest[];
  achievements: AchievementRecord[];
  settings: SettingRecord[];
}

export interface MeFile {
  format: typeof ME_FORMAT;
  version: number;
  exportedAt: number;
  person: Person;
}

export async function collectBackup(): Promise<BackupFile> {
  const [persons, interactions, quests, achievements, settings] = await Promise.all([
    db.persons.toArray(),
    db.interactions.toArray(),
    db.quests.toArray(),
    db.achievements.toArray(),
    db.settings.toArray(),
  ]);
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, appVersion: __APP_VERSION__, exportedAt: Date.now(), persons, interactions, quests, achievements, settings };
}

function jsonBlob(obj: unknown): Blob {
  return new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
}

/** 导出全部数据；成功后记下导出时间（备份提醒用） */
export async function exportBackup(opts: { silentStamp?: boolean } = {}): Promise<void> {
  const data = await collectBackup();
  await saveFile(jsonBlob(data), `人情村备份-${dateStamp()}.json`);
  if (!opts.silentStamp) await updateSettings({ lastExportAt: Date.now() });
}

export async function exportMe(): Promise<boolean> {
  const me = await db.persons.filter((p) => Boolean(p.isMe)).first();
  if (!me) return false;
  const file: MeFile = { format: ME_FORMAT, version: BACKUP_VERSION, exportedAt: Date.now(), person: me };
  await saveFile(jsonBlob(file), `我的档案-${dateStamp()}.json`);
  return true;
}

export type ParsedImport = { kind: 'backup'; data: BackupFile } | { kind: 'me'; data: MeFile };

/** 解析并校验导入文件；不合法抛出中文错误 */
export function parseImport(text: string): ParsedImport {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('这不是一个有效的 JSON 文件');
  }
  if (!raw || typeof raw !== 'object') throw new Error('文件内容不对');
  const o = raw as Record<string, unknown>;
  if (o.format === ME_FORMAT) {
    const p = o.person as Person | undefined;
    if (!p || typeof p !== 'object' || typeof p.name !== 'string') throw new Error('「我的档案」文件缺少人物资料');
    return { kind: 'me', data: o as unknown as MeFile };
  }
  if (o.format !== BACKUP_FORMAT) throw new Error('这不是人情村的备份文件');
  if (typeof o.version !== 'number' || o.version > BACKUP_VERSION) throw new Error('备份文件来自更新的版本，先升级 App 再导入');
  for (const k of ['persons', 'interactions', 'quests', 'achievements', 'settings']) {
    if (!Array.isArray(o[k])) throw new Error(`备份文件缺少 ${k}`);
  }
  for (const p of o.persons as unknown[]) {
    const x = p as Partial<Person>;
    if (!x || typeof x.id !== 'string' || typeof x.name !== 'string') throw new Error('备份里的人物资料格式不对');
  }
  return { kind: 'backup', data: o as unknown as BackupFile };
}

/** 覆盖式导入：清空后写入 */
export async function applyBackup(data: BackupFile): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) await t.clear();
    await db.persons.bulkPut(data.persons);
    await db.interactions.bulkPut(data.interactions);
    await db.quests.bulkPut(data.quests);
    await db.achievements.bulkPut(data.achievements);
    await db.settings.bulkPut(data.settings);
  });
}

/** 导入「我的档案」：替换现有的我（保留 id 以免别处引用断掉） */
export async function applyMe(data: MeFile): Promise<void> {
  await db.transaction('rw', db.persons, async () => {
    const cur = await db.persons.filter((p) => Boolean(p.isMe)).first();
    const person: Person = { ...data.person, isMe: true, id: cur?.id ?? data.person.id, updatedAt: Date.now() };
    if (cur) await db.persons.put(person);
    else await db.persons.add(person);
  });
}

export function importSummary(p: ParsedImport): string {
  if (p.kind === 'me') return `「我的档案」：${p.data.person.name}${p.data.person.birth ? '，含生辰' : ''}`;
  const d = p.data;
  const real = d.persons.filter((x) => !x.isMe).length;
  return `${real} 位村民、${d.interactions.length} 条互动、${d.quests.length} 条任务，导出于 ${new Date(d.exportedAt).toLocaleString('zh-CN')}`;
}
