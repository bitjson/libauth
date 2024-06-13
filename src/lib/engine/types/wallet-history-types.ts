import type { TimestampEntityKeyedValues } from '../../lib.js';

/**
 * A generic type used by the Libauth wallet engine to convey the history of
 * changes to a particular value. See {@link scanWalletHistory}
 * and {@link scanWalletUpdateProposalHistory}.
 */
export type ValueWithHistory<T> = {
  current: T;
  /**
   * The latest timestamp at which this value was modified; the `current` value
   * can be found at `history[lastModified]`.
   */
  lastModified: number;
  history: TimestampEntityKeyedValues<T>;
};

export type WalletWithHistory = 'TODO';

export type WalletUpdateProposalWithHistory = 'TODO';
