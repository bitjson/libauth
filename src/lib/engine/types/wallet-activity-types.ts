import type {
  Extensions,
  TimestampEntityKeyedValues,
  TransactionProposal,
  Wallet,
  WalletAddressData,
} from '../../lib.js';

/**
 * An atomic update to a {@link Wallet}, provided as a set of differences
 * between the current wallet and the updated wallet.
 *
 * For each indexed property (e.g. `addresses[lockingScriptId][addressIndex]`,
 * `entities[entityId]`, `tracked.identities[authbase]`,
 * `registry.identities[authbase]`, etc.) patches exclude unchanged properties.
 * To modify a property, include the index to modify and the new value; to
 * delete a property, include the index with a value of `undefined`.
 *
 * Wallet patches may never modify {@link Wallet.activity},
 * {@link Wallet.entityId}, or {@link Wallet.secret}, as these items record
 * wallet state from the view of a particular entity. Additionally,
 * {@link Wallet.template} may not be modified without creating a new clone of
 * the wallet (e.g. via the invitation process).
 *
 * Entities are expected to perform other validations before accepting wallet
 * patches: changes to {@link Wallet.name} and
 * {@link WalletEntityInformation.name} must often be verified with the end
 * user, and both {@link WalletAddressData.data} and
 * {@link WalletAddressData.lockingBytecode} may not be modified once created.
 */
export type WalletPatch = Partial<
  Omit<Wallet, 'activity' | 'entityId' | 'secret' | 'template'>
>;

/**
 * A `bitauth` extension for {@link WalletUpdate}s,
 * {@link WalletUpdateProposal}s, and {@link WalletUpdateProposalRevision}s.
 */
export type EngineExtensionBitauth = {
  /**
   * a hex-encoded bitauth signature by the authoring entity covering
   * this object, e.g. {@link WalletUpdate}, {@link WalletUpdateProposal},
   * {@link WalletUpdateProposalRevision}, etc.
   *
   * The preimage is created by excluding the `signature` identifier and value
   * from `extensions.bitauth` and encoding the remaining object as a utf8 JSON
   * string without formatting whitespace. (For determinism, wallet messages
   * should have lexicographically sorted keys before being used in signature
   * preimages or transmitted between entities.)
   *
   * The `HASH160` algorithm is recommended (SHA256 + RIPEMD160), and signature
   * validation must allow for the off-chain Bitauth input.
   *
   * Signatures are only considered valid if the signed revision is received
   * before a new identity migration is heard; if a migration is pending
   * confirmation, signatures must use the unconfirmed authhead. If a competing
   * authhead is known (double-spend attempt), validation must fail until a
   * confirmation is heard. (It's also recommended that a warning be displayed
   * in user interfaces.)
   *
   * If {@link WalletEntityInformation.identity} is not set, the entity's
   * identity output is assumed to be the P2PKH output constructed with `m/0` of
   * the entity's `HdKey`; if `identity` is not set and the entity has no
   * `HdKey`, fail validation.
   */
  signature?: string;

  /**
   * A mapping of authbases to the fully-resolved authchain for each identity.
   *
   * Identities are defined and referenced by their `authbase`, the TXID of
   * the first transaction in the identity's **authchain**. An authchain
   * (A.K.A. zeroth-descendant transaction chain) is a chain of transactions
   * where the output at index `0` for each transaction is spent by the
   * following transaction. In the context of authchains, the transaction
   * output at index `0` is known as the transaction's **identity output**.
   * Because all transactions must have at least one output, every valid
   * transaction has a single identity output.
   *
   * The first transaction in an authchain is referred to as the
   * **authbase transaction**; authbase transactions have no distinguishing
   * features, and any valid transaction can serve as an authbase transaction.
   * The final transaction in an authchain is referred to as the
   * **authhead transaction**. By definition, the identity output of the
   * authhead transaction is unspent. If the latest identity output is
   * provably-unspendable (i.e. an `OP_RETURN` "data-carrier" output), the
   * identity has been "burned" and can be safely forgotten or archived
   * by clients.
   */
  authchains?: { [authbase: string]: { [transactionIndex: number]: string } };
};

/**
 * A revision for a particular {@link WalletUpdateProposal}, attributed to a
 * particular authoring entity (via the entity ID), with an optional
 * revision `comment`.
 */
export type WalletUpdateProposalRevision = {
  /**
   * A plain-text comment indicating the purpose or context of this revision.
   *
   * Comments have no length limit, but in user interfaces with limited
   * space, they should be hidden beyond the first newline character or `140`
   * characters until revealed by the user (e.g. by hiding the remaining
   * description until the user activates a "show more" link).
   */
  comment?: string;
  /**
   * The `${timestamp}_${entityId}` identifier of the parent revision(s) upon
   * which this revision was based. If a revision has multiple parents, the
   * author represents the revision as being a merge of those parent revisions.
   * If `undefined`, the author represents this revision as being the initial
   * revision of this wallet update proposal.
   */
  parents?: string[];
  /**
   * The {@link WalletPatch} following this revision.
   */
  patch?: WalletPatch;
  /**
   * The {@link TransactionProposal} following this revision.
   */
  proposal: TransactionProposal;
  /**
   * A mapping of {@link WalletUpdateProposalRevision} extension identifiers to
   * extension definitions. {@link Extensions} may be widely standardized
   * or application-specific.
   *
   * The following extensions are currently standard:
   *
   * - `bitauth`: an {@link EngineExtensionBitauth}.
   */
  extensions?: Extensions;
};

/**
 * A proposal for a new {@link WalletUpdate}.
 */
export type WalletUpdateProposal = {
  /**
   * A timestamp and entity-keyed map of each known
   * {@link WalletUpdateProposalRevision} to this proposal.
   *
   * Revisions are indexed by an identifier containing their creation
   * timestamp and the entity ID of the wallet entity which created the update,
   * separated by an underscore (`_`), e.g. `1681560000000_cosigner_2`.
   *
   * Identifiers should typically be set using `Date.now()` at the time the
   * revision is created. This approach prevents collisions so long as entities
   * produce only one revision per proposal at any particular timestamp.
   */
  revisions: TimestampEntityKeyedValues<WalletUpdateProposalRevision>;
  /**
   * A mapping of `WalletUpdateProposal` extension identifiers to extension
   * definitions. {@link Extensions} may be widely standardized
   * or application-specific.
   *
   * The following extensions are currently standard:
   *
   * - `bitauth`: an {@link EngineExtensionBitauth}.
   */
  extensions?: Extensions;
};

/**
 * An object that documents modifications to a wallet's shared data and/or new
 * network activity involving the wallet. If the update was created from a
 * {@link WalletUpdateProposal}, the final `proposal` is also retained.
 *
 * Wallet updates allow all wallet entities to keep their shared view of the
 * wallet in sync, and they also provide a useful, atomic data structure for
 * debugging and auditing wallet activity.
 *
 * Wallet updates are indexed by an identifier containing their creation
 * timestamp and the entity ID of the wallet entity which created the update,
 * separated by an underscore (`_`), e.g. `1681560000000_cosigner_2`.
 *
 * Updates are generally idempotent: they have the same effect regardless of the
 * order in which they are applied to the wallet state. However, if two updates
 * make changes to the same wallet property, the second update will overwrite
 * the first. To protect against divergence of shared state in these cases,
 * update application order is deterministic: a wallet's current shared state
 * can always be determined by iteratively applying all known wallet updates in
 * lexicographical identifier order.
 *
 * For example, while update  `1681560000000_cosigner_1` and
 * `1681560000000_cosigner_2` were produced at the same timestamp,
 * lexicographical application order requires that  `1681560000000_cosigner_1`
 * be applied first.
 *
 * Wallet entities implicitly trust each other to preserve the secrecy of shared
 * wallet data and limit creation of excessive wallet updates; however, wallet
 * entities must review and/or verify changes to important shared data
 * properties like {@link Wallet.name}, {@link Wallet.entities}' names,
 * and {@link Wallet.registry}.
 */
export type WalletUpdate = {
  /**
   * The finalized {@link WalletPatch} to be applied by this update.
   */
  patch: WalletPatch;
  /**
   * The source {@link WalletUpdateProposal} that led to the creation of this
   * update, if one exists. This is useful for debugging, auditing, and user
   * interface purposes, e.g. displaying a timeline of each entity's revisions
   * and accompanying revision `comment`s.
   */
  source?: WalletUpdateProposal;
  /**
   * A mapping of `WalletUpdate` extension identifiers to extension definitions.
   * {@link Extensions} may be widely standardized or application-specific.
   *
   * The following extensions are currently standard:
   *
   * - `bitauth`: an {@link EngineExtensionBitauth}.
   */
  extensions?: Extensions;
};

/**
 * A data store of {@link Wallet} activity as seen by a particular entity; a
 * unified JSON schema designed to pass both wallet updates and wallet update
 * proposals between wallet entities.
 */
export type WalletActivity = {
  /**
   * This field indicates that this JSON object is a Libauth
   * {@link WalletActivity} object, as well as the schema version in use.
   *
   * This version of libauth expects a canonical value of:
   * `https://libauth.org/schemas/v2/wallet-activity.schema.json`
   */
  $schema: string;
  /**
   * A timestamp and entity-keyed map of every known
   * {@link WalletUpdateProposal} currently active in this wallet.
   *
   * Proposals are indexed by an identifier containing their creation
   * timestamp and the entity ID of the wallet entity which initially created
   * the proposal, separated by an underscore (`_`),
   * e.g. `1681560000000_cosigner_2`. Within each proposal, a the map of
   * `revisions` should also contain an initial revision with a matching
   * identifier.
   */
  proposals: TimestampEntityKeyedValues<WalletUpdateProposal>;
  /**
   * If provided, this `WalletActivity` excludes updates prior to and including
   * the indicated `pruned.updateId`. To validate that these pruned updates have
   * already been applied to a {@link Wallet}, the canonical hash of all prior
   * updates is provided in `pruned.hash`.
   */
  pruned?: {
    /**
     * The latest identifier of the wallet updates pruned from
     * this {@link WalletActivity}. If unknown to the receiving entity, this
     * `WalletActivity` cannot be applied until all pruned updates have
     * been received and applied.
     *
     * The identified update and all prior updates are excluded from this
     * {@link WalletActivity.updates},
     */
    updateId: string;
    /**
     * The canonical hash of all activity pruned from this
     * {@link WalletActivity}; this allows wallet participants to verify that
     * they have previously applied all wallet updates upon which the included
     * wallet updates depend.
     *
     * To compute the pruned hash, encode all pruned activity in a
     * lexicographically sorted (by utf8 codepoint) JSON object, omitting any
     * formatting whitespace, then take the HASH160 (SHA256 + RIPEMD160) hash of
     * the octets of the utf8 representation.
     */
    hash: string;
  };
  /**
   * A timestamp and entity-keyed map of every known {@link WalletUpdate}
   * for this wallet. If `pruned` is defined, all updates prior to and including
   * `pruned.updateId` are omitted, but the receiving entity must verify
   * `pruned.hash` to ensure that all pruned activity has previously
   * been applied.
   *
   * Updates are indexed by an identifier containing their creation timestamp
   * and the entity ID of the wallet entity which created the update, separated
   * by an underscore (`_`), e.g. `1681560000000_cosigner_2`.
   */
  updates: TimestampEntityKeyedValues<WalletUpdate>;
};
