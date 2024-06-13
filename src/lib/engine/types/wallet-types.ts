import type {
  CompilationData,
  Extensions,
  MetadataRegistry,
  Output,
  WalletActivity,
  WalletTemplate,
  WalletUpdate,
} from '../../lib.js';

/**
 * A data field keyed by timestamp and entity ID to preserve a history of the
 * data field's revisions. For example, to insert a new value:
 * ```ts
 * const result = { ...previousValue, [`${Date.now()}_${entityId}]: newValue };
 * ```
 */
export type TimestampEntityKeyedValues<T> = {
  [timestampEntityId: string]: T;
};

/**
 * A name and version to be associated with a
 * {@link WalletEntityInformation.userAgent} field.
 */
export type UserAgentField = {
  /**
   * The name to associate with this user agent field, e.g. `Ubuntu`,
   * `Libauth`, etc.
   */
  name: string;
  /**
   * The version string of the hardware or software indicated by `name`, e.g.
   * `22.04.1`, `2.1.0`, etc.
   */
  version: string;
};

/**
 * A set of information describing a particular {@link Wallet} entity, shared
 * between all entities in that wallet.
 *
 * Each entity's information is initialized in the wallet invitation process and
 * may thereafter be updated by {@link WalletUpdate}s.
 *
 * Some example configurations are included below:
 *
 * ```js
 * {
 *   name: 'Alice’s Laptop',
 *   userAgent: {
 *     app: { name: 'ACME Wallet', version: '1.0.0' },
 *     device: { name: 'MacBook Pro', version: '16-inch, 2021' },
 *     engine: { name: 'Libauth', version: '2.1.0' },
 *     os: { name: 'macOS', version: '13.2.1' },
 *     type: 'desktop',
 *   },
 * };
 *```
 *
 * ```js
 * {
 *   name: 'Bob’s Phone',
 *   userAgent: {
 *     app: { name: 'ACME Wallet', version: '1.0.0' },
 *     device: { name: 'iPhone', version: '14 Pro (MQ2E3LL/A)' },
 *     engine: { name: 'Libauth', version: '2.0.0-alpha.10' },
 *     os: { name: 'iOS', version: '16.0.2 (20A380)' },
 *     type: 'mobile',
 *   },
 *   extensions: {
 *     backupVerified: 1678143270000,
 *   },
 * };
 *```
 *
 * ```js
 * {
 *   name: 'Example.com Web Wallet',
 *   userAgent: {
 *     app: { name: 'Example.com', version: '1.1.0' },
 *     device: { name: 'Brave', version: 'v112.0.0.0' },
 *     engine: { name: 'Libauth', version: '2.0.1' },
 *     os: { name: 'Macintosh', version: 'unknown' },
 *     type: 'desktop',
 *   },
 * };
 *```
 *
 * ```js
 * {
 *   name: 'Charlie',
 *   description: 'Payout Operations Team Lead',
 *   userAgent: {
 *     engine: { name: 'Libauth', version: '2.0' },
 *     type: 'person',
 *   },
 * };
 *```
 *
 * ```js
 * {
 *   name: 'ACME Security Service',
 *   description: 'A transaction authorization service provided by ACME Inc.',
 *   userAgent: {
 *     engine: { name: 'Libauth', version: '2.1' },
 *     type: 'organization',
 *   },
 * };
 *```
 */
export type WalletEntityInformation = {
  /**
   * A name for this entity. This may be used by other entities to improve user
   * experiences and error messages.
   *
   * While implementations may always choose to maintain a separate alias for
   * each entity, the shared `name` property enables better user experiences by
   * allowing entities to suggest updates to all other entities.
   *
   * **It is security critical that implementations using this field verify all
   * changes with the user.** A malicious entity participating in a shared
   * wallet could misleadingly rename itself such that the end user mistakes
   * its identity, assigning excessive trust to the entity's activity.
   */
  name?: string;
  /**
   * A description for this entity. This may be used by other entities to
   * improve user experiences and error messages.
   *
   * While implementations may always choose to maintain a separate
   * description/notes for each entity, the entity's claimed `name` property
   * enables better user experiences by allowing entities to suggest a
   * description to all other entities.
   *
   * While not considered security critical, implementations using this field
   * should inform users of all changes. See
   * {@link WalletEntityInformation.name} for details.
   */
  description?: string;
  /**
   * The authbase of this entity's Bitauth identity. If provided, this identity
   * can be used for authentication of inter-entity communications and to
   * resolve additional identity information (an icon/avatar, web address,
   * social media URIs, etc.) from Bitcoin Cash Metadata Registries.
   */
  identity?: string;
  /**
   * The hardware and software stack being used by this entity to participate in
   * the wallet.
   *
   * It is recommended that single-device entities share as much user agent
   * information as possible; this allows other entities to tailor user
   * experiences, by e.g. providing app-specific guidance, notifications about
   * pending security updates, and security assessments about a wallet's overall
   * exposure to supply-chain vulnerabilities from various sources.
   *
   * Hypothetically, it's possible that hiding single-device user agent
   * information from less-trusted entities might prevent those entities from
   * exploiting active vulnerabilities in some portion of the user agent.
   * However in practice, few publicly-known vulnerabilities exist at any moment
   * in time, and a compromised entity is likely to attempt exploitation of any
   * vulnerability regardless of claimed user agent information. As such, the
   * negligible security value of hiding this information rarely outweighs the
   * user experience and security improvements made possible by sharing it.
   *
   * The recommendation to share all user agent information does not extend to
   * multi-device entities (`userAgent.type` of `person` or `organization`);
   * these entity types are used to represent an opaque set of user agents
   * controlled by the indicated person or organization. In these contexts,
   * user agent information could offer attackers valuable clues for planning
   * and successfully carrying out social engineering attacks, extortion, and
   * physical attacks on the individuals and organizations participating in a
   * wallet. Instead, user agent information for these multi-device entities
   * should only be shared within the separate, shared wallet created to
   * maintain the multi-device identity used in the higher-level wallet.
   *
   * For example, an "Operations Team Wallet" may consist of several `person`
   * entities which do not share user agent `app`/`device`/`os`, but each
   * `person` entity would be controlled by a separate wallet shared across that
   * individual's devices. Each of that person's devices should share all user
   * agent information with each other in the sub-wallet, but no
   * `app`/`device`/`os` information would be revealed in the team wallet.
   *
   * For multi-device entities, it is recommended that only `engine` be shared,
   * indicating the minor version of the most-capable engine used by any of the
   * entity's devices. For example, if the entity includes 4 devices, where 3
   * devices use Libauth versions `2.0.1`, `1.0.5`, and `2.1.2` respectively,
   * and the final device uses application-specific signing software, the
   * `engine` should be `{ name: 'Libauth', version: '2.1' }`.
   */
  userAgent: {
    /**
     * The general classification of this user agent, used to render icons or
     * otherwise offer context in user interfaces. This field offers a baseline
     * entity classification strategy without requiring implementations to
     * build-in lists of "known" `userAgent` values.
     *
     * Available settings, their recommended Unicode characters (for simple or
     * text-only user interfaces), and descriptions are provided below:
     *
     * - `desktop` (`💻`): A device that uses a desktop operating system, e.g. a
     * laptop or desktop workstation.
     * - `mobile` (`📱`): A device that uses a mobile/touch-oriented operating
     * system, e.g. a mobile phone or tablet.
     * - `offline` (`✉️`): An implement that is physically disconnected from the
     * internet and requires manual interaction to send or receive
     * proposals/signatures, e.g. an offline signing device, paper wallet, or
     * physical key storage device.
     * - `online` (`🌐`): An online device that does not closely match another
     * available value, e.g. a web server or service, an internet-connected TV
     * or household appliance, etc.
     * - `organization` (`👥`): A multi-device entity that is controlled by
     * multiple people, e.g. a company or department.
     * - `person` (`👤`): A multi-device entity that is controlled by a single
     * individual.
     * - `unknown` (`?`): The entity cannot determine or refuses to share a
     * user agent type.
     * - `vision` (`👓`): A head-worn wearable device with a vision-based
     * operating system that independently stores and signs with its own wallet
     * secrets (rather than behaving only as an interface to a more capable
     * host device).
     * - `watch` (`⌚`): A wrist-worn, wearable device that independently stores
     * and signs with its own wallet secrets (rather than behaving only as an
     * interface to a more capable host device).
     *
     * While all other `userAgent` fields are optional, this field is required:
     * it is almost always valuable for entities to share this basic information
     * with each other, so failure to share is assumed to be a software defect.
     * If the form factor is unknown or for some reason can't be shared, use
     * `unknown`. If a more appropriate value is not available, use `online`.
     */
    type:
      | 'desktop'
      | 'mobile'
      | 'offline'
      | 'online'
      | 'organization'
      | 'person'
      | 'unknown'
      | 'vision'
      | 'watch';
    /**
     * The manufacturer and model identifier of the device. It is recommended
     * that this information be provided for all single-device entities, see
     * {@link WalletEntityInformation.userAgent} for details.
     */
    device?: UserAgentField;
    /**
     * The device's operating system (e.g. `Ubuntu`) and version. It is
     * recommended that this information be provided for all single-device
     * entities, see {@link WalletEntityInformation.userAgent} for details.
     */
    os?: UserAgentField;
    /**
     * The application's wallet engine (e.g. `Libauth`) and version. It is
     * recommended that this information be provided for all entities, including
     * multi-device entities see {@link WalletEntityInformation.userAgent}
     * for details.
     */
    engine?: UserAgentField;
    /**
     * The user-facing application name (e.g. `ACME Wallet`) and version. It is
     * recommended that this information be provided for all single-device
     * entities, see {@link WalletEntityInformation.userAgent} for details.
     */
    app?: UserAgentField;
  };
  /**
   * A mapping of `WalletEntityInformation` extension identifiers to extension
   * definitions. {@link Extensions} may be widely standardized
   * or application-specific.
   *
   * The following extensions are currently recommended for all implementations:
   *
   * - `backupVerified`: a Unix timestamp in milliseconds (e.g. `Date.now()`)
   * indicating the time at which the entity most recently verified the
   * integrity of its backup solution (e.g. a paper backup). If `undefined`, the
   * entity may not have completed a backup, and other entities may want to
   * limit their exposure to accidental loss by waiting for some additional
   * confirmation before using the wallet.
   *
   * The following additional extensions are currently standard:
   *
   * - `agePublicKey`: a public key to be used in sending Age-encrypted messages
   * to this entity. If set for every entity, this extension enables end-to-end
   * encryption of all communication between entities (wallet updates and
   * transaction proposals) in a shared wallet. To continue functioning, any
   * watch-only wallets must also retain a copy of their entity's corresponding
   * private key.
   */
  extensions?: Extensions;
};

/**
 * A record of the payment request information shared by the requester with the
 * payer. For details, see BIP21, BIP70, BIP71, BIP72, BIP73, JSON Payment
 * Protocol Specification v1/v2, and CHIP-2023-05-PayPro.
 *
 * TODO: fields to store the payment request, signature for BIP70/JSON PayPro
 * TODO: PayPro: standardize merchant identity/key sharing via BCMRs
 * TODO: PayPro: standardize use of proposals for PayJoin
 * TODO: PayPro: standardize sharing denomination equiv. value/currency (enable gain/loss calc.)
 * TODO: PayPro: standardize sharing transaction categorization and itemized receipts (in-wallet analysis, product support/returns)
 */
export type EngineExtensionPaymentRequest = {
  /**
   * Payment request information communicated via BCH PayPro URI.
   */
  uri?: {
    /**
     * The category identifier of the requested token(s), hex-encoded in user
     * interface order.
     */
    c?: string;
    /**
     * The Unix timestamp at which this URI expires. For the purpose of
     * expiration, payments are considered to have occurred at the moment they
     * are heard over the public network (rather than the time at which they are
     * confirmed in a block).
     */
    e?: string;
    /**
     * The fungible token amount requested in category `c` tokens. The amount is
     * in terms of on-chain fungible token units, without respect for display
     * standards. E.g. for a category in which `100` fungible tokens are
     * considered to be `1.00 XAMPL`, `f=100` would be a request for
     * `1.00 XAMPL`.
     */
    f?: string;
    /**
     * A message that describes the transaction to the user.
     */
    m?: string;
    /**
     * The requested non-fungible token commitment of category `c`. The
     * commitment must be hex-encoded, e.g. `n=01` requests an NFT with
     * commitment `0x01`; `n` or `n=` requests an NFT with an empty commitment.
     */
    n?: string;
    /**
     * An HTTPS request URL. Following CHIP-2023-05-PayPro, the `https://` may
     * be omitted.
     */
    r?: string;
    /**
     * The requested number of satoshis, e.g. `"123456"` is `s=123456`, a
     * request for `0.00123456 BCH`. If `s` is not set, the minimum value for
     * the requested output (dust limit) is implied.
     */
    s?: string;
    /**
     * The requested BCH amount. As standardized by BIP21, this must be
     * specified in decimal coins, e.g. `1`, `1.00`, and `1.00000000` are all
     * equivalent (100,000,000 satoshis).
     *
     * Following CHIP-2023-05-PayPro, it is recommended that `s` be used rather
     * than `amount` where possible.
     */
    amount?: string;
    /**
     * The label shared with the request (as standardized by BIP21).
     *
     * @deprecated by CHIP-2023-05-PayPro. It is recommended that payment
     * address identities instead be shared via authenticated methods where
     * possible, e.g. via Bitcoin Cash Metadata Registries (BCMR).
     * Implementations that acknowledge `label`s must verify the label with the
     * user before displaying it in place of the address, and such
     * unauthenticated labels should generally not be displayed with the
     * certainty of trusted BCMR-provided content.
     */
    label?: string;
    /**
     * The message shared with the request (as standardized by BIP21).
     *
     * Following CHIP-2023-05-PayPro, it is recommended that `m` be used rather
     * than `message` where possible.
     */
    message?: string;
    /**
     * The receiver can safely receive CashTokens. The `t` parameter should only
     * be used for backwards-compatibility; specific token requests must use a
     * token-aware address (see the c parameter).
     */
    t?: 'true';
  };
};

/**
 * All shared information stored by a wallet about a specific address, including
 * all `AddressData`, any non-HD public keys, the addresses `lockingBytecode`,
 * and any information stored as `extensions` (e.g. `cashAccount`, `label`,
 * `paymentRequest`, etc.).
 */
export type WalletAddressData = {
  /**
   * The address-specific compilation data required to generate this address;
   * this includes all non-HD public keys and all `AddressData`. If no
   * address-specific compilation data is required, this field may be omitted.
   */
  data?: CompilationData;
  /**
   * The hex-encoded locking bytecode of this address.
   */
  lockingBytecode: string;
  /**
   * A mapping of `WalletAddressData` extension identifiers to extension
   * definitions. `WalletAddressData` {@link Extensions} allow wallet entities
   * to associate key-value data with a particular address, preserving the data
   * for use by external systems or protocols.
   *
   * Address extensions may be widely standardized or application-specific;
   * values must be either `string`s, or objects containing `string`s (up to
   * two-dimensions), so extensions must also standardize an encoding strategy
   * for complex data (e.g. base64, hex, JSON, etc.).
   *
   * Several extension identifiers are considered standard:
   * - `cashAccount`: A CashAccount (`string`) registered for this address,
   * e.g. `bitjson#100.4218235911`
   * - `label`: A human-readable label (`string`) associated with this address.
   * - `paymentRequest`: An {@link EngineExtensionPaymentRequest}.
   * - `scan`: An optional boolean value indicating whether or not this address
   * should be included in regular scans for transactions relevant to the
   * wallet. If `true`, the address should always be included in scans, if
   * `false`, the address is considered "archived" and may be scanned
   * infrequently or upon user request. If undefined, addresses appearing in
   * known transactions are considered archived; by default, each address is
   * expected to be used in only one transaction.
   */
  extensions: Extensions;
};

/**
 * TODO: category type data
 */
export type CategoryTypeData = {
  extensions: Extensions;
};

/**
 * A {@link Wallet}'s view of a single output on a particular chain.
 */
export type Coin = {
  /**
   * The {@link Output} tracked by this {@link coin}.
   */
  output: Output<string, string, string>;
  /**
   * The hex-encoded transaction hash (A.K.A. TXID) of all transactions known to
   * have spent this coin.
   */
  spentBy: string[];
  /**
   * The parsed {@link NftCategoryField}s associated with this coin. If the coin
   * does not include an NFT, `undefined`.
   */
  nftField?: { [fieldName: string]: string };
  /**
   * A mapping of `Coin` extension identifiers to extension definitions.
   * {@link Extensions} may be widely standardized or application-specific.
   */
  extensions?: Extensions;
};

/**
 * A set of related transaction outputs and information about their spent status
 * across a particular chain.
 */
export type CoinSet = {
  /**
   * The latest split ID of this coin set. The split ID of a chain is the block
   * header hash (A.K.A. block ID) of the first unique block after the most
   * recent tracked split – a split after which both resulting chains are
   * considered notable or tracked by the wallet. (For chains with no such
   * splits, this is the ID of the genesis block.)
   *
   * Note, split ID is inherently a "relative" identifier. After a tracked
   * split, both resulting chains will have a new split ID. However, if a wallet
   * has not yet heard about a particular split, that wallet will continue to
   * reference one of the resulting chains by its previous split ID. The
   * split-unaware wallet may create transactions that are valid on both chains
   * (losing claimable value if the receivers of their transactions don't
   * acknowledge transfers on both chains). When the wallet becomes aware of the
   * split, it must duplicate the split `CoinSet`, update each `splitId`, and
   * assign its preferred ticker symbol to each chain.
   */
  splitId: string;
  /**
   * A mapping of coin IDs to internal {@link Coin}s, coins that are "owned" by
   * this wallet.
   *
   * Coin IDs are the concatenation of the transaction hash (TXID), an
   * underscore (`_`), and the output index, e.g.
   * `f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16_0`.
   */
  internal: { [coinId: string]: Coin };
  /**
   * A mapping of coin IDs to external {@link Coin}s, coins that are not
   * "owned" by this wallet, but tracked for identification or contract
   * usage purposes.
   *
   * Coin IDs are the concatenation of the transaction hash (TXID), an
   * underscore (`_`), and the output index, e.g.
   * `f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16_0`.
   */
  external: { [coinId: string]: Coin };
  /**
   * The block header hash (A.K.A. "block ID") of the latest block known to be
   * accepted by this chain. Tracking this value allows the wallet to identify
   * and handle situations in which previously-accepted blocks become stale,
   * impacting transactions that are relevant to the wallet.
   */
  tipHash?: string;
};

/**
 * A record representing a transaction and associated metadata across all chains
 * tracked by a {@link WalletShare}.
 */
export type TransactionRecord = {
  /**
   * The hex-encoded raw transaction held by this transaction record.
   *
   * While it's recommended that clients include the encoded transaction when
   * creating `TransactionRecord`s, this property may be optionally dropped to
   * reduce memory usage or data duplication across multiple wallets within
   * a {@link WalletSet}. Note that
   */
  encoded?: string;
  /**
   * A mapping of ticker symbols to block header hashes of blocks in which
   * this transaction is included (confirmed) in each tracked chain. If
   * unconfirmed on every tracked chain, an empty object (`{}`).
   */
  blockInclusions: { [tickerSymbol: string]: string };
  /**
   * The UTC timestamp at which the transaction was first received by the
   * wallet (or an indexer trusted by the wallet).
   */
  receivedTimestamp: number;
  /**
   * A mapping of `TransactionRecord` extension identifiers to extension
   * definitions. {@link Extensions} may be widely standardized
   * or application-specific.
   */
  extensions?: Extensions;
};

/**
 * A record representing a block and associated metadata across all chains
 * tracked by a {@link WalletShare}.
 */
export type BlockRecord = {
  /**
   * The height of this block: the number of blocks mined between this block and
   * its genesis block (block 0).
   */
  height: number;
  /**
   * The uint32 current Unix timestamp claimed by the miner at the time this
   * block was mined. By consensus, block timestamps must be within ~2 hours of
   * the actual time, but timestamps are not guaranteed to be accurate.
   * Timestamps of later blocks can also be earlier than their parent blocks.
   */
  claimedTimestamp: number;
  /**
   * The UTC timestamp at which the block was first received by the wallet
   * (or an indexer trusted by the wallet).
   *
   * Set to `undefined` if the true acceptance time is unknown, i.e. the block
   * was accepted via blockchain download and the `claimedTimestamp` is the best
   * available estimate of the blocks true network broadcast time.
   */
  receivedTimestamp?: number;
  /**
   * A mapping of `BlockRecord` extension identifiers to extension definitions.
   * {@link Extensions} may be widely standardized or application-specific.
   */
  extensions?: Extensions;
};

/**
 * An offline database storing information about the wallet's state across all
 * tracked networks. This data is used to render the wallet's holdings and
 * transaction activity timeline, select inputs for new transactions, verify
 * proofs and Bitauth signatures, and more.
 */
export type WalletDb = {
  /**
   * A mapping of ticker symbols (as recognized by this wallet) to
   * {@link CoinSet}s. This serves as an offline cache for all known coins –
   * across all chains – associated with this wallet.
   */
  coins: { [tickerSymbol: string]: CoinSet };

  /**
   * A mapping of transaction hashes (A.K.A. TXIDs) to the
   * {@link TransactionRecord} maintained by the wallet for that transaction.
   */
  transactions: { [transactionHash: string]: TransactionRecord };

  /**
   * An object mapping block header hashes (A.K.A. "block ID") to the
   * {@link BlockRecord} maintained by the wallet for that block.
   */
  blocks: { [blockHeaderHash: string]: BlockRecord };
};

/**
 * The secret key material and metadata required to participate in a particular
 * wallet as a particular entity.
 *
 * **This data is highly sensitive and should be saved in the most secure way
 * possible.**
 *
 * The most appropriate storage and/or backup techniques for this data will
 * often depend on the wallet template being used. Some wallet templates are
 * designed to rely on other entities in the case that this data is lost (e.g.
 * M-of-N multi-signature wallets), while other wallet templates rely on careful
 * replication – often across multiple physical locations – of this data to
 * prevent losses (e.g. most single-signature templates).
 */
export type WalletSecret = {
  /**
   * This field indicates that this JSON object is a Libauth
   * {@link WalletSecret}, as well as the schema version in use.
   *
   * This version of libauth expects a canonical value of:
   * `https://libauth.org/schemas/v2/wallet-secret-data.schema.json`
   */
  $schema: string;
  /**
   * Metadata regarding this {@link WalletSecret}. This metadata isn't
   * strictly required for recovery, but it's included in this data structure to
   * simplify backup and recovery management.
   */
  metadata: {
    /**
     * The entity ID of the wallet entity that saved this secret data; this
     * should be one of the entity IDs in the template used by `walletId`.
     */
    entityId: string;
    /**
     * The identifier of the particular wallet in which this secret data is
     * used.
     *
     * Wallet identifiers are a hash of the data exchanged during wallet
     * creation. Identifiers are encoded using the CashAddress format (see
     * {@link encodeCashAddressFormat}) with the prefix `libauth_wallet_seal`
     * and version `0`.
     *
     * During the wallet invitation process, wallet identifiers may be exchanged
     * with the prefix included, e.g.
     * `libauth_wallet_seal:qr6psn79jeqrh8trs7pu74adlex8t3s97c6kl0y3xwznp6vrr60pvxsclfvc6`;
     * within Libauth wallet engine data structures such as this one, the prefix
     * is excluded (but remains verifiable via the checksum), e.g.
     * `qr6psn79jeqrh8trs7pu74adlex8t3s97c6kl0y3xwznp6vrr60pvxsclfvc6`.
     */
    walletId: string;
  };
  /**
   * The secret key material for this entity.
   *
   * Note, unlike {@link WalletSetSecret.keys}, this data structure does not
   * allow for `extensions` to be defined, as clients are not expected to backup
   * `WalletSecret` information separately from the {@link WalletSetSecret}.
   * When inside a wallet set, wallet secrets should always be derivable from
   * the wallet set's secret, so allowing for additional extensions would
   * require a unique backup strategy for these uncommon cases. To store
   * additional secret extension information, consider using
   * {@link WalletSetSecret} extensions to a parent {@link WalletSet}.
   */
  keys: {
    /**
     * The Hierarchical-Deterministic (HD) private key used by this entity for
     * this wallet, encoded in BIP32 `xprv...` format.
     *
     * This field is defined if the entity is assigned one or more `HdKey`s in
     * the wallet template.
     */
    hd?: string;
    /**
     * A mapping of address indexes to (non-HD) private key lists used by this
     * entity for each address index. All `Key` variable assigned to this entity
     * in the wallet template are ordered lexicographically by variable ID, and
     * the private keys assigned to each variable for each address index is
     * added to the respective array in the same lexicographical order.
     *
     * Private keys are encoded in Wallet Import Format (WIF).
     *
     * This field is defined only if the entity is assigned one or more (non-HD)
     * `Key`s in the wallet template.
     */
    wif?: {
      [addressIndex: number]: string[];
    };
  };
};

/**
 * A data structure that encodes all the information needed for a particular
 * entity to participate in a particular wallet.
 */
export type Wallet = {
  /**
   * The identifier of the entity for which this `Wallet` is instantiated. This
   * ID should match an entity ID from the wallet's {@link Wallet.template}.
   */
  entityId: string;
  /**
   * The shared name assigned to this wallet.
   *
   * While implementations may always choose to maintain a separate alias for
   * each wallet, the shared `name` property enables better user experiences by
   * allowing entities to suggest updates to all other entities.
   *
   * **It is security critical that implementations using this field verify all
   * changes with the user.** A malicious entity participating in a shared
   * wallet could misleadingly rename the wallet such that the end user mistakes
   * its identity, unintentionally sending it funds (e.g. `Conference Demo`
   * renamed to `Savings Wallet`).
   */
  name: string;
  /**
   * The shared description assigned to this wallet.
   *
   * If set, the description should typically be shown in user interfaces when a
   * specific wallet is being viewed.
   *
   * Descriptions have no length limit, but in user interfaces with limited
   * space, they should be hidden beyond the first newline character or `140`
   * characters until revealed by the user (e.g. by hiding the remaining
   * description until the user activates a "show more" link).
   *
   * While not considered security critical, implementations using this field
   * should inform users of all changes. See {@link Wallet.name} for details.
   */
  description: string;
  /**
   * The secret key material and metadata required to participate in this wallet
   * as the entity for which it was instantiated (`entityId`).
   */
  secret: WalletSecret;
  /**
   * A mapping of entity IDs to each entity's {@link WalletEntityInformation}.
   */
  entities: {
    [entityId: string]: WalletEntityInformation;
  };
  /**
   * The complete set of addresses currently allocated in this wallet. Each key
   * is a locking script ID from the wallet template, and each value is an index
   * of addresses allocated with that locking script. To be considered valid
   * (not corrupted), locking script address indexes must use contiguous
   * integers beginning at `0`.
   *
   * For each address, {@link WalletAddressData} is persisted. Address
   * indexes are immutable once allocated: **the `data` and `lockingBytecode`
   * properties at a given `lockingScriptId` and `addressIndex` must never
   * change after being created**. However, it is possible to update each
   * {@link WalletAddressData.extensions} index in future {@link WalletUpdate}s;
   * this allows entities to share usage-related information using extensions
   * like `cashAccount`, `label`, `paymentRequest`, etc.
   *
   * For many wallet templates, it is possible for each entity to derive
   * billions of addresses without coordination (using `WalletData` and
   * Hierarchical-Deterministic public keys). While these derivation schemes
   * ensure wallet funds can be recovered without information about allocated
   * addresses, it is still recommended that implementations use this address
   * index to communicate address allocation between entities: scanning both
   * for inbound payments and wallet recovery are made more efficient by
   * definitive address allocation, and this basic infrastructure also enables
   * sharing of {@link WalletAddressData.extensions} for richer, multi-device
   * user experiences.
   */
  addresses: {
    [lockingScriptId: string]: {
      [addressIndex: number]: WalletAddressData;
    };
  };

  /**
   * TODO: revise for CategoryTypeData
   * ---
   *
   * An index of token categories that are being tracked by this wallet. All
   * unspent transaction outputs containing tokens of these categories –
   * regardless of locking bytecode – are stored in the wallet's coin index.
   * (If the output is not owned by the wallet, it is marked with a
   * {@link Coin.external} value of `true`.)
   *
   * This value determines the contents of the wallet's
   * {@link WalletTransactionFilter.externalTokenCategories}.
   *
   * Keys must be a 32-byte, hex-encoded token category, and each value is a
   * "purpose" `string` explaining why the wallet is tracking this token
   * category. Often, token categories included here should also be included
   * in the `identities` field of {@link Wallet.registry} to store additional
   * token metadata, like `name`, `description`, `icon`, etc.
   *
   * Tracked categories enable complex contract behaviors involving instances
   * of a particular token type like token-unlocked vaults,
   * token-authenticated contract instances, and other cross-contract/covenant
   * interactions. Tracking categories can also be useful for
   * application-specific user interfaces, e.g. aggregating metrics for a
   * decentralized order book, monitoring issuance within a particular
   * token category, displaying analytics about a particular protocol, etc.
   */
  categories: {
    [categoryTypeId: string]: {
      [categoryId: string]: CategoryTypeData;
    };
  };

  db: WalletDb;

  /**
   * The shared {@link MetadataRegistry} of Bitauth identities that are being
   * tracked by all entities in this wallet. By tracking identities, wallets can
   * 1) verify the on-chain records of other identities, and 2) ensure that the
   * wallet does not inadvertently transfer away or destroy the identities
   * it holds.
   *
   * **It is security critical that implementations using this field verify
   * all changes with the user.** A malicious entity participating in a shared
   * wallet could misleadingly change or remove identity entries such that an
   * end user 1) mistakes one identity or asset for another, or 2) mistakenly
   * approves the transfer or destruction of an identity or asset.
   *
   * Only currently-tracked identities are included in this registry. To find
   * previously-tracked identities, inspect the wallet's history
   * in {@link Wallet.activity}.
   */
  registry: MetadataRegistry;
  activity: WalletActivity;
  template: WalletTemplate;
  /**
   * A mapping of `Wallet` extension identifiers to extension definitions.
   * {@link Extensions} may be widely standardized or application-specific.
   */
  extensions?: Extensions;
};

// TODO: Action + template?
export type WalletInvitation = {
  template: WalletTemplate;
};
