import { useState } from 'react';
import { Chip, Chips, Input } from '@/ui/Field';
import { Button } from '@/ui/Button';

interface Props {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  danger?: boolean;
}

/** 输入后回车 / 点添加，生成一排可删除的标签 */
export function TagInput({ values, onChange, placeholder, danger }: Props) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v || values.includes(v)) {
      setDraft('');
      return;
    }
    onChange([...values, v]);
    setDraft('');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button variant="ghost" onClick={add} iconName="plus" aria-label="添加" />
      </div>
      {values.length > 0 && (
        <Chips>
          {values.map((v) => (
            <Chip key={v} danger={danger} onRemove={() => onChange(values.filter((x) => x !== v))}>
              {v}
            </Chip>
          ))}
        </Chips>
      )}
    </div>
  );
}
