"use client";

import { useMemo, useState } from "react";

type PredictionStatus =
  | "draft"
  | "review"
  | "approved"
  | "published"
  | "rejected"
  | string;

type PredictionActionsProps = {
  predictionId: string;
  status: PredictionStatus;
  onChanged?: () => void | Promise<void>;
};

const REVIEW_ITEMS = [
  {
    key: "fixtureVerified",
    label: "Fixture identity and kickoff data verified",
  },
  {
    key: "teamsVerified",
    label: "Home and away teams verified",
  },
  {
    key: "probabilitiesReviewed",
    label: "Prediction probabilities reviewed",
  },
  {
    key: "riskReviewed",
    label: "Risk label and score reviewed",
  },
  {
    key: "publicContentReviewed",
    label: "Public prediction contains no premium disclosure",
  },
  {
    key: "vipContentReviewed",
    label: "VIP prediction content reviewed",
  },
  {
    key: "noMisleadingClaims",
    label: "No misleading or guaranteed claims",
  },
  {
    key: "finalApproval",
    label: "Final editorial approval",
  },
] as const;

type ReviewKey =
  (typeof REVIEW_ITEMS)[number]["key"];

type ReviewState = Record<
  ReviewKey,
  boolean
>;

const INITIAL_REVIEW =
  REVIEW_ITEMS.reduce(
    (result, item) => {
      result[item.key] = false;
      return result;
    },
    {} as ReviewState
  );

export default function PredictionActions({
  predictionId,
  status,
  onChanged,
}: PredictionActionsProps) {
  const [loadingAction, setLoadingAction] =
    useState<string | null>(null);
  const [message, setMessage] =
    useState("");
  const [error, setError] =
    useState("");
  const [showReview, setShowReview] =
    useState(false);
  const [review, setReview] =
    useState<ReviewState>({
      ...INITIAL_REVIEW,
    });

  const normalizedStatus =
    status.toLowerCase();

  const reviewComplete = useMemo(
    () =>
      REVIEW_ITEMS.every(
        (item) =>
          review[item.key] === true
      ),
    [review]
  );

  async function parseResponse(
    response: Response
  ) {
    const raw = await response.text();

    if (!raw) {
      throw new Error(
        `The server returned an empty response. HTTP ${response.status}`
      );
    }

    try {
      return JSON.parse(raw) as {
        success?: boolean;
        message?: string;
        error?: string;
      };
    } catch {
      throw new Error(
        `Invalid server response: ${raw.slice(
          0,
          200
        )}`
      );
    }
  }

  async function runLifecycleAction(
    action:
      | "approve"
      | "publish"
      | "reject"
      | "unpublish",
    body?: Record<string, unknown>
  ) {
    try {
      setLoadingAction(action);
      setError("");
      setMessage("");

      const response = await fetch(
        `/api/admin/predictions/${encodeURIComponent(
          predictionId
        )}/${action}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            body || {}
          ),
        }
      );

      const data =
        await parseResponse(response);

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            `${action} action failed.`
        );
      }

      setMessage(
        data.message ||
          "Action completed successfully."
      );

      if (action === "approve") {
        setShowReview(false);
        setReview({
          ...INITIAL_REVIEW,
        });
      }

      await onChanged?.();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Action failed."
      );
    } finally {
      setLoadingAction(null);
    }
  }

  async function runResultAction(
    action:
      | "correct"
      | "wrong"
      | "pending"
      | "delete"
  ) {
    if (
      action === "delete" &&
      !window.confirm(
        "Delete this prediction permanently?"
      )
    ) {
      return;
    }

    try {
      setLoadingAction(action);
      setError("");
      setMessage("");

      const response = await fetch(
        "/api/admin/predictions/update",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            predictionId,
            action,
          }),
        }
      );

      const data =
        await parseResponse(response);

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Result action failed."
        );
      }

      setMessage(
        data.message ||
          "Result updated successfully."
      );

      await onChanged?.();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Result action failed."
      );
    } finally {
      setLoadingAction(null);
    }
  }

  function handleReject() {
    const reason = window.prompt(
      "Enter the rejection reason:"
    );

    if (!reason?.trim()) {
      return;
    }

    void runLifecycleAction(
      "reject",
      {
        reason: reason.trim(),
      }
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(normalizedStatus === "draft" ||
          normalizedStatus === "review" ||
          normalizedStatus ===
            "rejected") && (
          <ActionButton
            label="Human Review"
            loading={false}
            disabled={
              loadingAction !== null
            }
            onClick={() =>
              setShowReview(
                (current) => !current
              )
            }
            variant="gold"
          />
        )}

        {normalizedStatus ===
          "approved" && (
          <ActionButton
            label="Publish"
            loading={
              loadingAction === "publish"
            }
            disabled={
              loadingAction !== null
            }
            onClick={() =>
              void runLifecycleAction(
                "publish"
              )
            }
            variant="green"
          />
        )}

        {normalizedStatus ===
          "published" && (
          <ActionButton
            label="Unpublish"
            loading={
              loadingAction ===
              "unpublish"
            }
            disabled={
              loadingAction !== null
            }
            onClick={() =>
              void runLifecycleAction(
                "unpublish"
              )
            }
            variant="amber"
          />
        )}

        {normalizedStatus !==
          "published" && (
          <ActionButton
            label="Reject"
            loading={
              loadingAction === "reject"
            }
            disabled={
              loadingAction !== null
            }
            onClick={handleReject}
            variant="red"
          />
        )}

        <ActionButton
          label="Correct"
          loading={
            loadingAction === "correct"
          }
          disabled={
            loadingAction !== null
          }
          onClick={() =>
            void runResultAction(
              "correct"
            )
          }
          variant="green"
        />

        <ActionButton
          label="Wrong"
          loading={
            loadingAction === "wrong"
          }
          disabled={
            loadingAction !== null
          }
          onClick={() =>
            void runResultAction(
              "wrong"
            )
          }
          variant="red"
        />

        <ActionButton
          label="Pending"
          loading={
            loadingAction === "pending"
          }
          disabled={
            loadingAction !== null
          }
          onClick={() =>
            void runResultAction(
              "pending"
            )
          }
          variant="amber"
        />

        <ActionButton
          label="Delete"
          loading={
            loadingAction === "delete"
          }
          disabled={
            loadingAction !== null
          }
          onClick={() =>
            void runResultAction(
              "delete"
            )
          }
          variant="outlineRed"
        />
      </div>

      {showReview && (
        <div className="mt-5 rounded-3xl border border-[#D4AF37]/25 bg-[#D4AF37]/5 p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#D4AF37]">
            Human Review Checklist
          </p>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {REVIEW_ITEMS.map((item) => (
              <label
                key={item.key}
                className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/65"
              >
                <input
                  type="checkbox"
                  checked={
                    review[item.key]
                  }
                  onChange={(event) =>
                    setReview(
                      (current) => ({
                        ...current,
                        [item.key]:
                          event.target
                            .checked,
                      })
                    )
                  }
                  className="mt-1 h-4 w-4 accent-[#D4AF37]"
                />

                <span>{item.label}</span>
              </label>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <ActionButton
              label="Approve Prediction"
              loading={
                loadingAction ===
                "approve"
              }
              disabled={
                loadingAction !== null ||
                !reviewComplete
              }
              onClick={() =>
                void runLifecycleAction(
                  "approve",
                  {
                    humanReview: review,
                  }
                )
              }
              variant="green"
            />

            {!reviewComplete && (
              <p className="text-xs text-amber-200/70">
                Confirm every checklist
                item to unlock approval.
              </p>
            )}
          </div>
        </div>
      )}

      {message && (
        <div className="mt-4 rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-200">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}

function ActionButton({
  label,
  loading,
  disabled,
  onClick,
  variant,
}: {
  label: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  variant:
    | "gold"
    | "green"
    | "red"
    | "amber"
    | "outlineRed";
}) {
  const styles = {
    gold:
      "bg-[#D4AF37] text-black",
    green:
      "bg-green-600 text-white",
    red: "bg-red-600 text-white",
    amber:
      "bg-amber-400 text-black",
    outlineRed:
      "border border-red-500/40 text-red-300",
  }[variant];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 ${styles}`}
    >
      {loading
        ? "Working..."
        : label}
    </button>
  );
}