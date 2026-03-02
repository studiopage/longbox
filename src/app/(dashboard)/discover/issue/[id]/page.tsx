'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Book,
  Play,
  Calendar,
  Building2,
  User,
  Clock,
  Hash,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { getIssueDetails, type IssueDetails } from './actions';

export default function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [issue, setIssue] = useState<IssueDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadIssue() {
      setLoading(true);
      const data = await getIssueDetails(resolvedParams.id);
      setIssue(data);
      setLoading(false);
    }
    loadIssue();
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        {/* Skeleton */}
        <div className="relative h-[60vh] min-h-[500px] animate-pulse bg-card" />
        <div className="max-w-7xl mx-auto px-8 py-12 space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="h-64 bg-muted rounded" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="min-h-screen bg-background text-foreground p-8">
        <Link href="/discovery" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Discovery
        </Link>
        <div className="text-center py-20">
          <Book className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium text-muted-foreground">Issue not found</h3>
        </div>
      </div>
    );
  }

  const progressPercentage = issue.progress
    ? Math.round((issue.progress.page / issue.pageCount) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section with Backdrop */}
      <div className="relative h-[60vh] min-h-[500px] overflow-hidden">
        {/* Blurred Background - use cover as backdrop */}
        <div
          className="absolute inset-0 bg-cover bg-center blur-3xl opacity-20 scale-125"
          style={{ backgroundImage: `url(${issue.coverUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-transparent" />

        {/* Content */}
        <div className="relative z-10 h-full max-w-7xl mx-auto px-8 flex items-center">
          {/* Back Button */}
          <Link
            href={issue.seriesId ? `/series/${issue.seriesId}` : '/discovery'}
            className="absolute top-8 left-8 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors bg-background/50 px-4 py-2 rounded-full border border-border"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Series
          </Link>

          <div className="flex gap-12 items-center w-full pt-16">
            {/* Cover Art */}
            <div className="hidden md:block w-64 lg:w-80 aspect-[2/3] rounded overflow-hidden border border-border shadow-2xl shadow-black/50 flex-shrink-0 relative group">
              <img
                src={issue.coverUrl}
                alt={issue.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Reading Progress Overlay */}
              {issue.progress && progressPercentage > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              )}
            </div>

            {/* Issue Info */}
            <div className="flex-1 space-y-6 max-w-2xl">
              {/* Series Name */}
              {issue.seriesName && (
                <Link
                  href={`/series/${issue.seriesId}`}
                  className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-bold uppercase tracking-wide text-sm transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  {issue.seriesName}
                </Link>
              )}

              {/* Title */}
              <h1 className="text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                {issue.title}
              </h1>

              {/* Metadata Row */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {issue.number && (
                  <span className="flex items-center gap-2 bg-muted/80 px-3 py-1.5 rounded">
                    <Hash className="w-4 h-4" />
                    Issue #{issue.number}
                  </span>
                )}
                {issue.publishedDate && (
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {issue.publishedDate}
                  </span>
                )}
                {issue.publisher && (
                  <span className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {issue.publisher}
                  </span>
                )}
                {issue.pageCount > 0 && (
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {issue.pageCount} Pages
                  </span>
                )}
              </div>

              {/* Progress Badge */}
              {issue.progress && (
                <div className="flex items-center gap-3">
                  {issue.progress.isCompleted ? (
                    <div className="flex items-center gap-2 px-4 py-2 rounded bg-primary/10 border border-primary/20 text-primary/70">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-medium">Completed</span>
                    </div>
                  ) : progressPercentage > 0 ? (
                    <div className="flex items-center gap-3 px-4 py-2 rounded bg-primary/10 border border-primary/20 text-primary">
                      <Eye className="w-5 h-5" />
                      <div>
                        <span className="font-medium">{progressPercentage}% Read</span>
                        <span className="text-xs text-primary/70 ml-2">
                          Page {issue.progress.page} of {issue.pageCount}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 pt-4">
                {issue.hasFile && (
                  <Link
                    href={`/read/${issue.id}`}
                    className="flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded font-black text-lg transition-colors"
                  >
                    <Play className="w-6 h-6 fill-current" />
                    {progressPercentage > 0 && !issue.progress?.isCompleted
                      ? 'Continue Reading'
                      : issue.progress?.isCompleted
                        ? 'Read Again'
                        : 'Read Now'}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="max-w-7xl mx-auto px-8 py-12 space-y-12">
        {/* Synopsis */}
        {issue.summary && (
          <section className="p-6 rounded bg-card/50 border border-border">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Synopsis
            </h2>
            <p className="text-muted-foreground leading-relaxed text-lg">{issue.summary}</p>
          </section>
        )}

        {/* Details Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Credits */}
          {issue.authors && (
            <div className="p-6 rounded bg-card/50 border border-border">
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-4 flex items-center gap-2">
                <User className="w-4 h-4" />
                Credits
              </h3>
              <div className="space-y-3">
                {issue.authors.split(',').map((author, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <span className="text-muted-foreground font-medium">{author.trim()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File Info (for local files) */}
          {issue.hasFile && issue.fileSize && (
            <div className="p-6 rounded bg-card/50 border border-border">
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                File Info
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-muted-foreground uppercase">File Size</span>
                  <p className="text-muted-foreground font-medium">
                    {(issue.fileSize / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase">Page Count</span>
                  <p className="text-muted-foreground font-medium">{issue.pageCount} pages</p>
                </div>
              </div>
            </div>
          )}

          {/* Story Arcs (if available) */}
          {issue.storyArcs && issue.storyArcs.length > 0 && (
            <div className="p-6 rounded bg-card/50 border border-border">
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-4 flex items-center gap-2">
                <Book className="w-4 h-4" />
                Story Arcs
              </h3>
              <div className="flex flex-wrap gap-2">
                {issue.storyArcs.map((arc: any, i: number) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 bg-muted rounded text-sm text-muted-foreground"
                  >
                    {arc.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navigation: Previous/Next Issue */}
        {(issue.previousIssue || issue.nextIssue) && (
          <section className="pt-8 border-t border-border">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-6">
              More from this series
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              {issue.previousIssue && (
                <Link
                  href={`/discover/issue/${issue.previousIssue.id}`}
                  className="group flex items-center gap-4 p-4 rounded bg-card/30 border border-border hover:bg-accent hover:border-border transition-all"
                >
                  <ChevronLeft className="w-6 h-6 text-muted-foreground group-hover:text-muted-foreground" />
                  <div className="flex-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Previous Issue</span>
                    <p className="text-foreground font-medium">
                      #{issue.previousIssue.number}
                      {issue.previousIssue.title && ` - ${issue.previousIssue.title}`}
                    </p>
                  </div>
                  <div className="w-12 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
                    {issue.previousIssue.coverUrl ? (
                      <img
                        src={issue.previousIssue.coverUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Book className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </Link>
              )}
              {issue.nextIssue && (
                <Link
                  href={`/discover/issue/${issue.nextIssue.id}`}
                  className="group flex items-center gap-4 p-4 rounded bg-card/30 border border-border hover:bg-accent hover:border-border transition-all"
                >
                  <div className="w-12 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
                    {issue.nextIssue.coverUrl ? (
                      <img
                        src={issue.nextIssue.coverUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Book className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-right">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Next Issue</span>
                    <p className="text-foreground font-medium">
                      #{issue.nextIssue.number}
                      {issue.nextIssue.title && ` - ${issue.nextIssue.title}`}
                    </p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-muted-foreground" />
                </Link>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
