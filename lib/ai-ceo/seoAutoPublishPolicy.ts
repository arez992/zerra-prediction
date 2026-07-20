import "server-only";

import type {
  SEOPageDraftItem,
} from "@/lib/ai-ceo/client";

import {
  evaluateSEOContentQuality,
} from "@/lib/ai-ceo/contentQuality";

import {
  evaluateDuplicateSimilarity,
  type SEODuplicateSimilarityResult,
} from "@/lib/ai-ceo/duplicateSimilarity";

import {
  validateInternalLinks,
  type InternalLinkValidationResult,
} from "@/lib/ai-ceo/internalLinkValidation";

import {
  validateSEOPageSchema,
  type SchemaValidationResult,
} from "@/lib/ai-ceo/schemaValidation";

export type SEOAutoPublishDecision =
  | "auto-publish"
  | "review"
  | "withhold";

export type SEOAutoPublishPolicyChecks = {
  qualityPassed:
    boolean;

  qualityReviewPassed:
    boolean;

  duplicatePassed:
    boolean;

  duplicateReviewRequired:
    boolean;

  internalLinksPassed:
    boolean;

  internalLinksReviewRequired:
    boolean;

  schemaPassed:
    boolean;

  schemaReviewRequired:
    boolean;

  factualDataPassed:
    boolean;
};

export type SEOAutoPublishPolicyResult = {
  decision:
    SEOAutoPublishDecision;

  approvedAutomatically:
    boolean;

  publishAutomatically:
    boolean;

  reason:
    string;

  checks:
    SEOAutoPublishPolicyChecks;

  metrics: {
    qualityScore:
      number;

    duplicateSimilarity:
      number;

    duplicateLevel:
      SEODuplicateSimilarityResult["level"];

    internalLinkScore:
      number;

    invalidInternalLinks:
      number;

    warningInternalLinks:
      number;

    schemaScore:
      number;

    schemaValid:
      boolean;

    factualDataAvailable:
      boolean;
  };

  validation: {
    duplicate:
      SEODuplicateSimilarityResult;

    internalLinks:
      InternalLinkValidationResult;

    schema:
      SchemaValidationResult;
  };
};

const AUTO_PUBLISH_QUALITY_SCORE =
  80;

const REVIEW_QUALITY_SCORE =
  65;

const AUTO_PUBLISH_LINK_SCORE =
  80;

const AUTO_PUBLISH_SCHEMA_SCORE =
  80;

function getFactualDataAvailable(
  draft:
    SEOPageDraftItem
): boolean {
  /*
   * Non-fixture SEO pages do not require
   * fixture-specific factual data.
   */
  if (
    !draft.fixtureId
  ) {
    return true;
  }

  /*
   * Fixture-based SEO pages may only
   * auto-publish when verified factual
   * fixture data was used during generation.
   */
  return (
    draft.generation
      ?.mode ===
      "openai_fixture" &&
    draft.generation
      ?.factualDataAvailable ===
      true
  );
}

function buildMetrics(
  input: {
    qualityScore:
      number;

    duplicate:
      SEODuplicateSimilarityResult;

    internalLinks:
      InternalLinkValidationResult;

    schema:
      SchemaValidationResult;

    factualDataAvailable:
      boolean;
  }
) {
  return {
    qualityScore:
      input
        .qualityScore,

    duplicateSimilarity:
      input
        .duplicate
        .highestSimilarity,

    duplicateLevel:
      input
        .duplicate
        .level,

    internalLinkScore:
      input
        .internalLinks
        .score,

    invalidInternalLinks:
      input
        .internalLinks
        .invalidCount,

    warningInternalLinks:
      input
        .internalLinks
        .warningCount,

    schemaScore:
      input
        .schema
        .score,

    schemaValid:
      input
        .schema
        .valid,

    factualDataAvailable:
      input
        .factualDataAvailable,
  };
}

export function evaluateSEOAutoPublishPolicy(
  draft:
    SEOPageDraftItem,

  allDrafts:
    SEOPageDraftItem[]
): SEOAutoPublishPolicyResult {
  const quality =
    evaluateSEOContentQuality(
      draft
    );

  const duplicate =
    evaluateDuplicateSimilarity(
      draft,
      allDrafts
    );

  const internalLinks =
    validateInternalLinks(
      draft
    );

  const schema =
    validateSEOPageSchema(
      draft
    );

  const factualDataAvailable =
    getFactualDataAvailable(
      draft
    );

  const qualityPassed =
    quality.score >=
    AUTO_PUBLISH_QUALITY_SCORE;

  const qualityReviewPassed =
    quality.score >=
    REVIEW_QUALITY_SCORE;

  const duplicatePassed =
    duplicate.level ===
    "Low";

  const duplicateReviewRequired =
    duplicate.level ===
    "Moderate";

  const internalLinksPassed =
    internalLinks
      .invalidCount ===
      0 &&
    internalLinks
      .score >=
      AUTO_PUBLISH_LINK_SCORE;

  const internalLinksReviewRequired =
    internalLinks
      .invalidCount ===
      0 &&
    (
      internalLinks
        .warningCount >
        0 ||
      internalLinks
        .score <
        AUTO_PUBLISH_LINK_SCORE
    );

  const schemaPassed =
    schema.valid ===
      true &&
    schema.score >=
      AUTO_PUBLISH_SCHEMA_SCORE;

  const schemaReviewRequired =
    !schemaPassed &&
    schema.score >=
      65;

  const factualDataPassed =
    factualDataAvailable;

  const checks:
    SEOAutoPublishPolicyChecks = {
    qualityPassed,

    qualityReviewPassed,

    duplicatePassed,

    duplicateReviewRequired,

    internalLinksPassed,

    internalLinksReviewRequired,

    schemaPassed,

    schemaReviewRequired,

    factualDataPassed,
  };

  const metrics =
    buildMetrics({
      qualityScore:
        quality.score,

      duplicate,

      internalLinks,

      schema,

      factualDataAvailable,
    });

  const validation = {
    duplicate,

    internalLinks,

    schema,
  };

  /*
   * HARD BLOCKER:
   * Fixture SEO pages require verified
   * factual fixture data.
   */
  if (
    !factualDataPassed
  ) {
    return {
      decision:
        "withhold",

      approvedAutomatically:
        false,

      publishAutomatically:
        false,

      reason:
        "SEO page withheld by AI CEO policy because required factual fixture data is unavailable.",

      checks,

      metrics,

      validation,
    };
  }

  /*
   * HARD BLOCKER:
   * Highly duplicated content must never
   * be published automatically.
   */
  if (
    duplicate.level ===
    "High"
  ) {
    return {
      decision:
        "withhold",

      approvedAutomatically:
        false,

      publishAutomatically:
        false,

      reason:
        `SEO page withheld by AI CEO policy because duplicate-content similarity is too high (${duplicate.highestSimilarity}%).`,

      checks,

      metrics,

      validation,
    };
  }

  /*
   * HARD BLOCKER:
   * Invalid internal links must be fixed
   * before publication.
   */
  if (
    internalLinks
      .invalidCount >
    0
  ) {
    return {
      decision:
        "withhold",

      approvedAutomatically:
        false,

      publishAutomatically:
        false,

      reason:
        `SEO page withheld by AI CEO policy because ${internalLinks.invalidCount} invalid internal link(s) were detected.`,

      checks,

      metrics,

      validation,
    };
  }

  /*
   * HARD BLOCKER:
   * Very low content quality should not
   * enter the publication workflow.
   */
  if (
    !qualityReviewPassed
  ) {
    return {
      decision:
        "withhold",

      approvedAutomatically:
        false,

      publishAutomatically:
        false,

      reason:
        `SEO page withheld by AI CEO policy because content quality score is ${quality.score}/100, below the minimum review threshold of ${REVIEW_QUALITY_SCORE}.`,

      checks,

      metrics,

      validation,
    };
  }

  /*
   * AUTO-PUBLISH
   *
   * All major validation systems must pass.
   */
  if (
    qualityPassed &&
    duplicatePassed &&
    internalLinksPassed &&
    schemaPassed &&
    factualDataPassed
  ) {
    return {
      decision:
        "auto-publish",

      approvedAutomatically:
        true,

      publishAutomatically:
        true,

      reason:
        `SEO page approved for autonomous publishing. Quality ${quality.score}/100, duplicate similarity ${duplicate.highestSimilarity}%, internal-link score ${internalLinks.score}/100, schema score ${schema.score}/100.`,

      checks,

      metrics,

      validation,
    };
  }

  /*
   * REVIEW
   *
   * No hard blocker exists, but one or
   * more checks are not strong enough
   * for autonomous publishing.
   */
  const reviewReasons:
    string[] = [];

  if (
    !qualityPassed
  ) {
    reviewReasons.push(
      `quality score ${quality.score}/100`
    );
  }

  if (
    duplicateReviewRequired
  ) {
    reviewReasons.push(
      `moderate duplicate similarity (${duplicate.highestSimilarity}%)`
    );
  }

  if (
    internalLinksReviewRequired
  ) {
    reviewReasons.push(
      `internal-link score ${internalLinks.score}/100`
    );
  }

  if (
    schemaReviewRequired ||
    !schemaPassed
  ) {
    reviewReasons.push(
      `schema score ${schema.score}/100`
    );
  }

  return {
    decision:
      "review",

    approvedAutomatically:
      false,

    publishAutomatically:
      false,

    reason:
      reviewReasons.length >
      0
        ? `SEO page requires review before publishing: ${reviewReasons.join(
            ", "
          )}.`
        : "SEO page requires human review before publishing.",

    checks,

    metrics,

    validation,
  };
}