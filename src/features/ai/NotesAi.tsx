import { useState } from 'react';
import type { Note, Person } from '@/db/types';
import { extractFromNotes } from '@/ai/extract';
import { estimateTokens, friendlyError } from '@/ai/client';
import type { ExtractResult } from '@/ai/schemas';
import { Button } from '@/ui/Button';
import { useToast } from '@/ui/Toast';
import { useAi } from './useAi';
import { ExtractReviewModal } from './ExtractReviewModal';

/** 笔记 Tab 的 AI 入口：单条 / 批量整理 */
export function useNotesAi(person: Person) {
  const ai = useAi();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [review, setReview] = useState<{ result: ExtractResult; noteIds: string[] } | null>(null);

  const run = async (notes: Note[]) => {
    if (!ai.available || notes.length === 0 || busy) return;
    const key = notes.map((n) => n.id).join(',');
    setBusy(key);
    try {
      const result = await extractFromNotes(person, notes, ai.model);
      setReview({ result, noteIds: notes.map((n) => n.id) });
    } catch (e) {
      toast(friendlyError(e), 'error');
    } finally {
      setBusy(null);
    }
  };

  const pending = person.notes.filter((n) => !n.aiProcessedAt);
  const tokens = estimateTokens(pending.map((n) => n.text).join('\n')) + 400;

  const BatchButton = () =>
    ai.available && pending.length > 0 ? (
      <Button variant="ghost" size="small" block disabled={busy !== null} onClick={() => run(pending)}>
        {busy && busy.includes(',') ? '整理中…' : `整理所有未整理的笔记（${pending.length} 条，约 ${tokens} token）`}
      </Button>
    ) : null;

  const NoteButton = ({ note }: { note: Note }) => {
    if (!ai.available) return null;
    if (note.aiProcessedAt) return <span style={{ fontSize: 10, color: 'var(--grass-dark)' }}>✓ 已整理</span>;
    return (
      <Button size="small" variant="ghost" disabled={busy !== null} onClick={() => run([note])}>
        {busy === note.id ? '整理中…' : '让 AI 整理'}
      </Button>
    );
  };

  const ReviewModal = () => (review ? <ExtractReviewModal person={person} result={review.result} noteIds={review.noteIds} onClose={() => setReview(null)} /> : null);

  return { available: ai.available, BatchButton, NoteButton, ReviewModal };
}
