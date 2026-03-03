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
