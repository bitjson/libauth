import type { WalletSet } from './engine.js';

/**
 * Generate a random, 4-byte, hex-encoded identifier. This is the recommended
 * method for creating a `setId` for a new {@link WalletSet}.
 */
export const getRandomSetId = () => crypto.randomUUID().split('-')[0];

/**
 * Import an HD Key into the provided wallet set.
 *
 * **Note, this method mutates the provided wallet set.** To avoid mutation,
 * `structuredClone` the wallet set before providing it to this function.
 *
 * @param walletSet - the wallet set into which the HD Key will be imported
 * @returns
 */
export const walletSetImportHdKey = (walletSet: WalletSet) => walletSet;
