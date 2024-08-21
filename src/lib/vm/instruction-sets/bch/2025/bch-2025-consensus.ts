import { ConsensusBch2023 } from '../2023/bch-2023-consensus.js';

import type { AuthenticationProgramStateBch2025 } from './bch-2025-types.js';

/**
 * Consensus setting overrides for the `BCH_2025_05` instruction set.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ConsensusBch2025Overrides = {
  baseInstructionCost: 100,
  bytesPerCodeSeparatorStandard: 65,
  hashDigestIterationCostConsensus: 64,
  hashDigestIterationCostStandard: 192,
  hashDigestIterationsPerByteNonstandard: 3.5,
  hashDigestIterationsPerByteStandard: 0.5,
  maximumControlStackDepth: 100,
  /**
   * A.K.A. `MAX_SCRIPT_ELEMENT_SIZE`
   */
  maximumStackItemLength: 10_000,
  maximumVmNumberLength: 10_000,
  signatureCheckCost: 26000,
};

const base = 2n;
const maxLength = BigInt(ConsensusBch2025Overrides.maximumVmNumberLength);
const bytes = 8n;
const signed = 2n;
const maxVmNumber = base ** (maxLength * bytes) - 1n / signed;

export const bigIntRange = { maxVmNumber, minVmNumber: -maxVmNumber };

/**
 * Consensus settings for the `BCH_2025_05` instruction set.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ConsensusBch2025 = {
  ...ConsensusBch2023,
  ...ConsensusBch2025Overrides,
};

export const measureOperationCost = <
  Metrics extends Pick<
    AuthenticationProgramStateBch2025['metrics'],
    | 'arithmeticCost'
    | 'evaluatedInstructionCount'
    | 'hashDigestIterations'
    | 'signatureCheckCount'
    | 'stackPushedBytes'
  >,
>(
  metrics: Metrics,
  {
    baseInstructionCost = ConsensusBch2025.baseInstructionCost,
    hashDigestIterationCost = ConsensusBch2025.hashDigestIterationCostStandard,
    signatureCheckCost = ConsensusBch2025.signatureCheckCost,
  } = {},
) =>
  metrics.evaluatedInstructionCount * baseInstructionCost +
  metrics.signatureCheckCount * signatureCheckCost +
  metrics.hashDigestIterations * hashDigestIterationCost +
  metrics.arithmeticCost +
  metrics.stackPushedBytes;
