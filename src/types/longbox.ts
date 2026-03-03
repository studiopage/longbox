export type EditionType = 'issue' | 'tpb' | 'omnibus';
export type RequestState = 'draft' | 'requested' | 'searching' | 'fulfilled';
export type SeriesStatus = 'ongoing' | 'ended' | 'canceled';

// The "Truth" (Metadata from ComicVine/GCD)
export interface Series {
  id: string; // UUID
  name: string;
  year: number | null;
  publisher: string | null;
  description: string | null;
  status: string | null;
  thumbnail_url: string | null;
  cv_id: number | null;
  // Legacy fields for compatibility
  title?: string; // Alias for name
  start_year?: number | null; // Alias for year
  comicvine_id?: string | null; // Alias for cv_id
}

// The "Request" (Unified wishlist/download queue)
export interface Request {
  id: string;
  userId: string | null;
  seriesId: string | null;
  issueId: string | null;
  title: string;
  issueNumber: string | null;
  publisher: string | null;
  cvId: number | null;
  edition: EditionType;
  status: RequestState;
  webhookSent: boolean;
  requestedAt: Date | null;
  fulfilledAt: Date | null;
  createdAt: Date | null;
}

// Smart Collection types
export type ConditionField =
  | 'publisher'
  | 'reading_status'
  | 'series_status'
  | 'date_added'
  | 'year'
  | 'decade'
  | 'has_comicvine_id'
  | 'has_credits'
  | 'page_count'
  | 'format'
  | 'series_name'
  | 'story_arc'
  | 'author'
  | 'collection_membership'
  | 'file_size';

export type ConditionOperator =
  | 'is'
  | 'is_not'
  | 'contains'
  | 'starts_with'
  | 'is_true'
  | 'is_false'
  | 'greater_than'
  | 'less_than'
  | 'between'
  | 'within_last'
  | 'before'
  | 'after'
  | 'in'
  | 'not_in';

export interface Condition {
  field: ConditionField;
  operator: ConditionOperator;
  value: string;
}

export interface SmartRules {
  match: 'all' | 'any';
  conditions: Condition[];
}

export type SortPreference =
  | 'title_asc'
  | 'title_desc'
  | 'date_added_asc'
  | 'date_added_desc'
  | 'issue_number_asc'
  | 'issue_number_desc'
  | 'year_asc'
  | 'year_desc'
  | 'publisher_asc';

// Field metadata for the rule builder UI
export interface FieldDefinition {
  field: ConditionField;
  label: string;
  group: 'Metadata' | 'Reading' | 'Library';
  operators: ConditionOperator[];
  valueType: 'text' | 'enum' | 'number' | 'boolean' | 'date' | 'collection';
  enumValues?: { label: string; value: string }[];
}
