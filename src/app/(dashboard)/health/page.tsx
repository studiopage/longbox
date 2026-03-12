'use client';

import { useState } from 'react';
import { HeroHeader } from '@/components/longbox/hero-header';
import {
  ShieldCheck,
  FileWarning,
  Database,
  Type,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileX,
  HardDrive,
  BookOpen,
  FileText,
  RefreshCw,
} from 'lucide-react';
import type { MediaIssue, ConsistencyIssue, NamingIssue } from '@/actions/data-hygiene';

type AuditStatus = 'idle' | 'running' | 'done' | 'error';

interface MediaResult {
  scanned: number;
  healthy: number;
  issues: MediaIssue[];
}

interface ConsistencyResult {
  issues: ConsistencyIssue[];
  stats: {
    totalBooks: number;
    totalSeries: number;
    booksWithoutTitle: number;
    booksZeroSize: number;
    booksZeroPages: number;
    seriesWithoutPublisher: number;
    seriesWithoutYear: number;
  };
}

interface NamingResult {
  issues: NamingIssue[];
  stats: {
    nonStandardExtensions: number;
    missingIssueNumbers: number;
    inconsistentSeriesNames: number;
  };
}

function StatCard({ icon: Icon, label, value, variant = 'default' }: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  variant?: 'default' | 'success' | 'warning' | 'error';
}) {
  const iconColors = {
    default: 'text-primary/70',
    success: 'text-green-500/70',
    warning: 'text-yellow-500/70',
    error: 'text-red-500/70',
  };

  return (
    <div className="rounded border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-5 h-5 ${iconColors[variant]}`} />
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

function AuditSection({ title, icon: Icon, status, onRun, children }: {
  title: string;
  icon: React.ElementType;
  status: AuditStatus;
  onRun: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary" />
          {title}
        </h2>
        <button
          onClick={onRun}
          disabled={status === 'running'}
          className="flex items-center gap-2 bg-secondary text-foreground px-4 py-2 rounded font-medium hover:bg-accent transition-colors text-sm disabled:opacity-50"
        >
          {status === 'running' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {status === 'idle' ? 'Run Audit' : status === 'running' ? 'Scanning...' : 'Re-run'}
        </button>
      </div>
      {children}
    </section>
  );
}

function IssueRow({ icon: Icon, detail, variant = 'warning' }: {
  icon: React.ElementType;
  detail: string;
  variant?: 'warning' | 'error' | 'info';
}) {
  const colors = {
    warning: 'text-yellow-500/70',
    error: 'text-red-500/70',
    info: 'text-muted-foreground',
  };

  return (
    <div className="flex items-start gap-3 p-3 text-sm">
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${colors[variant]}`} />
      <span className="text-foreground/80 break-all">{detail}</span>
    </div>
  );
}

const MEDIA_ICONS: Record<string, React.ElementType> = {
  corrupt_archive: XCircle,
  wrong_format: FileWarning,
  empty_archive: FileX,
  not_an_archive: FileWarning,
  file_missing: FileX,
  zero_bytes: FileX,
};

const MEDIA_VARIANTS: Record<string, 'warning' | 'error'> = {
  corrupt_archive: 'error',
  wrong_format: 'warning',
  empty_archive: 'warning',
  not_an_archive: 'error',
  file_missing: 'error',
  zero_bytes: 'error',
};

export default function HealthPage() {
  const [mediaStatus, setMediaStatus] = useState<AuditStatus>('idle');
  const [mediaResult, setMediaResult] = useState<MediaResult | null>(null);
  const [mediaFixing, setMediaFixing] = useState(false);

  const [consistencyStatus, setConsistencyStatus] = useState<AuditStatus>('idle');
  const [consistencyResult, setConsistencyResult] = useState<ConsistencyResult | null>(null);
  const [consistencyFixing, setConsistencyFixing] = useState(false);

  const [namingStatus, setNamingStatus] = useState<AuditStatus>('idle');
  const [namingResult, setNamingResult] = useState<NamingResult | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [fetchingCV, setFetchingCV] = useState(false);

  const runMediaAudit = async () => {
    setMediaStatus('running');
    try {
      const { validateMediaIntegrity } = await import('@/actions/data-hygiene');
      const result = await validateMediaIntegrity(5000);
      setMediaResult(result);
      setMediaStatus('done');
    } catch {
      setMediaStatus('error');
    }
  };

  const runConsistencyAudit = async () => {
    setConsistencyStatus('running');
    try {
      const { auditDataConsistency } = await import('@/actions/data-hygiene');
      const result = await auditDataConsistency();
      setConsistencyResult(result);
      setConsistencyStatus('done');
    } catch {
      setConsistencyStatus('error');
    }
  };

  const runNamingAudit = async () => {
    setNamingStatus('running');
    try {
      const { auditNamingConventions } = await import('@/actions/data-hygiene');
      const result = await auditNamingConventions();
      setNamingResult(result);
      setNamingStatus('done');
    } catch {
      setNamingStatus('error');
    }
  };

  const runAll = () => {
    runMediaAudit();
    runConsistencyAudit();
    runNamingAudit();
  };

  const fixMissingFiles = async () => {
    setMediaFixing(true);
    try {
      const { cleanupMissingFiles } = await import('@/actions/data-hygiene');
      await cleanupMissingFiles();
      // Re-run audit to refresh results
      await runMediaAudit();
    } catch (error) {
      console.error('Cleanup failed:', error);
    } finally {
      setMediaFixing(false);
    }
  };

  const fixEmptySeries = async () => {
    setConsistencyFixing(true);
    try {
      const { cleanupEmptySeries } = await import('@/actions/data-hygiene');
      await cleanupEmptySeries();
      // Re-run audit to refresh results
      await runConsistencyAudit();
    } catch (error) {
      console.error('Cleanup failed:', error);
    } finally {
      setConsistencyFixing(false);
    }
  };

  const backfillPages = async () => {
    setConsistencyFixing(true);
    try {
      const { backfillPageCounts } = await import('@/actions/data-hygiene');
      await backfillPageCounts(50);
      // Re-run audit to refresh results
      await runConsistencyAudit();
    } catch (error) {
      console.error('Backfill failed:', error);
    } finally {
      setConsistencyFixing(false);
    }
  };

  const backfillMetadata = async () => {
    setBackfilling(true);
    try {
      // Call the API endpoint directly since it's admin-only
      const response = await fetch('/api/v1/backfill', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(localStorage.getItem('basicAuth') || ':'),
        },
      });
      if (response.ok) {
        // Re-run consistency audit to show updated numbers
        await runConsistencyAudit();
      }
    } catch (error) {
      console.error('Backfill metadata failed:', error);
    } finally {
      setBackfilling(false);
    }
  };

  const fetchMissingComicVine = async () => {
    setFetchingCV(true);
    try {
      const { fetchMissingComicVineData } = await import('@/actions/discovery');
      await fetchMissingComicVineData();
      // Re-run consistency audit to show updated numbers
      await runConsistencyAudit();
    } catch (error) {
      console.error('ComicVine fetch failed:', error);
    } finally {
      setFetchingCV(false);
    }
  };

  const totalIssues =
    (mediaResult?.issues.length ?? 0) +
    (consistencyResult?.issues.length ?? 0) +
    (namingResult?.issues.length ?? 0);

  const allDone = mediaStatus === 'done' && consistencyStatus === 'done' && namingStatus === 'done';
  const anyRunning = mediaStatus === 'running' || consistencyStatus === 'running' || namingStatus === 'running';

  return (
    <>
      <HeroHeader title="Library Health" />
      <main className="p-6 md:p-8 space-y-10">

        {/* Run All Button */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {allDone
                ? `Audit complete. ${totalIssues === 0 ? 'No issues found.' : `${totalIssues} issue${totalIssues !== 1 ? 's' : ''} found.`}`
                : 'Run audits to check media integrity, data consistency, and naming conventions.'}
            </p>
          </div>
          <button
            onClick={runAll}
            disabled={anyRunning}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded font-bold hover:bg-primary/90 transition duration-200 ease-out disabled:opacity-50"
          >
            {anyRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            {anyRunning ? 'Running...' : 'Run All Audits'}
          </button>
        </div>

        {/* Summary Cards (shown after all complete) */}
        {allDone && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={HardDrive}
              label="Files Scanned"
              value={mediaResult?.scanned ?? 0}
            />
            <StatCard
              icon={CheckCircle2}
              label="Healthy Files"
              value={mediaResult?.healthy ?? 0}
              variant="success"
            />
            <StatCard
              icon={AlertTriangle}
              label="Total Issues"
              value={totalIssues}
              variant={totalIssues > 0 ? 'warning' : 'success'}
            />
            <StatCard
              icon={Database}
              label="DB Records"
              value={`${consistencyResult?.stats.totalBooks ?? 0} / ${consistencyResult?.stats.totalSeries ?? 0}`}
            />
          </div>
        )}

        {/* Media Integrity */}
        <AuditSection title="Media Integrity" icon={FileWarning} status={mediaStatus} onRun={runMediaAudit}>
          {mediaStatus === 'idle' && (
            <div className="rounded border border-border bg-card p-6 text-center">
              <FileWarning className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Validates archive magic bytes, file readability, and image content</p>
            </div>
          )}
          {mediaStatus === 'error' && (
            <div className="rounded border border-destructive/30 bg-card p-4">
              <p className="text-sm text-destructive">Audit failed. Make sure you are authenticated (Basic Auth required for API).</p>
            </div>
          )}
          {mediaResult && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <StatCard icon={HardDrive} label="Scanned" value={mediaResult.scanned} />
                <StatCard icon={CheckCircle2} label="Healthy" value={mediaResult.healthy} variant="success" />
                <StatCard
                  icon={AlertTriangle}
                  label="Issues"
                  value={mediaResult.issues.length}
                  variant={mediaResult.issues.length > 0 ? 'error' : 'success'}
                />
              </div>
              {mediaResult.issues.length > 0 && (
                <div className="rounded border border-border bg-card overflow-hidden">
                  <div className="p-3 border-b border-border">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      {mediaResult.issues.length} issue{mediaResult.issues.length !== 1 ? 's' : ''} found
                    </h3>
                  </div>
                  <div className="divide-y divide-border max-h-96 overflow-auto">
                    {mediaResult.issues.map((issue, i) => (
                      <IssueRow
                        key={i}
                        icon={MEDIA_ICONS[issue.issue] ?? AlertTriangle}
                        detail={`${issue.title} — ${issue.detail}`}
                        variant={MEDIA_VARIANTS[issue.issue] ?? 'warning'}
                      />
                    ))}
                  </div>
                </div>
              )}
              {mediaResult.issues.length === 0 && (
                <div className="rounded border border-border bg-card p-6 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">All archives are healthy</p>
                </div>
              )}
            </>
          )}
        </AuditSection>

        {/* Data Consistency */}
        <AuditSection title="Data Consistency" icon={Database} status={consistencyStatus} onRun={runConsistencyAudit}>
          {consistencyStatus === 'idle' && (
            <div className="rounded border border-border bg-card p-6 text-center">
              <Database className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Checks for missing metadata, zero-size files, and database anomalies</p>
            </div>
          )}
          {consistencyStatus === 'error' && (
            <div className="rounded border border-destructive/30 bg-card p-4">
              <p className="text-sm text-destructive">Audit failed. Check authentication.</p>
            </div>
          )}
          {consistencyResult && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={BookOpen} label="Total Books" value={consistencyResult.stats.totalBooks} />
                <StatCard icon={FileX} label="No Title" value={consistencyResult.stats.booksWithoutTitle} variant={consistencyResult.stats.booksWithoutTitle > 0 ? 'warning' : 'success'} />
                <StatCard icon={HardDrive} label="Zero Size" value={consistencyResult.stats.booksZeroSize} variant={consistencyResult.stats.booksZeroSize > 0 ? 'error' : 'success'} />
                <StatCard icon={FileText} label="Zero Pages" value={consistencyResult.stats.booksZeroPages} variant={consistencyResult.stats.booksZeroPages > 0 ? 'warning' : 'success'} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <StatCard icon={Type} label="No Publisher" value={consistencyResult.stats.seriesWithoutPublisher} variant={consistencyResult.stats.seriesWithoutPublisher > 0 ? 'warning' : 'success'} />
                <StatCard icon={Type} label="No Year" value={consistencyResult.stats.seriesWithoutYear} variant={consistencyResult.stats.seriesWithoutYear > 0 ? 'warning' : 'success'} />
              </div>

              {/* Fix buttons */}
              <div className="flex gap-2 flex-wrap">
                {consistencyResult.stats.booksZeroSize > 0 && (
                  <button
                    onClick={fixMissingFiles}
                    disabled={consistencyFixing}
                    className="flex items-center gap-2 bg-destructive/10 text-destructive hover:bg-destructive/20 px-4 py-2 rounded font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    {consistencyFixing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Fix Missing Files ({consistencyResult.stats.booksZeroSize})
                  </button>
                )}
                {consistencyResult.stats.booksZeroPages > 0 && (
                  <button
                    onClick={backfillPages}
                    disabled={consistencyFixing}
                    className="flex items-center gap-2 bg-yellow-500/10 text-yellow-500/70 hover:bg-yellow-500/20 px-4 py-2 rounded font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    {consistencyFixing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Backfill Page Counts ({consistencyResult.stats.booksZeroPages})
                  </button>
                )}
                {(consistencyResult.stats.seriesWithoutPublisher > 0 || consistencyResult.stats.seriesWithoutYear > 0) && (
                  <>
                    <button
                      onClick={backfillMetadata}
                      disabled={backfilling}
                      className="flex items-center gap-2 bg-primary/10 text-primary hover:bg-primary/20 px-4 py-2 rounded font-medium text-sm transition-colors disabled:opacity-50"
                    >
                      {backfilling ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Backfill Series Metadata
                    </button>
                    <button
                      onClick={fetchMissingComicVine}
                      disabled={fetchingCV}
                      className="flex items-center gap-2 bg-blue-500/10 text-blue-500/70 hover:bg-blue-500/20 px-4 py-2 rounded font-medium text-sm transition-colors disabled:opacity-50"
                    >
                      {fetchingCV ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Fetch ComicVine Data
                    </button>
                  </>
                )}
              </div>
              {consistencyResult.issues.length > 0 && (
                <details>
                  <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none">
                    Show {consistencyResult.issues.length} issue{consistencyResult.issues.length !== 1 ? 's' : ''} detail{consistencyResult.issues.length !== 1 ? 's' : ''}
                  </summary>
                  <div className="mt-2 rounded border border-border bg-card overflow-hidden">
                    <div className="divide-y divide-border max-h-96 overflow-auto">
                      {consistencyResult.issues.map((issue, i) => (
                        <IssueRow
                          key={i}
                          icon={issue.type === 'no_file_size' ? XCircle : AlertTriangle}
                          detail={issue.detail}
                          variant={issue.type === 'no_file_size' ? 'error' : 'warning'}
                        />
                      ))}
                    </div>
                  </div>
                </details>
              )}
              {consistencyResult.issues.length === 0 && (
                <div className="rounded border border-border bg-card p-6 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No data consistency issues</p>
                </div>
              )}
            </>
          )}
        </AuditSection>

        {/* Naming Conventions */}
        <AuditSection title="Naming Conventions" icon={Type} status={namingStatus} onRun={runNamingAudit}>
          {namingStatus === 'idle' && (
            <div className="rounded border border-border bg-card p-6 text-center">
              <Type className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Checks file extensions, issue numbers, and series name consistency</p>
            </div>
          )}
          {namingStatus === 'error' && (
            <div className="rounded border border-destructive/30 bg-card p-4">
              <p className="text-sm text-destructive">Audit failed. Check authentication.</p>
            </div>
          )}
          {namingResult && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <StatCard icon={FileWarning} label="Bad Extensions" value={namingResult.stats.nonStandardExtensions} variant={namingResult.stats.nonStandardExtensions > 0 ? 'warning' : 'success'} />
                <StatCard icon={FileText} label="No Issue #" value={namingResult.stats.missingIssueNumbers} variant={namingResult.stats.missingIssueNumbers > 0 ? 'warning' : 'success'} />
                <StatCard icon={Type} label="Bad Names" value={namingResult.stats.inconsistentSeriesNames} variant={namingResult.stats.inconsistentSeriesNames > 0 ? 'warning' : 'success'} />
              </div>
              {namingResult.issues.length > 0 && (
                <details>
                  <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none">
                    Show {namingResult.issues.length} issue{namingResult.issues.length !== 1 ? 's' : ''} detail{namingResult.issues.length !== 1 ? 's' : ''}
                  </summary>
                  <div className="mt-2 rounded border border-border bg-card overflow-hidden">
                    <div className="divide-y divide-border max-h-96 overflow-auto">
                      {namingResult.issues.map((issue, i) => (
                        <IssueRow
                          key={i}
                          icon={AlertTriangle}
                          detail={issue.detail}
                          variant="warning"
                        />
                      ))}
                    </div>
                  </div>
                </details>
              )}
              {namingResult.issues.length === 0 && (
                <div className="rounded border border-border bg-card p-6 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">All naming conventions are consistent</p>
                </div>
              )}
            </>
          )}
        </AuditSection>

      </main>
    </>
  );
}
