import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Person } from '@/db/types';
import { addCustomReminder, deleteQuest } from '@/db/quests';
import { Button } from '@/ui/Button';
import { Field, Input } from '@/ui/Field';
import { Modal } from '@/ui/Modal';
import { Inset } from '@/ui/Panel';
import { useToast } from '@/ui/Toast';
import { toDateKey } from '@/lib/date';

/** 人物页的自定义提醒："X 日提醒我…"，进任务板，完成或过期自动消失 */
export function ReminderSection({ person }: { person: Person }) {
  const toast = useToast();
  const reminders = useLiveQuery(
    () => db.quests.where('personId').equals(person.id).filter((q) => q.kind === 'custom' && q.status === 'open').sortBy('dueDate'),
    [person.id],
  );
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(toDateKey());

  const save = async () => {
    const t = title.trim();
    if (!t || !date) return;
    await addCustomReminder(person.id, t, date);
    setOpen(false);
    setTitle('');
    toast('提醒已加进任务板');
  };

  return (
    <Inset>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>
        <span style={{ flex: 1 }}>提醒 · {reminders?.length ?? 0}</span>
        <Button size="small" variant="ghost" iconName="plus" onClick={() => setOpen(true)}>
          某天提醒我
        </Button>
      </div>
      {reminders && reminders.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
          {reminders.map((q) => (
            <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-sm)' }}>
              <span style={{ color: 'var(--ink-soft)', flex: 'none' }}>{q.dueDate}</span>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.title}</span>
              <Button size="small" variant="ghost" iconName="trash" aria-label="删除提醒" onClick={() => deleteQuest(q.id)} />
            </div>
          ))}
        </div>
      )}
      <Modal open={open} title={`提醒我关于 ${person.nickname || person.name}`} onClose={() => setOpen(false)}>
        <Field label="哪天">
          <Input type="date" value={date} min={toDateKey()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="提醒什么">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="比如：问问面试结果" maxLength={40} autoFocus />
        </Field>
        <Button variant="primary" block onClick={save} disabled={!title.trim() || !date}>
          加进任务板
        </Button>
      </Modal>
    </Inset>
  );
}
