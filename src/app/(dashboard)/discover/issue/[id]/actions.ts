'use server';

import { db } from '@/db';
import { books, series, issues, read_progress } from '@/db/schema';
import { eq, and, lt, gt, asc, desc } from 'drizzle-orm';

interface AdjacentIssue {
  id: string;
  number: string | null;
  title: string | null;
  coverUrl: string | null;
}

interface ReadProgress {
  page: number;
  isCompleted: boolean;
}

export interface IssueDetails {
  id: string;
  title: string;
  number: string | null;
  summary: string | null;
  publisher: string | null;
  authors: string | null;
  publishedDate: string | null;
  pageCount: number;
  coverUrl: string;
  hasFile: boolean;
  fileSize: number | null;
  storyArcs: any[] | null;
  seriesId: string | null;
  seriesName: string | null;
  progress: ReadProgress | null;
  previousIssue: AdjacentIssue | null;
  nextIssue: AdjacentIssue | null;
}

export async function getIssueDetails(issueId: string): Promise<IssueDetails | null> {
  try {
    // First, try to find it as a local book
    const bookData = await db
      .select({
        id: books.id,
        title: books.title,
        number: books.number,
        summary: books.summary,
        publisher: books.publisher,
        authors: books.authors,
        publishedDate: books.published_date,
        pageCount: books.page_count,
        fileSize: books.file_size,
        storyArcs: books.story_arcs,
        seriesId: books.series_id,
        // Read progress
        progressPage: read_progress.page,
        isCompleted: read_progress.is_completed,
      })
      .from(books)
      .leftJoin(read_progress, eq(books.id, read_progress.book_id))
      .where(eq(books.id, issueId))
      .limit(1);

    if (bookData.length > 0) {
      const book = bookData[0];

      // Get series info
      let seriesName: string | null = null;
      if (book.seriesId) {
        const seriesData = await db
          .select({ name: series.name })
          .from(series)
          .where(eq(series.id, book.seriesId))
          .limit(1);
        seriesName = seriesData[0]?.name || null;
      }

      // Get adjacent books in the series
      let previousIssue: AdjacentIssue | null = null;
      let nextIssue: AdjacentIssue | null = null;

      if (book.seriesId && book.number) {
        const currentNum = parseFloat(book.number) || 0;

        // Get all books in series, sorted by number
        const allBooks = await db
          .select({
            id: books.id,
            number: books.number,
            title: books.title,
          })
          .from(books)
          .where(eq(books.series_id, book.seriesId))
          .orderBy(asc(books.number));

        // Find current index and get adjacent
        const currentIndex = allBooks.findIndex(b => b.id === issueId);
        if (currentIndex > 0) {
          const prev = allBooks[currentIndex - 1];
          previousIssue = {
            id: prev.id,
            number: prev.number,
            title: prev.title,
            coverUrl: `/api/cover/${prev.id}`,
          };
        }
        if (currentIndex < allBooks.length - 1) {
          const next = allBooks[currentIndex + 1];
          nextIssue = {
            id: next.id,
            number: next.number,
            title: next.title,
            coverUrl: `/api/cover/${next.id}`,
          };
        }
      }

      return {
        id: book.id,
        title: book.title || `Issue #${book.number}`,
        number: book.number,
        summary: book.summary,
        publisher: book.publisher,
        authors: book.authors,
        publishedDate: book.publishedDate
          ? new Date(book.publishedDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : null,
        pageCount: book.pageCount || 0,
        coverUrl: `/api/cover/${book.id}`,
        hasFile: true,
        fileSize: book.fileSize,
        storyArcs: book.storyArcs as any[] | null,
        seriesId: book.seriesId,
        seriesName,
        progress: book.progressPage
          ? {
              page: book.progressPage,
              isCompleted: book.isCompleted ?? false,
            }
          : null,
        previousIssue,
        nextIssue,
      };
    }

    // If not found as book, try as issue (from ComicVine sync)
    const issueData = await db
      .select({
        id: issues.id,
        title: issues.title,
        issueNumber: issues.issue_number,
        coverDate: issues.cover_date,
        thumbnailUrl: issues.thumbnail_url,
        read: issues.read,
        seriesId: issues.series_id,
      })
      .from(issues)
      .where(eq(issues.id, issueId))
      .limit(1);

    if (issueData.length > 0) {
      const issue = issueData[0];

      // Get series info
      let seriesName: string | null = null;
      let publisher: string | null = null;
      if (issue.seriesId) {
        const seriesData = await db
          .select({ name: series.name, publisher: series.publisher })
          .from(series)
          .where(eq(series.id, issue.seriesId))
          .limit(1);
        seriesName = seriesData[0]?.name || null;
        publisher = seriesData[0]?.publisher || null;
      }

      // Get adjacent issues
      let previousIssue: AdjacentIssue | null = null;
      let nextIssue: AdjacentIssue | null = null;

      if (issue.seriesId) {
        const allIssues = await db
          .select({
            id: issues.id,
            issueNumber: issues.issue_number,
            title: issues.title,
            thumbnailUrl: issues.thumbnail_url,
          })
          .from(issues)
          .where(eq(issues.series_id, issue.seriesId))
          .orderBy(asc(issues.cover_date));

        const currentIndex = allIssues.findIndex(i => i.id === issueId);
        if (currentIndex > 0) {
          const prev = allIssues[currentIndex - 1];
          previousIssue = {
            id: prev.id,
            number: prev.issueNumber,
            title: prev.title,
            coverUrl: prev.thumbnailUrl,
          };
        }
        if (currentIndex < allIssues.length - 1) {
          const next = allIssues[currentIndex + 1];
          nextIssue = {
            id: next.id,
            number: next.issueNumber,
            title: next.title,
            coverUrl: next.thumbnailUrl,
          };
        }
      }

      return {
        id: issue.id,
        title: issue.title || `Issue #${issue.issueNumber}`,
        number: issue.issueNumber,
        summary: null,
        publisher,
        authors: null,
        publishedDate: issue.coverDate
          ? new Date(issue.coverDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : null,
        pageCount: 0,
        coverUrl: issue.thumbnailUrl || '/placeholder.png',
        hasFile: false,
        fileSize: null,
        storyArcs: null,
        seriesId: issue.seriesId,
        seriesName,
        progress: issue.read ? { page: 0, isCompleted: true } : null,
        previousIssue,
        nextIssue,
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch issue details:', error);
    return null;
  }
}
