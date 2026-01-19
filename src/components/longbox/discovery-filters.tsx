'use client'

import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { PublisherCombobox } from './publisher-combobox'; // Import new component

const DECADES = [
  { value: 'all', label: 'Any Year' },
  { value: '2024', label: '2024' },
  { value: '2023', label: '2023' },
  { value: '2020', label: '2020s' },
  { value: '2010', label: '2010s' },
  { value: '2000', label: '2000s' },
  { value: '1990', label: '1990s' },
  { value: '1980', label: '1980s' },
  { value: '1970', label: '1970s' },
];

const SORTS = [
  { value: 'newest', label: 'Recently Added' },
  { value: 'popular', label: 'Most Issues' },
  { value: 'year_desc', label: 'Year (Newest)' },
  { value: 'oldest', label: 'Year (Oldest)' },
  { value: 'alpha', label: 'A-Z' },
];

export function DiscoveryFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset to page 1 on filter change
    params.delete('page');
    router.push(`/discovery?${params.toString()}`);
  };

  const hasFilters = searchParams.toString().length > 0;

  return (
    <div className="flex flex-col md:flex-row gap-4 items-center bg-muted/30 p-4 rounded-lg border mb-8">
      
      {/* NEW: Publisher Combobox */}
      <div className="w-full md:w-auto">
         <PublisherCombobox 
            value={searchParams.get('publisher') || 'all'}
            onChange={(val) => updateFilter('publisher', val)}
         />
      </div>

      {/* Year */}
      <div className="w-full md:w-[150px]">
        <Select 
            defaultValue={searchParams.get('year') || 'all'}
            onValueChange={(val) => updateFilter('year', val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {DECADES.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sort */}
      <div className="w-full md:w-[180px] ml-auto">
        <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Sort By</span>
            <Select 
                defaultValue={searchParams.get('sort') || 'newest'}
                onValueChange={(val) => updateFilter('sort', val)}
            >
            <SelectTrigger className="h-9">
                <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
                {SORTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
            </SelectContent>
            </Select>
        </div>
      </div>

      {/* Clear Button */}
      {hasFilters && (
        <Button variant="ghost" size="icon" onClick={() => router.push('/discovery')}>
            <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

