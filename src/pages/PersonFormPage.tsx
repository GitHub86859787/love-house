import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { AvatarConfig, Birthday } from '@/db/types';
import { createPerson, updatePerson } from '@/db/persons';
import { RELATIONS, RELATION_ORDER, type RelationType } from '@/config/relations';
import { Page, PageHeader } from '@/app/Layout';
import { Panel } from '@/ui/Panel';
import { Button } from '@/ui/Button';
import { Field, Input, Row, Select } from '@/ui/Field';
import { useToast } from '@/ui/Toast';
import { AvatarEditor } from '@/features/persons/AvatarEditor';
import { TagInput } from '@/features/persons/TagInput';
import { DEFAULT_AVATAR, randomAvatar } from '@/pixel/avatar/build';

interface FormState {
  name: string;
  nickname: string;
  relation: RelationType;
  metOn: string;
  bMonth: string;
  bDay: string;
  bYear: string;
  tags: string[];
  taboos: string[];
  avatar: AvatarConfig;
}

const EMPTY: FormState = {
  name: '',
  nickname: '',
  relation: 'friend',
  metOn: '',
  bMonth: '',
  bDay: '',
  bYear: '',
  tags: [],
  taboos: [],
  avatar: DEFAULT_AVATAR,
};

export function PersonFormPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const editing = Boolean(id);
  const existing = useLiveQuery(() => (id ? db.persons.get(id) : undefined), [id]);
  const [form, setForm] = useState<FormState>(() => ({ ...EMPTY, avatar: randomAvatar() }));
  const [loaded, setLoaded] = useState(!editing);

  useEffect(() => {
    if (!existing || loaded) return;
    setForm({
      name: existing.name,
      nickname: existing.nickname ?? '',
      relation: existing.relation,
      metOn: existing.metOn ?? '',
      bMonth: existing.birthday ? String(existing.birthday.month) : '',
      bDay: existing.birthday ? String(existing.birthday.day) : '',
      bYear: existing.birthday?.year ? String(existing.birthday.year) : '',
      tags: existing.tags,
      taboos: existing.taboos,
      avatar: existing.avatar,
    });
    setLoaded(true);
  }, [existing, loaded]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const parseBirthday = (): Birthday | undefined | 'invalid' => {
    if (!form.bMonth && !form.bDay) return undefined;
    const month = Number(form.bMonth);
    const day = Number(form.bDay);
    if (!(month >= 1 && month <= 12 && day >= 1 && day <= 31)) return 'invalid';
    const year = form.bYear ? Number(form.bYear) : undefined;
    if (year !== undefined && !(year >= 1900 && year <= 2100)) return 'invalid';
    return { month, day, ...(year ? { year } : {}) };
  };

  const submit = async () => {
    const name = form.name.trim();
    if (!name) {
      toast('名字不能为空', 'error');
      return;
    }
    const birthday = parseBirthday();
    if (birthday === 'invalid') {
      toast('生日填得不太对', 'error');
      return;
    }
    const data = {
      name,
      nickname: form.nickname.trim() || undefined,
      relation: form.relation,
      metOn: form.metOn || undefined,
      birthday,
      tags: form.tags,
      taboos: form.taboos,
      avatar: form.avatar,
    };
    if (editing && id) {
      await updatePerson(id, data);
      toast('已保存');
      nav(`/person/${id}`, { replace: true });
    } else {
      const p = await createPerson(data);
      toast(`${p.name} 搬进了村里！`);
      nav(`/person/${p.id}`, { replace: true });
    }
  };

  if (editing && !loaded) {
    return (
      <Page>
        <PageHeader title="编辑村民" left={<Button variant="ghost" iconName="back" aria-label="返回" onClick={() => nav(-1)} />} />
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader title={editing ? '编辑村民' : '认识新村民'} left={<Button variant="ghost" iconName="back" aria-label="返回" onClick={() => nav(-1)} />} />

      <Panel title="头像">
        <AvatarEditor value={form.avatar} onChange={(a) => set('avatar', a)} />
      </Panel>

      <Panel title="基本信息">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Row>
            <Field label="名字 *">
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="真名或你叫 TA 的名字" maxLength={20} />
            </Field>
            <Field label="称呼">
              <Input value={form.nickname} onChange={(e) => set('nickname', e.target.value)} placeholder="村里显示的名字" maxLength={10} />
            </Field>
          </Row>
          <Row>
            <Field label="关系">
              <Select value={form.relation} onChange={(e) => set('relation', e.target.value as RelationType)}>
                {RELATION_ORDER.map((r) => (
                  <option key={r} value={r}>
                    {RELATIONS[r].label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="认识日期">
              <Input type="date" value={form.metOn} onChange={(e) => set('metOn', e.target.value)} />
            </Field>
          </Row>
          <Field label="生日（年份可不填）">
            <Row>
              <Input inputMode="numeric" placeholder="月" value={form.bMonth} onChange={(e) => set('bMonth', e.target.value.replace(/\D/g, '').slice(0, 2))} />
              <Input inputMode="numeric" placeholder="日" value={form.bDay} onChange={(e) => set('bDay', e.target.value.replace(/\D/g, '').slice(0, 2))} />
              <Input inputMode="numeric" placeholder="年（可选）" value={form.bYear} onChange={(e) => set('bYear', e.target.value.replace(/\D/g, '').slice(0, 4))} />
            </Row>
          </Field>
        </div>
      </Panel>

      <Panel title="性格标签">
        <TagInput values={form.tags} onChange={(v) => set('tags', v)} placeholder="比如：慢热、爱吐槽、靠谱" />
      </Panel>

      <Panel title="忌讳 / 雷区">
        <TagInput values={form.taboos} onChange={(v) => set('taboos', v)} placeholder="比如：别问工资、不吃香菜" danger />
      </Panel>

      <Button variant="primary" block onClick={submit}>
        {editing ? '保存' : '搬进村里'}
      </Button>
    </Page>
  );
}
