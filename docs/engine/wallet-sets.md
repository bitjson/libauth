**This documentation is being written prior to implementation, much of the below functionality is not yet available.**

# Wallet Sets

A Libauth **`WalletSet`** is a collection of all secrets and data pertaining to a set of wallets. **It is the highest-level abstraction and the primary data structure for managing wallets in Libauth.**

Generally, a device or application should maintain a single `WalletSet` for all wallets in which it participates, but it can also be valuable to maintain multiple `WalletSet`s in some circumstances, e.g.:

- To manage exceptionally large wallets (over 100,000 addresses, coins,
  past transactions, etc.);
- To reduce memory requirements by splitting up a wallet set and using only a
  subset at a time;
- To achieve "user switching" behaviors where the device shifts between
  high-level contexts (e.g. between a decoy wallet set and a hidden wallet set).

# Create a Wallet Set

To create a new wallet set, provide the new wallet set's required metadata to `createWalletSet`:

```ts
import { getRandomSetId, createWalletSet } from '@bitauth/libauth';

const walletSet = createWalletSet({
  /**
   * A short, random ID to permanently identify this wallet set in storage and
   * backups. For most applications, `getRandomSetId` is recommended.
   */
  setId: getRandomSetId(),
  /**
   * Used to identify the wallet set in user interfaces.
   */
  name: 'Personal Wallets',
  /**
   * Used to describe the wallet set in user interfaces.
   */
  description: 'A wallet set for your personal wallets. This wallet set was automatically created when you first installed ACME Wallet.',
  /**
   * The hardware and software stack in use; enables stronger security practices
   * and tailored user experiences across multi-device wallets. For web wallets,
   * `device` is the user's web browser, and the `os` version will often be
   * `unknown`. See the `WalletEntityInformation` docs for details and examples.
   */
  userAgent: {
    type: 'desktop',
    app: { name: 'ACME Wallet', version: '1.0.0' },
    device: { name: 'MacBook Pro', version: '16-inch, 2021' },
    os: { name: 'macOS', version: '13.2.1' },
  };
});
```

# Add a Key to a Wallet Set

```ts
import {
  generateLibauthSecretKey,
  walletSetImportHdKey,
} from '@bitauth/libauth';
import { walletSet } from './somewhere.js';

/**
 * Create and import a new HD key.
 */
walletSetImportHdKey(walletSet, {
  libauthSecretKey: generateLibauthSecretKey(),
});

/**
 * Import a key from a pre-existing BIP39 word list.
 */
walletSetImportHdKey(walletSet, {
  bip39WordList: 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong',
  /**
   * Optional timestamp information for imported, pre-existing keys. (If not
   * provided, the `created` and `imported` timestamps are set to the current
   * time and `verified` is not set.)
   */
  created: new Date('2023-05-15T00:00:00.000Z'),
  verified: new Date('2023-05-16T00:00:00.000Z'),
});
```

Note that for performance reasons, **most Libauth functions which operate on wallet sets will mutate the provided wallet set**. This is typically the desired behavior, but for use cases requiring a clone of the wallet set prior to modification, consider using `structuredClone` when passing in the wallet set:

```ts
import {
  generateLibauthSecretKey,
  walletSetImportHdKey,
} from '@bitauth/libauth';

/**
 * Create and import a new HD key.
 */
const clonedSet = walletSetImportHdKey(structuredClone(walletSet), {
  libauthSecretKey: generateLibauthSecretKey(),
});
```

# Saving and Restoring Wallet Sets

Whenever a wallet set is modified, the updated wallet set should typically be persisted to one or more forms of permanent storage. This is done by exporting the wallet set to a standard JSON format in one of two modes:

- **Complete wallet set export** – A backup of the entire wallet set, including all keys and metadata is exported. This is the most sensitive kind of backup, as compromises would grant an attacker full control of the wallet set.
- **Keyless wallet set export** – A "watch-only" backup of only the wallet set's metadata – key derivation information, names, descriptions, transaction activity, etc. – excluding all key material. This backup is less sensitive in that compromises can only violate the user's privacy; without key material, an attacker can not sign or spend on behalf of the user.

Nearly all applications will require complete exports for locally persisting and restoring wallet sets on application restart. For many applications, it's also advisable to create external, encrypted backups after important changes like importing key material or creating new wallets. External encrypted backups can be uploaded to a trusted storage provider, sent via email back to the user or to another trusted party, or persisted via another media trusted by the user.

Encryption is also useful for reducing risk while exporting wallet sets to more durable media. For example, an encrypted complete wallet set export can be printed on paper as restorable QR codes, then the root decryption key can be later written by hand, eliminating risk of compromise by printer hardware or software.

Depending on privacy requirements, some applications may also benefit from **keyless backups** – backups in which all but the private key information is included. These can be useful for allowing another device to monitor for transactions or facilitate wallet activity, e.g. a keyless online device providing data for an airgapped device.

Libauth supports encrypting both complete and keyless backups using [`age`](age-encryption.org/v1), and it's generally recommended that wallet sets always be persisted in encrypted form. By default, the encryption key is derived by hashing the wallet set's initial HD key (at HD key index `0`). When encrypting exports, the `walletSetExport` function returns both the `encrypted` payload and the derived `passphrase` required for later decryption.

```ts
import {
  walletSetExport,
  walletSetExportKeyless,
  walletSetImport,
} from '@bitauth/libauth';

import { saveToExternalStorage, promptUserToWriteDown } from './my/app';

/**
 * Export an encrypted, keyless copy of the wallet set:
 */
const watchOnlyExport = walletSetExportKeyless(walletSet);
if (typeof watchOnlyExport === 'string')
  throw new Error(`Export failed: ${watchOnlyExport}`);
/**
 * Keyless encrypted exports return only the encryption `passphrase` – the
 * passphrase is derived from a hash of the secret key material, but cannot be
 * used to sign or spend on behalf of the wallet set.
 */
const { encrypted, passphrase } = watchOnlyExport;

/**
 * Restore the keyless wallet set, e.g. on a watch-only device:
 */
const keylessSet = walletSetImport({ encrypted, passphrase });

/**
 * Export a complete, encrypted backup of the wallet set (using the default
 * encryption strategy – a passphrase derived from the wallet set's initial
 * HD key):
 */
const encryptedExport = walletSetExport(walletSet);
if (typeof encryptedExport === 'string')
  throw new Error(`Export failed: ${encryptedExport}`);
/**
 * Complete encrypted exports return both the encryption `passphrase` and the
 * wallet set's root `secretKey`. While both can be used to decrypt the
 * `encrypted` export, it's best for users to make a physical backup of the
 * secret key to preserve as much information as possible. If the encrypted
 * backup is lost, it is sometimes possible to partially recover a wallet set
 * with only the secret key.
 */
const { encrypted, passphrase, secretKey } = encryptedExport;
saveToExternalStorage(encrypted);
promptUserToWriteDown(secretKey);

// ...later:
const restoredWalletSet = walletSetImport({ encrypted, secretKey });
```

While it's generally safe to override the last export when locally persisting the wallet set, consider defensively persisting an internal copy of a complete, encrypted wallet set export after any key material is added to a wallet. These internal backups can be used to automatically restore data if defects in your application inadvertently delete or corrupt the in-use wallet set. This can allow for better experiences than requiring the user to manually participate in recovery, e.g. from a printed external backup.

# Verify Key Backups

An external backup ensures that wallet sets can be recovered in a worst case scenario – wallet software may corrupt keys via software defects, devices may be lost or destroyed, storage services may lose data, the owner may be incapacitated, wallet vendors may cease operation without warning, etc. – with an external backup, users are better equipped to plan for recovery from these scenarios.

Libauth wallet sets track relevant information about the keys and wallet derivations they hold; this metadata includes a `verified` timestamp, the moment at which the application confirms that an external backup includes that key or wallet derivation information.

While this metadata can be manually managed, most applications can simply use the `walletSetVerifyBackup` function to update all relevant `verified` timestamps following confirmation that the user has safely stored the encrypted wallet set export and matching Libauth secret key:

```ts
import { walletSetImport, walletSetMarkBackupVerified } from '@bitauth/libauth';

import { loadEncryptedBackup, promptUserToVerifySecretKey } from './my/app';

const encrypted = loadEncryptedBackup();
promptUserToVerifySecretKey((enteredKey) => {
  const restoredWalletSet = walletSetImport({ encrypted, enteredKey });
  if (typeof restoredWalletSet === 'string')
    throw new Error(`Export failed: ${restoredWalletSet}`);

  /**
   * Once we've verified that the external backup and user-written secret key
   * are valid:
   */
  walletSetMarkBackupVerified(encrypted);
});
```

Note, the secret key alone is not sufficient to restore a wallet set; it's essential that the encrypted backup also be safely persisted. See [Saving and Restoring Wallet Sets](#saving-and-restoring-wallet-sets) for details.

# Import a Wallet Template

To create a wallet, wallet sets must first import a **wallet template**, a concise specifications which allows wallet software to understand how to create and spend from new types of addresses. Libauth includes commonly used wallet templates, and its possible to [author a custom template](./engine.md#template-authoring).

Most wallet sets include Pay to Public Key Hash (P2PKH) wallets, so it's common to import the P2PKH template from Libauth:

```ts
import {
  walletSetImportWalletTemplate,
  walletTemplateP2pkh,
} from '@bitauth/libauth';

// ...
walletSetImportWalletTemplate(walletSet, walletTemplateP2pkh);
```

An imported wallet template is considered "trusted" by the wallet set, allowing it to be used when creating or joining new wallets.

Before importing a template, developers and/or users should ensure the template has been audited for security to the extent required for their use case. If a template is poorly-designed or malicious, all funds entrusted to it may be at risk of loss. See [Template Validation](./engine.md#template-validation) for details.

# Create a Wallet

Wallets can be held using a single device, **single-entity wallets**, or they can be distributed across multiple devices – **multi-entity wallets**. While multi-entity wallets must be created via the [wallet invitation process](#create-a-wallet-invitation), single-entity wallets can be directly created on a single device.

To create a new Pay to Public Key Hash (P2PKH) wallet using the previously imported P2PKH template:

```ts
import {
  walletSetCreateWallet,
  walletSetExport,
  walletSetIsRootKeyVerified,
} from '@bitauth/libauth';

import {
  launchBackupVerificationProcess,
  saveToLocalDevice,
  saveToUsersCloudStorage,
} from './my/app';

/**
 * Get the precise version hash of the wallet template to use.
 *
 * Every wallet template has a deterministic version hash, and it's possible for
 * a wallet set to include multiple copies of a similar template – for this
 * example, we simply use the first trusted template with 'P2PKH' in it's name,
 * but you may want to allow the user to choose a template from the list.
 */
const p2pkhVersionHash = Object.entries(walletSet.templates).find(
  ([versionHash, template]) => template.name.includes('P2PKH'),
)[0];

/**
 * Create the new wallet using the default settings.
 *
 * Because the P2PKH template has only one entity, we can omit an `entityId`,
 * and because we have omitted any key selection via `variables`, the engine
 * will derive the next hardened child of the wallet set's root HD key.
 */
const result = walletSetCreateWallet(walletSet, {
  name: 'My Wallet',
  template: p2pkhVersionHash,
});
if (typeof result === 'string') throw new Error(result);

/**
 * If successful, `walletSetCreateWallet` returns the new wallet's share ID (the
 * index at which the wallet is stored in the wallet set) and a reference to the
 * new wallet.
 */
const { walletShareId, wallet } = result;
console.log(wallet.name, 'created 🚀');
saveToLocalDevice(walletSet);

/**
 * Finally, we immediately attempt to persist the updated wallet set to a
 * user-recoverable media. The user's existing secret key backup remains
 * sufficient to decrypt this new encrypted export.
 */
saveToUsersCloudStorage(walletSet);

/**
 * We can use the `walletSetIsRootKeyVerified` utility to confirm that the user
 * has already verified the external backup of their wallet set's root HD key
 * (`libauth-secret-key:...`). If so, the above backup to the user's cloud
 * storage is sufficient to mark the new wallet's backup as verified – the user
 * can recover their entire wallet set, including the new wallet, using their
 * existing secret key and the encrypted export in their cloud storage account.
 */
if (walletSetIsRootKeyVerified(walletSet)) {
  walletSetMarkBackupVerified(encrypted);
} else {
  /**
   * The user hadn't previously verified their backup of the wallet set's root
   * secret key, so we try to begin that process now.
   *
   * See `Saving and Restoring Wallet Sets` for details.
   */
  launchBackupVerificationProcess();
}
```

Wallet sets encapsulate the created `Wallet` objects in data structures called **wallet shares**, a single entity's "share" of a particular wallet. Wallet shares contain both the `Wallet` object (at `WalletSet.shares[walletShareId].wallet`) and an internal database of all relevant activity for each wallet, including indexes of spent and unspent coins, address usage, and confirmation status of transactions across all tracked chains. At any time, this database allows applications to compute each wallet's known holdings, display historical information, and select inputs for transaction creation.

While single-entity wallets are represented by only one share (on a single device), multi-entity wallets are represented by multiple shares, with each share held in a different entity's wallet set (or in some cases, a single device may pretend to be multiple entities by holding multiple shares in one wallet set). Each share maintains a view of the wallet from that particular entity's perspective, and the shares must coordinate as necessary to sign messages and create transactions.

# Create an Address

Libauth wallets track all addresses allocated within each wallet. While it's possible for many wallets to continue deriving an essentially unlimited number of addresses without tracking allocation, address allocation provides the infrastructure for supporting more complex kinds of wallets, preserving labels and other metadata about specific addresses, and efficiently detecting inbound payments.

To allocate new addresses or request specific payments, call `walletAllocateAddresses` on the `Wallet` in which the new addresses are to be allocated. Payment request information may optionally be provided for each allocated address and will be retained by the wallet:

```ts
import {
  walletAllocateAddresses,
  lockingBytecodeToCashAddress,
} from '@bitauth/libauth';

// ... import walletSet ...

const allocation = walletAllocateAddresses(
  walletSet.shares[walletShareId].wallet,
  [{ m: 'Website donation address' }],
);
if (typeof allocate === 'string') throw new Error(allocate);
console.log(
  'Allocated new address:',
  lockingBytecodeToCashAddress(allocate.addresses[0].lockingBytecode),
);
```

To render the newly allocated address in a user interface or as a payment request, use `encodePayProUris`:

```ts
import { encodePayProUris, walletAllocateAddresses } from '@bitauth/libauth';

const allocation = walletAllocateAddresses(
  walletSet.shares[walletShareId].wallet,
  [{ s: 12345, m: 'Test at ACME (10% Friends & Family Discount)' }],
);
if (typeof allocate === 'string') throw new Error(allocate);
const uris = encodePayProUris(allocate.addresses[0]);
/**
 * This produces an object with several kinds of URIs:
 */
const exampleResult = {
  /**
   * A URI that is as backwards-compatible as possible; this can be used as a
   * fallback for older wallets that do not support the BCH PayPro standard.
   */
  compatible:
    'bitcoincash:qr7fzmep8g7h7ymfxy74lgc0v950j3r2959lhtxxsl?amount=0.00012345&message=Test%20at%20ACME%20%2810%25%20Friends%20%26%20Family%20Discount%29',
  /**
   * An alphanumeric URI for efficient encoding in QR codes.
   */
  qr: 'BITCOIN:QR7FZMEP8G7H7YMFXY74LGC0V950J3R2959LHTXXSL:S-12345+M-%54EST AT %41%43%4D%45 %2810%25 %46RIENDS %26 %46AMILY %44ISCOUNT%29',
  /**
   * A case-insensitive URI for use in web pages and other text-based media.
   */
  text: 'bitcoin:qr7fzmep8g7h7ymfxy74lgc0v950j3r2959lhtxxsl&s=12345&m=%54est%20at%20%41%43%4D%45%20%2810%25%20%46riends%20%26%20%46amily%20%44iscount%29',
};
```

# Sync Transactions

To sync transactions, applications must export scanning information for the wallet(s) in question, query a data source – e.g. a node, blockchain indexer, or trusted data provider – for matching transactions, then import matching transaction information into the wallet set. This transaction filtering workflow allows Libauth wallets to be used in both asynchronous and synchronous contexts: a light wallet may only occasionally query an external data source for matching transactions, while a node-embedded wallet may immediately scan all inbound transactions for matches as they are heard over the P2P network.

This guide demonstrates syncing a wallet set by querying a [Chaingraph](https://chaingraph.cash/) instance using Libauth's built-in `walletSetSyncViaChaingraph` function. For guidance in developing syncing functionality against other backends, review the implementation of `walletSetSyncViaChaingraph`.

```ts
import { walletSetSyncViaChaingraph } from '@bitauth/libauth';

// ... import walletSet ...

const sync = walletSetSyncViaChaingraph(walletSet, {
  endpoint: 'https://demo.chaingraph.cash/v1/graphql',
});

sync
  .then(() => console.log('Wallet set synced 🚀'))
  .catch((err) => console.error(err));
```

# Render Holdings & Timeline

A wallet's **holdings** include all funds and tokens held by addresses owned by the wallet. A wallet's **timeline** is a complete record of each event that has occurred in the history of the wallet, including updates to the wallet – like address allocations and modifications to tracked metadata – and wallet transaction activity.

To render the holdings of a particular wallet, use `walletRenderHoldings`:

```ts
import { walletRenderHoldings } from '@bitauth/libauth';

// ... import and sync walletSet, select a walletShareId ...

const holdings = walletRenderHoldings(walletSet.shares[walletShareId].wallet);
/**
 * This produces an object keyed by ticker symbol, e.g. `bch` (mainnet), `chip`
 * (chipnet), and `test4` (testnet4). Example result:
 */
const exampleHoldings = {
  bch: {
    satoshis: {
      unconfirmed: 123456,
      confirmed: 3456789,
    },
    category: {
      f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16: {
        amount: 12345,
      },
      b7adfe4f2b374e770584d2d0beb8eacc7b29287a47d2ffe511fa81f48e0ec4fb: {
        nfts: {
          pledge: {
            aggregate: {
              bch_pledged: 135801,
            },
            coin: {
              ab184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16_0:
                {
                  commitment: '3930',
                  field: {
                    bch_pledged: 12345,
                  },
                },
              ab184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16_2:
                {
                  commitment: '40e201',
                  field: {
                    bch_pledged: 123456,
                  },
                },
            },
          },
        },
      },
    },
    chip: {
      satoshis: {
        confirmed: 12345678,
      },
    },
  },
};
```

To render the timeline of a particular wallet, use `walletShareRenderTimeline`:

```ts
import { walletShareRenderTimeline } from '@bitauth/libauth';

// ... import and sync walletSet, select a walletShareId ...

const timeline = walletShareRenderTimeline(walletSet.shares[walletShareId]);
/**
 * The rendered timeline is ordered from oldest to newest activity. Each event
 * has a type of "creation", "action", or "proposal". Events contain reference
 * to data structures within the wallet share, so mutations may corrupt the
 * timeline; consider using `structuredClone` to make a copy of an event before
 * performing mutations.
 */
const exampleTimeline = [
  {
    timestamp: 1668513600000,
    type: 'creation',
    creation: {
        // ...
      },
    },
  },
  {
    timestamp: 1676462400000,
    type: 'action',
    action: {
      // ...
    },
    impact: {}
  },
  {
    timestamp: 1681560000000,
    type: 'action',
    action: {
      // ...
    },
    impact: {}
  },
  {
    timestamp: 1684152000000,
    type: 'proposal',
    proposal: {
      // ...
    },
  },
];

```

# Create a Transaction

- create proposal from PayPro URI
- fund with selected P2PKH wallet
- sign proposal, returning TX

# Create a Wallet Invitation

# Join a Wallet Invitation

# Archive a Wallet

(Splitting and Merging Wallet Sets)

By design, wallet sets do not support an "archived" class of wallets; instead, wallets should be archived by partitioning the wallet set into separate "active" and archived wallet sets.

# Import a Wallet

- `walletSetImportWallet`
- `walletSetUpdateUserAgent`

---

```ts
const walletSet = createWalletSet();

const walletSetWithKey =

// const wallets = createWalletSet([wallet]);
```

```ts
const wallets = importWalletSet({
  secret: secretJson, // key material; requires the best possible security
  private: privateJson, // all other material; compromise only impacts privacy
});

// create and import a new key
```
