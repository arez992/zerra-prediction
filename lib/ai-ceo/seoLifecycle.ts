import "server-only";

import {
  FieldValue,
} from "firebase-admin/firestore";

import {
  adminDb,
} from "@/lib/firebaseAdmin";

import type {
  SEOAutoPublishPolicyResult,
} from "@/lib/ai-ceo/seoAutoPublishPolicy";

const DRAFT_COLLECTION =
  "seoPageDrafts";

const AUDIT_COLLECTION =
  "seoAuditLogs";

type SEOAutonomousLifecycleInput = {
  draftId:
    string;

  policy:
    SEOAutoPublishPolicyResult;

  performedBy?:
    string;
};

type SEOAutonomousLifecycleResult = {
  success:
    boolean;

  draftId:
    string;

  decision:
    SEOAutoPublishPolicyResult["decision"];

  status:
    string;

  approved:
    boolean;

  published:
    boolean;

  message:
    string;
};

function normalizeText(
  value:
    unknown
): string {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function validatePublishingFields(
  draft:
    Record<
      string,
      unknown
    >
): void {
  const required = {
    canonicalPath:
      normalizeText(
        draft.canonicalPath
      ),

    slug:
      normalizeText(
        draft.slug
      ),

    title:
      normalizeText(
        draft.title
      ),

    metaDescription:
      normalizeText(
        draft.metaDescription
      ),

    h1:
      normalizeText(
        draft.h1
      ),

    intro:
      normalizeText(
        draft.intro
      ),
  };

  const missing =
    Object.entries(
      required
    )
      .filter(
        (
          [
            ,
            value,
          ]
        ) =>
          !value
      )
      .map(
        (
          [
            key,
          ]
        ) =>
          key
      );

  if (
    missing.length >
    0
  ) {
    throw new Error(
      `SEO draft is missing required publishing fields: ${missing.join(
        ", "
      )}.`
    );
  }
}

export async function applySEOAutonomousLifecycle(
  input:
    SEOAutonomousLifecycleInput
): Promise<
  SEOAutonomousLifecycleResult
> {
  const draftId =
    normalizeText(
      input.draftId
    );

  if (
    !draftId
  ) {
    throw new Error(
      "SEO draft ID is required."
    );
  }

  const performedBy =
    normalizeText(
      input.performedBy
    ) ||
    "ai-ceo";

  const draftRef =
    adminDb
      .collection(
        DRAFT_COLLECTION
      )
      .doc(
        draftId
      );

  return adminDb
    .runTransaction(
      async (
        transaction
      ) => {
        const snapshot =
          await transaction
            .get(
              draftRef
            );

        if (
          !snapshot.exists
        ) {
          throw new Error(
            "SEO draft was not found."
          );
        }

        const draft =
          snapshot.data() ||
          {};

        const currentStatus =
          normalizeText(
            draft.status
          ) ||
          "draft";

        const canonicalPath =
          normalizeText(
            draft.canonicalPath
          );

        const slug =
          normalizeText(
            draft.slug
          );

        /*
         * Already published.
         *
         * Keep the operation idempotent.
         */
        if (
          currentStatus ===
          "published"
        ) {
          return {
            success:
              true,

            draftId,

            decision:
              input.policy
                .decision,

            status:
              "published",

            approved:
              true,

            published:
              true,

            message:
              "SEO page is already published.",
          };
        }

        /*
         * WITHHOLD
         *
         * The draft remains stored for audit
         * and future inspection, but it is not
         * approved or published.
         */
        if (
          input.policy
            .decision ===
          "withhold"
        ) {
          transaction.update(
            draftRef,
            {
              status:
                "withheld",

              updatedAt:
                FieldValue
                  .serverTimestamp(),

              publicationAutomation: {
                aiCEOAutonomous:
                  true,

                decision:
                  "withhold",

                automaticallyApproved:
                  false,

                automaticallyPublished:
                  false,

                reason:
                  input.policy
                    .reason,

                metrics:
                  input.policy
                    .metrics,

                checks:
                  input.policy
                    .checks,

                evaluatedAt:
                  FieldValue
                    .serverTimestamp(),
              },

              guardrails: {
                ...(
                  draft.guardrails ||
                  {}
                ),

                peopleFirstContent:
                  true,

                uniqueHelpfulContent:
                  true,

                duplicateChecked:
                  true,

                humanApprovalRequired:
                  true,

                autoPublishDisabled:
                  true,
              },
            }
          );

          const auditRef =
            adminDb
              .collection(
                AUDIT_COLLECTION
              )
              .doc();

          transaction.set(
            auditRef,
            {
              action:
                "ai-ceo-seo-withheld",

              draftId,

              slug:
                slug ||
                null,

              canonicalPath:
                canonicalPath ||
                null,

              previousStatus:
                currentStatus,

              newStatus:
                "withheld",

              performedBy,

              policy:
                input.policy,

              reason:
                input.policy
                  .reason,

              createdAt:
                FieldValue
                  .serverTimestamp(),
            }
          );

          return {
            success:
              true,

            draftId,

            decision:
              "withhold",

            status:
              "withheld",

            approved:
              false,

            published:
              false,

            message:
              input.policy
                .reason,
          };
        }

        /*
         * REVIEW
         *
         * Preserve the draft for manual
         * review. Do not fake a completed
         * human checklist.
         */
        if (
          input.policy
            .decision ===
          "review"
        ) {
          transaction.update(
            draftRef,
            {
              status:
                "review",

              updatedAt:
                FieldValue
                  .serverTimestamp(),

              publicationAutomation: {
                aiCEOAutonomous:
                  true,

                decision:
                  "review",

                automaticallyApproved:
                  false,

                automaticallyPublished:
                  false,

                requiresHumanReview:
                  true,

                reason:
                  input.policy
                    .reason,

                metrics:
                  input.policy
                    .metrics,

                checks:
                  input.policy
                    .checks,

                evaluatedAt:
                  FieldValue
                    .serverTimestamp(),
              },

              guardrails: {
                ...(
                  draft.guardrails ||
                  {}
                ),

                peopleFirstContent:
                  true,

                uniqueHelpfulContent:
                  true,

                duplicateChecked:
                  true,

                humanApprovalRequired:
                  true,

                autoPublishDisabled:
                  true,
              },
            }
          );

          const auditRef =
            adminDb
              .collection(
                AUDIT_COLLECTION
              )
              .doc();

          transaction.set(
            auditRef,
            {
              action:
                "ai-ceo-seo-review-required",

              draftId,

              slug:
                slug ||
                null,

              canonicalPath:
                canonicalPath ||
                null,

              previousStatus:
                currentStatus,

              newStatus:
                "review",

              performedBy,

              policy:
                input.policy,

              reason:
                input.policy
                  .reason,

              createdAt:
                FieldValue
                  .serverTimestamp(),
            }
          );

          return {
            success:
              true,

            draftId,

            decision:
              "review",

            status:
              "review",

            approved:
              false,

            published:
              false,

            message:
              input.policy
                .reason,
          };
        }

        /*
         * AUTO-PUBLISH
         *
         * This path is only reachable after
         * the autonomous SEO policy passes all
         * required validation gates.
         */
        validatePublishingFields(
          draft
        );

        transaction.update(
          draftRef,
          {
            status:
              "published",

            approvedAt:
              FieldValue
                .serverTimestamp(),

            approvedBy:
              performedBy,

            publishedAt:
              FieldValue
                .serverTimestamp(),

            publishedBy:
              performedBy,

            updatedAt:
              FieldValue
                .serverTimestamp(),

            publicationAutomation: {
              aiCEOAutonomous:
                true,

              decision:
                "auto-publish",

              automaticallyApproved:
                true,

              automaticallyPublished:
                true,

              reason:
                input.policy
                  .reason,

              metrics:
                input.policy
                  .metrics,

              checks:
                input.policy
                  .checks,

              evaluatedAt:
                FieldValue
                  .serverTimestamp(),
            },

            /*
             * Autonomous publishing is allowed
             * only because the policy already
             * passed the quality and safety gates.
             */
            guardrails: {
              ...(
                draft.guardrails ||
                {}
              ),

              peopleFirstContent:
                true,

              uniqueHelpfulContent:
                true,

              duplicateChecked:
                true,

              humanApprovalRequired:
                false,

              autoPublishDisabled:
                false,
            },

            /*
             * Do not claim that a human completed
             * the editorial checklist.
             */
            "humanReview.completed":
              false,

            "humanReview.reviewedBy":
              null,

            "humanReview.reviewedAt":
              null,

            "humanReview.autonomousApproval":
              true,

            "humanReview.autonomousApprovalBy":
              performedBy,

            "humanReview.autonomousApprovalAt":
              FieldValue
                .serverTimestamp(),
          }
        );

        const approvalAuditRef =
          adminDb
            .collection(
              AUDIT_COLLECTION
            )
            .doc();

        const publishAuditRef =
          adminDb
            .collection(
              AUDIT_COLLECTION
            )
            .doc();

        transaction.set(
          approvalAuditRef,
          {
            action:
              "ai-ceo-seo-auto-approve",

            draftId,

            slug,

            canonicalPath,

            previousStatus:
              currentStatus,

            newStatus:
              "approved",

            performedBy,

            policy:
              input.policy,

            reason:
              input.policy
                .reason,

            createdAt:
              FieldValue
                .serverTimestamp(),
          }
        );

        transaction.set(
          publishAuditRef,
          {
            action:
              "ai-ceo-seo-auto-publish",

            draftId,

            slug,

            canonicalPath,

            previousStatus:
              "approved",

            newStatus:
              "published",

            performedBy,

            policy:
              input.policy,

            reason:
              input.policy
                .reason,

            createdAt:
              FieldValue
                .serverTimestamp(),
          }
        );

        return {
          success:
            true,

          draftId,

          decision:
            "auto-publish",

          status:
            "published",

          approved:
            true,

          published:
            true,

          message:
            "SEO page was automatically approved and published by AI CEO.",
        };
      }
    );
}