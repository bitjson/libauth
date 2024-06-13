import type {
  Extensions,
  Wallet,
  WalletEntityInformation,
  WalletInvitation,
  WalletTemplate,
} from '../../lib.js';

export type WalletSetSecretRecord = {
  /**
   * The Unix timestamp (in milliseconds, e.g. `Date.now()`) at which this
   * record was initially created. If `undefined` or different from the value of
   * `imported`, the record is understood to have been created by an external
   * system before being imported into this wallet set (and therefore may have
   * some risk of compromise due to leaks by the external system).
   */
  created?: number;
  /**
   * The Unix timestamp (in milliseconds, e.g. `Date.now()`) at which this
   * record was initially imported into the wallet set. If this value matches
   * `created`, the record is considered to have been created within this wallet
   * set (and has no risk of compromise due to leaks in external systems).
   */
  imported: number;
  /**
   * The Unix timestamp (in milliseconds, e.g. `Date.now()`) at which the
   * physical or externally-managed backup for this record was most recently
   * marked as verified. If `undefined`, the record's backup has not yet
   * been verified.
   */
  verified?: number;
  /**
   * A multi-line, human-readable description for this record. This field
   * enables end users to keep records about specific creation details, backup
   * procedures, past backup verifications, possible exposures, or any other
   * private information about this record. As this description is part of
   * the wallet set's secret, so it is never shared with other wallet entities.
   *
   * Descriptions have no length limit, but in user interfaces with limited
   * space, they should be hidden beyond the first newline character or `140`
   * characters until revealed by the user (e.g. by hiding the remaining
   * description until the user activates a "show more" link).
   */
  description?: string;
  /**
   * A mapping of extension identifiers to extension definitions.
   * {@link Extensions} may be widely standardized or application-specific.
   */
  extensions?: Extensions;
};

export type WalletSetSecretKeyRecord = WalletSetSecretRecord & {
  /**
   * The 20-byte fingerprint of the key material associated with this record.
   * Key material can be resolved by locating the fingerprint
   * within {@link WalletSetSecret.keys}.
   */
  fingerprint: string;
};

export type WalletDerivationHdInformation = {
  /**
   * The fingerprint of the HD Key in {@link WalletSetSecret.keys.hdKeys} which
   * holds the root HD key used by this derivation.
   */
  fingerprint: string;
  /**
   * The derivation path to use in the notation specified in BIP32.
   *
   * The first character must be `m` (private derivation), followed by sets of
   * `/` and a number representing the child index used in the derivation at
   * that depth. Hardened derivation is represented by a trailing `'`, and
   * hardened child indexes are represented with the hardened index offset
   * (`2147483648`) subtracted.
   *
   * For example, `m/0/1'` uses 2 levels of derivation, with child indexes in
   * the following order: `derive(derive(root, 0), 2147483648 + 1)`
   *
   * It is recommended that new wallets use the path `m/i'`, where `i` is the
   * next integer not in use by any other wallets or invitations for this
   * {@link WalletSetSecret.keys} `hdKeys` index.
   */
  derivationPath: string;
};

/**
 * The information required to derive a particular wallet shares's
 * {@link Wallet.secret} from a {@link WalletSetSecret}.
 */
export type WalletDerivation = {
  /**
   * The derivation information for the `HdKey`s used by this wallet.
   */
  hd?: WalletDerivationHdInformation;
  /**
   * The derivation information for the `Key`s used by this wallet. Either:
   *
   * 1. The index of {@link WalletSetSecret.metadata.keyArrays} in use, or
   * 2. The HD derivation information and a count of keys to derive at the
   * indicated path.
   */
  wif?:
    | number
    | (WalletDerivationHdInformation & {
        /**
         * The number of keys to derive from `derivationPath` by appending `/i`,
         * where `i` begins at `0` and continues until `count - 1`.
         */ count: number;
      });
};

export type WalletSetSecretDerivationRecord = WalletSetSecretRecord & {
  derivation: WalletDerivation;
};

/**
 * A BIP39 extension for {@link WalletSetSecret}s mapping wallet set HD Key
 * fingerprints to the BIP39 word lists from which they were derived.
 */
export type EngineExtensionBip39 = {
  [fingerprint: string]: string;
};

/**
 * All secret `keys`, derivation information, and related metadata for a
 * particular {@link WalletSet}.
 */
export type WalletSetSecret = {
  /**
   * This field indicates that this JSON object is a Libauth
   * {@link WalletSetSecret}, as well as the schema version in use.
   *
   * This version of libauth expects a canonical value of:
   * `https://libauth.org/schemas/v2/wallet-set-secret.schema.json`
   */
  $schema: string;
  /**
   * The underlying key material for all wallets in this {@link WalletSet}.
   */
  keys: {
    /**
     * An index mapping the fingerprint of each HD private keys used by this
     * wallet set to the corresponding HD (Hierarchical-Deterministic) private
     * key in BIP32 `xprv...` format.
     *
     * HD key fingerprints are determined using the BIP32 method: the compressed
     * public key of the HD node's private key is hashed with SHA-256 followed
     * by RIPEMD-160. The fingerprint is the hex-encoded 20-byte result
     * (without truncation).
     */
    hd?: {
      [fingerprint: string]: string;
    };
    /**
     * An index mapping the fingerprint of each (non-HD) private key used by
     * this wallet set to the corresponding private key in
     * Wallet Import Format (WIF).
     *
     * Non-HD private key fingerprints are determined by deriving the compressed
     * public key, then hashing the public key with SHA-256 followed by
     * RIPEMD-160. The fingerprint is the hex-encoded 20-byte result
     * (without truncation).
     */
    wif?: {
      [fingerprint: string]: string;
    };
    /**
     * A mapping of `WalletSetSecret.keys` extension identifiers to extension
     * definitions. {@link Extensions} may be widely standardized
     * or application-specific.
     *
     * These extension are excluded from keyless wallet set exports. For
     * extensions that should be included in keyless wallet set exports,
     * see {@link WalletSetSecret.extensions}.
     *
     * The following additional extensions are currently standard:
     *
     * - `bip39`: an {@link EngineExtensionBip39}.
     */
    extensions?: Extensions;
  };

  /**
   * The metadata associated with the `keys` in this `WalletSetSecret`.
   */
  metadata: {
    /**
     * An index of {@link WalletSetKeyRecord}s for the HD private keys used by
     * this wallet set. Each record's `fingerprint` must match a fingerprint
     * present in this `WalletSetSecret`'s `keys.hd` object.
     *
     * To be considered well-formed, the object key (`index`) of the first entry
     * must be `0`, and all remaining `index`es must be contiguous, incrementing
     * integers, e.g. `{ "0": {...}, "1": {...} }`.
     */
    hdKeys?: {
      [index: number]: WalletSetSecretKeyRecord;
    };
    /**
     * An index of the private key arrays used by this wallet set. Each key
     * array is an object containing an index of the {@link WalletSetKeyRecord}s
     * for the private keys used by the key array; each record's `fingerprint`
     * must match a fingerprint present in this `WalletSetSecret`'s
     * `keys.wif` object.
     *
     * Index order is critical, as {@link WalletSetSecret.derivations}
     * references specific entries for specific wallets and invitations. To be
     * considered well-formed, the object key (`index`) of the first entry must
     * be `0`, and all remaining `index`es must be contiguous, incrementing
     * integers, e.g. `{"0": {"0": {...}, "1": {...} } }`.
     */
    keyArrays?: {
      [index: number]: {
        [index: number]: WalletSetSecretKeyRecord;
      };
    };
  };

  /**
   * The derivation information used to derive the {@link Wallet.secret} for
   * each wallet in this {@link WalletSet}. This information is not strictly
   * secret, but it's also not necessary to share with other entities.
   */
  derivations: {
    /**
     * An index mapping {@link WalletShare} IDs to the wallet
     * share's {@link WalletSetSecretDerivationRecord}.
     */
    wallets: { [walletShareId: string]: WalletSetSecretDerivationRecord };
    /**
     * An index mapping wallet invitation share IDs to the invitation share's
     * {@link WalletSetSecretDerivationRecord}.
     */
    invitations: {
      [invitationShareId: string]: WalletSetSecretDerivationRecord;
    };
  };

  /**
   * A mapping of `WalletSetSecret` extension identifiers to extension
   * definitions. {@link Extensions} may be widely standardized
   * or application-specific.
   */
  extensions?: Extensions;
};

/**
 * The data structure in which {@link WalletSet}s hold {@link Wallet}s. This
 * allows a single wallet set to serve as multiple entities within the same
 * multi-entity wallet (by maintaining multiple {@link Wallet} objects) and to
 * privately extend {@link Wallet}s with `WalletShare` extensions.
 */
export type WalletShare = {
  /**
   * The {@link Wallet} instance.
   */
  wallet: Wallet;
  /**
   * A mapping of `WalletShare` extension identifiers to extension definitions.
   * {@link Extensions} may be widely standardized or application-specific.
   */
  extensions?: Extensions;
};

/**
 * All secrets and data pertaining to a set of wallets. `WalletSet`s contain
 * {@link WalletShare}s which themselves contain {@link Wallet}s.
 *
 * Generally, a device or application should maintain a single `WalletSet` for
 * all wallets in which it participates, but it can also be valuable to maintain
 * multiple `WalletSet`s in some circumstances, e.g.:
 * - To manage exceptionally large wallets (over 100,000 addresses, coins,
 * past transactions, etc.);
 * - To reduce memory requirements by splitting up a wallet set and using only a
 * subset at a time;
 * - To achieve "user switching" behaviors where the device shifts between
 * high-level contexts (e.g. between a "decoy" set and a "hidden" set).
 */
export type WalletSet = {
  /**
   * A short, immutable, local identifier assigned to this wallet set.
   *
   * Wallet set identifiers allow prior backups (e.g. on physical media) to be
   * definitively associated with the particular wallet set, even if the `name`,
   * `description`, or other key elements of the wallet set have been modified
   * since the backup was created.
   *
   * Wallet set identifiers should be randomly selected by the device and never
   * modified once assigned. Identifiers should be long enough to distinguish
   * between all wallet sets which the device might create or access, but they
   * need not be globally unique.
   *
   * It is recommended that identifiers consist of 4 random bytes, hex-encoded,
   * e.g. `f4184fc5`. Do not use a hash of any wallet set contents (name,
   * description, key material, etc.), as newly-created wallet sets often share
   * these elements with previously-created wallet sets on the same device,
   * increasing the likelihood of collisions.
   */
  setId: string;
  /**
   * The local name assigned to this wallet set.
   *
   * Unlike {@link Wallet.name}s, `WalletSet` names are local to the device;
   * they are not security critical, and exist only to assist the owner in
   * wallet organization and management.
   */
  name: string;

  /**
   * The hardware and software stack in use; enables stronger security practices
   * and tailored user experiences across multi-device wallets. For web wallets,
   * `device` is the user's web browser, and the `os` version will often be
   * `unknown`. See {@link WalletEntityInformation} for details and examples.
   */
  userAgent: WalletEntityInformation['userAgent'];

  chains: {
    [splitId: string]: string;
  };

  /**
   * The local description assigned to this wallet set.
   *
   * If set, the description should typically be shown in user interfaces when a
   * specific wallet is being viewed.
   *
   * Descriptions have no length limit, but in user interfaces with limited
   * space, they should be hidden beyond the first newline character or `140`
   * characters until revealed by the user (e.g. by hiding the remaining
   * description until the user activates a "show more" link).
   *
   * Unlike {@link Wallet.description}s, `WalletSet` descriptions are local to
   * the device; they are not security critical, and exist only to assist
   * the owner in wallet organization and management.
   */
  description: string;
  /**
   * The underlying {@link WalletSetSecret} from which the {@link Wallet.secret}
   * of each wallet in this set is derived.
   */
  secret: WalletSetSecret;
  /**
   * A mapping of wallet share identifiers to wallet shares held in this
   * wallet set.
   *
   * Wallet share identifiers are the concatenation of the wallet ID (A.K.A.
   * `libauth_wallet_seal` with prefix excluded), a period (`.`), and the entity
   * ID as it appears in the wallet template, e.g.
   * `qr6psn79jeqrh8trs7pu74adlex8t3s97c6kl0y3xwznp6vrr60pvxsclfvc6.signer_1`.
   *
   * Note that wallet sets may contain multiple shares from the same wallet such
   * that one wallet set serves as multiple entities within a single wallet. In
   * these cases, significant duplication exists across the shares, both in
   * indexes (like {@link WalletShare.coinIndex} and
   * {@link WalletShare.transactionIndex}) and in shared wallet data.
   *
   * This duplication allows the wallet set to track wallet and network state
   * independently for each entity it manages within the set, enabling stronger
   * privacy/security practices: the wallet set can convincingly behave as if
   * wallet and network state are not synchronized across each of the entities
   * it controls (e.g. pretending that one of its entities is an offline or less
   * frequently connected device).
   */
  shares: {
    [walletShareId: string]: WalletShare;
  };
  /**
   * TODO: doc
   */
  invitations: {
    [invitationShareId: string]: WalletInvitation;
  };
  /**
   * An index of the {@link WalletTemplate}s that have been imported as trusted
   * templates.
   *
   * Before using a new template, developers and/or end users should ensure the
   * template has been audited for security to the extent required for their use
   * case; if a template is poorly-designed or malicious, all funds entrusted to
   * it may be at risk of loss. After this verification, the trusted template
   * should be included in this index, allowing this wallet set to create or
   * join wallets using the template.
   */
  templates: { [versionHash: string]: WalletTemplate };

  /**
   * A mapping of `WalletSet` extension identifiers to extension definitions.
   * {@link Extensions} may be widely standardized or application-specific.
   */
  extensions?: Extensions;
};
