'use client';

import { useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { getSmartCollectionPreview } from '@/actions/collections';
import type { SmartRules } from '@/types/longbox';

interface CollectionPreviewProps {
  rules: SmartRules;
}

export function CollectionPreview({ rules }: CollectionPreviewProps) {
  const [count, setCount] = useState<number | null>(null);
  const [books, setBooks] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!rules.conditions || rules.conditions.length === 0) {
      setCount(0);
      setBooks([]);
      return;
    }

    // Check if all conditions have required values
    const hasValidConditions = rules.conditions.every((c) => {
      // Boolean fields don't need a value
      if (c.operator === 'is_true' || c.operator === 'is_false') return true;
      return c.value !== '';
    });

    if (!hasValidConditions) {
      setCount(null);
      setBooks([]);
      return;
    }

    setLoading(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const result = await getSmartCollectionPreview(rules, 6);
        setCount(result.count);
        setBooks(result.books);
      } catch {
        setCount(null);
        setBooks([]);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [rules]);

  if (rules.conditions.length === 0) {
    return (
      <div className="text-xs text-[rgba(255,255,255,0.32)] py-3">
        Add conditions to see matching books
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[rgba(160,180,145,0.5)]" />
        ) : null}
        <span className="text-sm text-[#c0c8b8]">
          {count !== null ? (
            <>
              <span className="font-medium">{count}</span>{' '}
              {count === 1 ? 'book matches' : 'books match'}
            </>
          ) : (
            'Calculating...'
          )}
        </span>
      </div>

      {books.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {books.map((book) => (
            <div
              key={book.id}
              className="shrink-0 w-[60px] h-[90px] rounded border border-[rgba(255,255,255,0.06)] overflow-hidden bg-[rgba(160,180,145,0.05)]"
            >
              <img
                src={`/api/cover/${book.id}`}
                alt={book.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
