import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { AvatarConfig, Birth, SelfTag } from '@/db/types';
import { BirthSection, EMPTY_BIRTH_DRAFT, birthFromDraft, draftFromBirth, type BirthDraft } from '@/features/persons/BirthSection';
import { createPerson, deletePerson, updatePerson } from '@/db/persons';
import { addInteraction } from '@/db/interactions';
import { useSettings } from '@/db/settings';
import { RELATIONS, RELATION_ORDER, type RelationType } from '@/config/relations';
import { Page, PageHeader } from '@/app/Layout';
import { Panel } from '@/ui/Panel';
import { Modal } from '@/ui/Modal';
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
  birth: BirthDraft;
  selfTags: SelfTag[];
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
  birth: EMPTY_BIRTH_DRAFT,
  selfTags: [],
  tags: [],
  taboos: [],
  avatar: DEFAULT_AVATAR,
  graceOverride: '',
  staleMuted: false,
};

/** 同一路由组件在 /person/new 与 /person/new?me=1、不同 id 之间切换时不会重建，这里按 URL 加 key 强制重建 */
export function PersonFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  return <PersonFormInner key={`${id ?? 'new'}-${params.get('me') ?? ''}`} />;
}

function PersonFormInner() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  const settings = useSettings();
  const editing = Boolean(id);
  const creatingMe = !editing && params.get('me') === '1';
  const existing = useLiveQuery(() => (id ? db.persons.get(id) : undefined), [id]);
  const [form, setForm] = useState<FormState>(() => ({ ...EMPTY, avatar: randomAvatar('friend') }));
  const [loaded, setLoaded] = useState(!editing);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteName, setDeleteName] = useState('');

  useEffect(() => {
    if (!existing || loaded) return;
    setForm({
      name: existing.name,
      nickname: existing.nickname ?? '',
      relation: existing.relation,
      metOn: existing.metOn ?? '',
      birth: draftFromBirth(existing.birth),
      selfTags: existing.selfTags ?? [],
      tags: existing.tags,
      taboos: existing.taboos,
      avatar: existing.avatar,
      graceOverride: existing.staleDaysOverride != null ? String(existing.staleDaysOverride) : '',
      staleMuted: existing.staleReminderMuted ?? false,
    });
    setLoaded(true);
  }, [existing, loaded]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const parseBirth = (): Birth | undefined | 'invalid' => birthFromDraft(form.birth);

  const submit = async () => {
    const name = form.name.trim();
    if (!name) {
      toast('名字不能为空', 'error');
      return;
    }
    const birth = parseBirth();
    if (birth === 'invalid') {
      toast(form.birth.manual ? '手动四柱要把年月日三柱都选完' : '生日填得不太对', 'error');
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
      selfTags: form.selfTags,
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
      if (creatingMe) {
        const already = await db.persons.filter((x) => Boolean(x.isMe)).first();
        if (already) {
          nav(`/person/${already.id}/edit`, { replace: true });
          return;
        }
      }
      const p = await createPerson({ ...data, relation: creatingMe ? 'other' : data.relation, isMe: creatingMe || undefined });
      toast(creatingMe ? '我的档案建好了' : `${p.name} 搬进了村里！`);
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
  const isMe = creatingMe || Boolean(existing?.isMe);

  return (
    <Page>
      <PageHeader title={isMe ? '我的档案' : editing ? '编辑村民' : '认识新村民'} left={<Button variant="ghost" iconName="back" aria-label="返回" onClick={() => nav(-1)} />} />

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
            {!isMe && (
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
            )}
            {!isMe && (
            <Field label="认识日期">
              <Input type="date" value={form.metOn} onChange={(e) => set('metOn', e.target.value)} />
            </Field>
            )}
          </Row>
          <BirthSection value={form.birth} onChange={(b) => set('birth', b)} isMe={isMe} />
        </div>
      </Panel>

      <Panel title={isMe ? '我自己说的标签' : 'TA 自己说的标签'}>
        <SelfTagInput values={form.selfTags} onChange={(v) => set('selfTags', v)} />
      </Panel>

      <Panel title="性格标签">
        <TagInput values={form.tags} onChange={(v) => set('tags', v)} placeholder="比如：慢热、爱吐槽、靠谱" />
      </Panel>

      <Panel title="忌讳 / 雷区">
        <TagInput values={form.taboos} onChange={(v) => set('taboos', v)} placeholder="比如：别问工资、不吃香菜" danger />
      </Panel>

      {!isMe && (
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
      )}

      <Button variant="primary" block onClick={submit}>
        {editing ? '保存' : isMe ? '建好我的档案' : '搬进村里'}
      </Button>

      {editing && existing && !existing.isMe && (
        <>
          <div style={{ height: 24 }} />
          <Button variant="ghost" block iconName="trash" onClick={() => { setDeleteName(''); setConfirmDelete(true); }}>
            让 TA 搬走（删除）
          </Button>
          <Modal open={confirmDelete} title="确定删除？" onClose={() => setConfirmDelete(false)}>
            <p>{existing.name} 的资料、笔记和互动记录都会被删除，无法恢复。输入 TA 的名字确认：</p>
            <Input value={deleteName} onChange={(e) => setDeleteName(e.target.value)} placeholder={existing.name} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button block variant="ghost" onClick={() => setConfirmDelete(false)}>
                取消
              </Button>
              <Button
                block
                variant="danger"
                disabled={deleteName.trim() !== existing.name}
                onClick={async () => {
                  await deletePerson(existing.id);
                  toast(`${existing.name} 搬走了`);
                  nav('/', { replace: true });
                }}
              >
                删除
              </Button>
            </div>
          </Modal>
        </>
      )}
    </Page>
  );
}

/** 对方自己说的标签：MBTI / 血型 / 上升星座 等键值对 */
function SelfTagInput({ values, onChange }: { values: SelfTag[]; onChange: (v: SelfTag[]) => void }) {
  const [k, setK] = useState('');
  const [v, setV] = useState('');
  const PRESETS = ['MBTI', '血型', '上升星座', '月亮星座'];
  const add = () => {
    const key = k.trim();
    const val = v.trim();
    if (!key || !val) return;
    onChange([...values.filter((t) => t.key !== key), { key, value: val }]);
    setK('');
    setV('');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PRESETS.map((p) => (
          <Button key={p} size="small" variant="ghost" onClick={() => setK(p)}>
            {p}
          </Button>
        ))}
      </div>
      <Row>
        <Input value={k} onChange={(e) => setK(e.target.value)} placeholder="比如 MBTI" maxLength={12} />
        <Input value={v} onChange={(e) => setV(e.target.value)} placeholder="比如 INFJ" maxLength={20} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <Button variant="ghost" iconName="plus" aria-label="添加" onClick={add} />
      </Row>
      {values.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {values.map((t) => (
            <span key={t.key} className="px-corner-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 8px', background: 'var(--paper-dark)', border: '2px solid var(--wood-light)', fontSize: 'var(--fs-sm)' }}>
              {t.key} · {t.value}
              <span role="button" aria-label="删除" onClick={() => onChange(values.filter((x) => x.key !== t.key))} style={{ color: 'var(--ink-soft)' }}>
                ✕
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
