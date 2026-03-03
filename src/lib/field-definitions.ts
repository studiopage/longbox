import type { FieldDefinition } from '@/types/longbox';

export const FIELD_DEFINITIONS: FieldDefinition[] = [
  // Metadata
  {
    field: 'publisher',
    label: 'Publisher',
    group: 'Metadata',
    operators: ['is', 'is_not', 'contains'],
    valueType: 'text',
  },
  {
    field: 'series_name',
    label: 'Series Name',
    group: 'Metadata',
    operators: ['contains', 'starts_with'],
    valueType: 'text',
  },
  {
    field: 'series_status',
    label: 'Series Status',
    group: 'Metadata',
    operators: ['is', 'is_not'],
    valueType: 'enum',
    enumValues: [
      { label: 'Ongoing', value: 'ongoing' },
      { label: 'Ended', value: 'ended' },
      { label: 'Canceled', value: 'canceled' },
    ],
  },
  {
    field: 'year',
    label: 'Year',
    group: 'Metadata',
    operators: ['is', 'before', 'after', 'between'],
    valueType: 'number',
  },
  {
    field: 'decade',
    label: 'Decade',
    group: 'Metadata',
    operators: ['is'],
    valueType: 'enum',
    enumValues: [
      { label: '1940s', value: '1940' },
      { label: '1950s', value: '1950' },
      { label: '1960s', value: '1960' },
      { label: '1970s', value: '1970' },
      { label: '1980s', value: '1980' },
      { label: '1990s', value: '1990' },
      { label: '2000s', value: '2000' },
      { label: '2010s', value: '2010' },
      { label: '2020s', value: '2020' },
    ],
  },
  {
    field: 'author',
    label: 'Author / Creator',
    group: 'Metadata',
    operators: ['contains'],
    valueType: 'text',
  },
  {
    field: 'story_arc',
    label: 'Story Arc',
    group: 'Metadata',
    operators: ['contains'],
    valueType: 'text',
  },
  {
    field: 'format',
    label: 'File Format',
    group: 'Metadata',
    operators: ['is'],
    valueType: 'enum',
    enumValues: [
      { label: 'CBZ', value: 'cbz' },
      { label: 'CBR', value: 'cbr' },
      { label: 'PDF', value: 'pdf' },
    ],
  },

  // Reading
  {
    field: 'reading_status',
    label: 'Reading Status',
    group: 'Reading',
    operators: ['is', 'is_not'],
    valueType: 'enum',
    enumValues: [
      { label: 'Unread', value: 'unread' },
      { label: 'In Progress', value: 'in_progress' },
      { label: 'Completed', value: 'completed' },
    ],
  },
  {
    field: 'date_added',
    label: 'Date Added',
    group: 'Reading',
    operators: ['within_last', 'before', 'after'],
    valueType: 'number',
  },
  {
    field: 'page_count',
    label: 'Page Count',
    group: 'Reading',
    operators: ['greater_than', 'less_than', 'between'],
    valueType: 'number',
  },

  // Library
  {
    field: 'has_comicvine_id',
    label: 'Has ComicVine ID',
    group: 'Library',
    operators: ['is_true', 'is_false'],
    valueType: 'boolean',
  },
  {
    field: 'has_credits',
    label: 'Has Credits',
    group: 'Library',
    operators: ['is_true', 'is_false'],
    valueType: 'boolean',
  },
  {
    field: 'collection_membership',
    label: 'In Collection',
    group: 'Library',
    operators: ['in', 'not_in'],
    valueType: 'collection',
  },
  {
    field: 'file_size',
    label: 'File Size (bytes)',
    group: 'Library',
    operators: ['greater_than', 'less_than'],
    valueType: 'number',
  },
];

export const OPERATOR_LABELS: Record<string, string> = {
  is: 'is',
  is_not: 'is not',
  contains: 'contains',
  starts_with: 'starts with',
  is_true: 'is true',
  is_false: 'is false',
  greater_than: 'greater than',
  less_than: 'less than',
  between: 'between',
  within_last: 'within last (days)',
  before: 'before',
  after: 'after',
  in: 'in',
  not_in: 'not in',
};
