export type EditionType = 'issue' | 'tpb' | 'omnibus';
export type RequestState = 'draft' | 'requested' | 'searching' | 'fulfilled';
export type SeriesStatus = 'ongoing' | 'ended' | 'canceled';

// The "Truth" (Metadata from ComicVine/GCD)
export interface Series {
  id: string; // UUID
  title: string;
  start_year: number;
  publisher: string | null;
  description: string | null;
  status: SeriesStatus;
  thumbnail_url: string | null;
  comicvine_id: string | null;
}

// The "Request" (User Action)
export interface Request {
  id: string; // UUID
  series_id: string;
  edition: EditionType;
  state: RequestState;
  created_at: Date;
  updated_at: Date;
}
