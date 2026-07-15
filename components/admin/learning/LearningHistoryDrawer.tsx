"use client";

import {
  useEffect,
} from "react";

import type {
  LearningHistoryRecord,
  LearningOutcome,
} from "@/components/admin/learning/types";

type LearningHistoryDrawerProps = {
  record:
    | LearningHistoryRecord
    | null;
  onClose: () => void;
};

export default function LearningHistoryDrawer({
  record,
  onClose,
}: LearningHistoryDrawerProps) {
  useEffect(() => {
    if (!record) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [record, onClose]);

  if (!record) {
    return null;
  }

  const executionData =
    getRecordValue(
      record.metadata,
      "executionData"
    );

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-end bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Learning record details"
      onMouseDown={(event) => {
        if (
          event.currentTarget ===
          event.target
        ) {
          onClose();
        }
      }}
    >
      <aside className="h-full w-full max-w-2xl overflow-y-auto border-l border-zinc-800 bg-[#0b1020] shadow-2xl shadow-black/50">
        <div className="sticky top-0 z-10 border-b border-zinc-800 bg-[#0b1020]/95 px-6 py-5 backdrop-blur">
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
                ZAOS Learning Record
              </p>

              <h2 className="mt-2 break-words text-2xl font-black text-white">
                {formatStrategy(
                  record.recommendationType
                )}
              </h2>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-white/70">
                  {record.agent.toUpperCase()}
                </span>

                <OutcomeBadge
                  outcome={record.outcome}
                />

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-black ${scoreClasses(
                    record.score
                  )}`}
                >
                  Score {record.score}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-white/65 transition hover:border-white/30 hover:text-white"
              aria-label="Close details"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-6 p-6">
          <section className="grid gap-4 sm:grid-cols-2">
            <DetailCard
              label="Recommendation ID"
              value={
                record.recommendationId ||
                record.id
              }
            />

            <DetailCard
              label="Record ID"
              value={record.id}
            />

            <DetailCard
              label="Created"
              value={formatDate(
                record.createdAt
              )}
            />

            <DetailCard
              label="Completed"
              value={formatDate(
                record.completedAt
              )}
            />

            <DetailCard
              label="Version"
              value={
                record.version ||
                "Not available"
              }
            />

            <DetailCard
              label="Outcome"
              value={formatStrategy(
                record.outcome
              )}
            />
          </section>

          <SectionCard title="Learning Notes">
            {record.notes?.length > 0 ? (
              <ol className="space-y-3">
                {record.notes.map(
                  (note, index) => (
                    <li
                      key={`${index}-${note}`}
                      className="rounded-xl border border-white/5 bg-black/20 p-4 text-sm leading-7 text-white/70"
                    >
                      <span className="mr-2 font-black text-[#D4AF37]">
                        {index + 1}.
                      </span>

                      {note}
                    </li>
                  )
                )}
              </ol>
            ) : (
              <EmptyValue text="No learning notes were recorded." />
            )}
          </SectionCard>

          <SectionCard title="Metrics Before">
            <JsonViewer
              value={
                record.metricsBefore ||
                {}
              }
            />
          </SectionCard>

          <SectionCard title="Metrics After">
            <JsonViewer
              value={
                record.metricsAfter ||
                {}
              }
            />
          </SectionCard>

          <SectionCard title="Execution Data">
            <JsonViewer
              value={
                executionData || {}
              }
            />
          </SectionCard>

          <SectionCard title="Metadata">
            <JsonViewer
              value={record.metadata}
            />
          </SectionCard>

          <SectionCard title="Tags">
            {record.tags &&
            record.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {record.tags.map(
                  (tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/5 px-3 py-1 text-xs font-bold text-[#D4AF37]"
                    >
                      {tag}
                    </span>
                  )
                )}
              </div>
            ) : (
              <EmptyValue text="No tags were recorded." />
            )}
          </SectionCard>
        </div>
      </aside>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-[#12192a] p-5">
      <h3 className="text-sm font-black uppercase tracking-[0.22em] text-white/55">
        {title}
      </h3>

      <div className="mt-4">
        {children}
      </div>
    </section>
  );
}

function DetailCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#12192a] p-4">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
        {label}
      </p>

      <p className="mt-2 break-all text-sm font-semibold text-white/80">
        {value}
      </p>
    </div>
  );
}

function JsonViewer({
  value,
}: {
  value: unknown;
}) {
  const hasValue =
    value !== null &&
    value !== undefined &&
    (
      typeof value !== "object" ||
      Object.keys(
        value as Record<
          string,
          unknown
        >
      ).length > 0
    );

  if (!hasValue) {
    return (
      <EmptyValue text="No data was recorded." />
    );
  }

  return (
    <pre className="max-h-80 overflow-auto rounded-xl border border-white/5 bg-black/30 p-4 text-xs leading-6 text-white/65">
      {safeStringify(value)}
    </pre>
  );
}

function EmptyValue({
  text,
}: {
  text: string;
}) {
  return (
    <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-white/35">
      {text}
    </p>
  );
}

function OutcomeBadge({
  outcome,
}: {
  outcome: LearningOutcome;
}) {
  const classes =
    outcome === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : outcome === "neutral"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : "border-red-500/30 bg-red-500/10 text-red-300";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${classes}`}
    >
      {outcome}
    </span>
  );
}

function scoreClasses(
  score: number
) {
  if (score >= 80) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (score >= 50) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  return "border-red-500/30 bg-red-500/10 text-red-300";
}

function getRecordValue(
  value: Record<
    string,
    unknown
  >,
  key: string
): unknown {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  return value[key] ?? null;
}

function safeStringify(
  value: unknown
) {
  try {
    return JSON.stringify(
      value,
      null,
      2
    );
  } catch {
    return "Unable to display this data.";
  }
}

function formatStrategy(
  value: string
) {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map(
      (part) =>
        part.charAt(0)
          .toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function formatDate(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "No date";
  }

  return date.toLocaleString(
    "en",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}
