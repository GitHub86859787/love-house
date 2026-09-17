import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { AvatarConfig, Birth } from '@/db/types';
import { createPerson, updatePerson } from '@/db/persons';
import { addInteraction } from '@/db/interactions';
import { useSettings } from '@/db/settings';
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
  isLunar: boolean;
  tags: string[];
  taboos: string[];
  avatar: AvatarConfig;
  graceOverride: string;
  staleMuted: boolean;
}

const EMPTY: FormState = {
  name: '',
  nickname: '',
  relation: 'friend',
  metOn: '',
  bMonth: '',
  bDay: '',
  bYear: '',
  isLunar: false,
  tags: [],
  taboos: [],
  avatar: DEFAULT_AVATAR,
  graceOverride: '',
  staleMuted: false,
};

export function PersonFormPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const settings = useSettings();
  const editing = Boolean(id);
  const existing = useLiveQuery(() => (id ? db.persons.get(id) : undefined), [id]);
  const [form, setForm] = useState<FormState>(() => ({ ...EMPTY, avatar: randomAvatar('friend') }));
  const [loaded, setLoaded] = useState(!editing);

  useEffect(() => {
    if (!existing || loaded) return;
    setForm({
      name: existing.name,
      nickname: existing.nickname ?? '',
      relation: existing.relation,
      metOn: existing.metOn ?? '',
      bMonth: existing.birth ? String(existing.birth.month) : '',
      bDay: existing.birth ? String(existing.birth.day) : '',
      bYear: existing.birth?.year ? String(existing.birth.year) : '',
      isLunar: existing.birth?.isLunar ?? false,
      tags: existing.tags,
      taboos: existing.taboos,
      avatar: existing.avatar,
      graceOverride: existing.staleDaysOverride != null ? String(existing.staleDaysOverride) : '',
      staleMuted: existing.staleReminderMuted ?? false,
    });
    setLoaded(true);
  }, [existing, loaded]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const parseBirth = (): Birth | undefined | 'invalid' => {
    if (!form.bMonth && !form.bDay) return undefined;
    const month = Number(form.bMonth);
    const day = Number(form.bDay);
    if (!(month >= 1 && month <= 12 && day >= 1 && day <= 31)) return 'invalid';
    const year = form.bYear ? Number(form.bYear) : undefined;
    if (year !== undefined && !(year >= 1900 && year <= 2100)) return 'invalid';
    // 保留已有的时辰字段（阶段 5 才有输入界面）
    const keep = existing?.birth ? { hour: existing.birth.hour, minute: existing.birth.minute } : {};
    return { month, day, ...(year ? { year } : {}), ...(form.isLunar ? { isLunar: true } : {}), ...keep };
  };

  const submit = async () => {
    const name = form.name.trim();
    if (!name) {
      toast('名字不能为空', 'error');
      return;
    }
    const birth = parseBirth();
    if (birth === 'invalid') {
      toast('生日填得不太对', 'error');
      return;
    }
    const grace = form.graceOverride.trim() ? Number(form.graceOverride) : undefined;
    if (grace !== undefined && !(grace >= 0 && grace <= 3650)) {
      toast('宽限天数填得不太对', 'error');
      return;
    }
    const data = {
      name,
      nickname: form.nickname.trim() || undefined,
      relation: form.relation,
      metOn: form.metOn || undefined,
      birth,
      tags: form.tags,
      taboos: form.taboos,
      avatar: form.avatar,
      staleDaysOverride: grace,
      staleReminderMuted: form.staleMuted || undefined,
    };
    if (editing && id && existing) {
      const relationChanged = existing.relation !== form.relation;
      await updatePerson(id, { ...data, ...(relationChanged ? { relationChangedAt: Date.now() } : {}) });
      if (relationChanged) {
        // 关系变更小仪式：时间线自动记一条
        await addInteraction({
          personId: id,
          type: 'relationChange',
          memo: `${existing.nickname || existing.name} 搬进了${RELATIONS[form.relation].label}区`,
        });
        toast(`${name} 搬进了${RELATIONS[form.relation].label}区！`);
      } else {
        toast('已保存');
      }
      nav(`/person/${id}`, { replace: true });
    } else {
      const p = await createPerson({ ...data, selfTags: [] });
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

  const defaultGrace = settings.graceDays[form.relation];

  return (
    <Page>
      <PageHeader title={editing ? '编辑村民' : '认识新村民'} left={<Button variant="ghost" iconName="back" aria-label="返回" onClick={() => nav(-1)} />} />

      <Panel title="头像">
        <AvatarEditor value={form.avatar} onChange={(a) => set('avatar', a)} relation={form.relation} />
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
              <Select
                value={form.relation}
                onChange={(e) => {
                  const r = e.target.value as RelationType;
                  set('relation', r);
                  if (!editing) set('avatar', randomAvatar(r));
                }}
              >
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
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-sm)' }}>
            <input type="checkbox" checked={form.isLunar} onChange={(e) => set('isLunar', e.target.checked)} style={{ width: 20, height: 20 }} />
            TA 过农历生日（提醒和生日加成按农历算）
          </label>
        </div>
      </Panel>

      <Panel title="性格标签">
        <TagInput values={form.tags} onChange={(v) => set('tags', v)} placeholder="比如：慢热、爱吐槽、靠谱" />
      </Panel>

      <Panel title="忌讳 / 雷区">
        <TagInput values={form.taboos} onChange={(v) => set('taboos', v)} placeholder="比如：别问工资、不吃香菜" danger />
      </Panel>

      <Panel title="联系节奏">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label={`久未联系宽限天数（${RELATIONS[form.relation].label}默认 ${RELATIONS[form.relation].decays ? `${defaultGrace} 天` : '不衰减'}）`} hint="超过这个天数没互动会开始掉分并提醒；关系淡了就把这里调大">
            <Input inputMode="numeric" placeholder={`留空用默认 ${defaultGrace}`} value={form.graceOverride} onChange={(e) => set('graceOverride', e.target.value.replace(/\D/g, '').slice(0, 4))} />
          </Field>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-sm)' }}>
            <input type="checkbox" checked={form.staleMuted} onChange={(e) => set('staleMuted', e.target.checked)} style={{ width: 20, height: 20 }} />
            关闭这个人的久未联系提醒
          </label>
        </div>
      </Panel>

      <Button variant="primary" block onClick={submit}>
        {editing ? '保存' : '搬进村里'}
      </Button>
    </Page>
  );
}
