/**
 * Durability — the replacement for `scorer.ts`'s hotness score.
 *
 * The old score was `engagement * 0.7 + recency * 0.3`, which is a popularity
 * measure, and a broken one: `engagementScore` hands every RSS, blog, YouTube,
 * GNews and LinkedIn item a flat 20, so authoritative sources could not
 * differentiate at all and Reddit/HN vote counts decided the ranking.
 *
 * Hacker News ranks `upvotes^0.8 / (age_hours + 2)^1.8`. The time exponent
 * deliberately exceeds the vote exponent so that *nothing* survives — that curve
 * is tuned for a front page that churns hourly.
 *
 * A twice-weekly digest for an architect wants the opposite. Here recency is not
 * a term at all (only a tiebreaker), and a fast social spike with no paper,
 * repo, or lab-blog behind it is *penalised* rather than rewarded — that shape
 * is the signature of hype, not of a mechanism worth learning.
 */

export interface DurabilityInput {
  /** 0-1, LLM-judged: does the source explain *why* it works, or only *what* it is? */
  mechanismDensity: number;
  /** Is there a concrete figure — "2.6x", "85-95%", "$0.03/1M tok"? */
  hasNumber: boolean;
  /** 0-1, see `authorityForPlatform`. */
  sourceAuthority: number;
  /** Count of distinct independent sources covering the same mechanism. */
  corroboratingSources: number;
  /** 0-1: how unlike everything already in the corpus this is. */
  novelty: number;
  /** Engagement points per hour since publication. Optional. */
  socialVelocity?: number;
  /** Does a paper, repo, or official lab blog back this up? */
  hasDurableAnchor: boolean;
}

// Weights sum to 100 before the penalty is applied.
const W_MECHANISM = 34;   // the single most important axis — it *is* the product
const W_AUTHORITY = 22;
const W_NOVELTY = 18;
const W_CORROBORATION = 16;
const W_NUMBER = 10;

/** Corroboration saturates fast: the 2nd independent source matters far more than the 6th. */
const CORROBORATION_SATURATION = 6;

/** Above this many engagement points/hour an unanchored item looks like a hype spike. */
const SPIKE_VELOCITY_THRESHOLD = 40;
const MAX_SPIKE_PENALTY = 30;

/**
 * How much a platform's word is worth on its own.
 * Primary research and first-party lab writing outrank commentary about them.
 */
export function authorityForPlatform(platform: string): number {
  switch (platform) {
    case "arXiv":
      return 1.0;
    case "Anthropic":
    case "OpenAI":
    case "Google":
    case "Meta":
    case "NVIDIA":
    case "Microsoft":
      return 1.0; // first-party engineering blogs
    case "GitHub":
    case "Hugging Face":
      return 0.8;
    case "Blog":
      return 0.6;
    case "Hacker News":
      return 0.45; // aggregator: good at surfacing, not a primary source
    case "TechCrunch":
    case "The Verge":
    case "Ars Technica":
    case "VentureBeat":
      return 0.4;
    case "Reddit":
    case "X":
    case "Twitter":
    case "LinkedIn":
    case "GNews":
      return 0.2; // corroboration only — never originates a concept
    default:
      return 0.35;
  }
}

/**
 * Refind's "timelessness" signal, inverted from a spike detector.
 *
 * A burst of social engagement with nothing durable behind it is the clearest
 * available hype marker. When a paper or repo *does* anchor the claim, velocity
 * is not held against it — real releases spike too.
 */
export function spikeAndDiePenalty(
  socialVelocity: number | undefined,
  hasDurableAnchor: boolean
): number {
  if (hasDurableAnchor) return 0;
  if (!socialVelocity || socialVelocity <= SPIKE_VELOCITY_THRESHOLD) return 0;

  const excess = socialVelocity - SPIKE_VELOCITY_THRESHOLD;
  // Log-scaled so a 10x spike is not 10x the penalty.
  const scaled = Math.log(1 + excess) / Math.log(1 + SPIKE_VELOCITY_THRESHOLD * 10);
  return Math.min(MAX_SPIKE_PENALTY, scaled * MAX_SPIKE_PENALTY);
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Final score, 0-100. Recency is deliberately absent — see `tiebreak`. */
export function durabilityScore(input: DurabilityInput): number {
  const corroboration = clamp01(
    Math.log(1 + Math.max(0, input.corroboratingSources)) /
      Math.log(1 + CORROBORATION_SATURATION)
  );

  const raw =
    clamp01(input.mechanismDensity) * W_MECHANISM +
    clamp01(input.sourceAuthority) * W_AUTHORITY +
    clamp01(input.novelty) * W_NOVELTY +
    corroboration * W_CORROBORATION +
    (input.hasNumber ? W_NUMBER : 0);

  const penalised = raw - spikeAndDiePenalty(input.socialVelocity, input.hasDurableAnchor);

  return Math.round(Math.max(0, Math.min(100, penalised)) * 1000) / 1000;
}

/**
 * Recency's only role. Used to break ties between concepts of equal durability
 * when choosing what to serve — never as a component of the score itself.
 */
export function tiebreak(a: { durability: number; firstSeenAt: Date | string },
                         b: { durability: number; firstSeenAt: Date | string }): number {
  if (a.durability !== b.durability) return b.durability - a.durability;
  return new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime();
}
