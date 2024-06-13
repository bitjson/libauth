**Pending deletion; [wallet sets](./wallet-sets.md) are the recommended way to work with Libauth wallets.**

## Wallet Creation

To create a wallet, one of the participants must create an initial `WalletInvitation`, indicating which role they will play and providing the required `variables` for that entity:

```ts
// join-wallet-participant-1.js

import {
  createWalletInvitation,
  exportWalletInvitation,
  importWalletTemplate,
} from '@bitauth/libauth';
import myTemplateJson from 'my-template.json' assert { type: 'json' };

import { storeInvitationDetails, displayMessage } from './my/app';

const template = importWalletTemplate(myTemplateJson);

/**
 * We could also prompt the user to select from a list, e.g.:
 * `const entityId = myPromptMethod(Object.entries(template.entities));`
 */
const entityId = 'owner';

/**
 * Wallet software which supports template imports should read from
 * `template.entities[entityId].variables` to identify the template's
 * requirements for the selected entity. Also consider using
 * `testWalletTemplate` when importing a user-defined template.
 */
const variables = { hdKeys: { owner: 'xprv123456...' } };

const invitation = createWalletInvitation({ template, entityId, variables });
if (typeof invitation === 'string')
  throw new Error(`Error creating wallet invitation: ${invitation}`);

/**
 * Both `variables` and `invitation` must be saved locally. Consider using
 * `invitation.invitationId` as a key.
 */
await storeInvitationDetails(invitation.invitationId, variables, invitation);

/**
 * To minimize the risk of implementation vulnerabilities, Libauth provides
 * matching export and import functions for all wallet-related data structures.
 */
const invitationJson = exportWalletInvitation(invitation);

/**
 * We can use the `invitation.missing` object to identify `entities` which still
 * need join the invitation.
 */
const missingEntityNames = invitation.missing.entities.map(
  (entity) => entity.name,
);

displayMessage(`
Wallet invitation created. To continue, send this invitation to:
${new Intl.ListFormat('en').format(missingEntityNames)}

Invitation:
${invitationJson}`);
```

The exported `WalletInvitation` is a JSON-formatted data structure which contains the full template, a public key which will be used to authenticate future wallet-related messages, and all variable information to be shared with the other entities.

### Joining Wallet Invitations

The exported wallet invitation can then be imported by another participant:

```ts
// join-wallet-participant-2.js

import {
  exportWalletInvitation,
  joinWalletInvitation,
  importWalletInvitation,
} from '@bitauth/libauth';
import {
  loadKnownTemplate,
  getInvitationSomehow,
  sendToOtherParticipants,
  storeInvitationDetails,
} from './my/app';

const invitationJson = await getInvitationSomehow();

const invitation = importWalletInvitation(invitationJson);
if (typeof invitation === 'string')
  throw new Error(`Error parsing invitation: ${invitation}`);

/**
 * It is security-critical that implementations only join wallets with
 * previously-known templates. Even for applications supporting user-defined
 * templates, consider requiring that users import templates separately from the
 * wallet-joining process.
 *
 * `invitation.template.versionHash` (which is computed and added to the parsed
 * invitation by `importWalletInvitation`) can be safely used to compare the
 * invite's template with previously-known templates.
 */
const template = loadKnownTemplate(invitation.template.versionHash);
if (typeof template === 'string')
  throw new Error(
    `This invitation uses an unknown template which could put funds in the new wallet at risk. To ignore this warning, import the template in Advanced Settings.`,
  );

const entityId = 'trusted_party';
const variables = { hdKeys: { owner: 'xprv234567...' } };

/**
 * Note, `joinWalletInvitation` requires the `template` to be provided for
 * verification. This value should be loaded from your application rather than
 * from the invitation.
 */
const updatedInvitation = joinWalletInvitation({
  invitation,
  template,
  entityId,
  variables,
});
if (typeof updatedInvitation === 'string')
  throw new Error(`Error joining wallet invitation: ${updatedInvitation}`);

await storeInvitationDetails(
  updatedInvitation.invitationId,
  variables,
  updatedInvitation,
);

const updatedInvitationJson = exportWalletInvitation(updatedInvitation);
await sendToOtherParticipants(updatedInvitationJson);
```

### Merging Wallet Invitations

Wallet invitations can be joined asynchronously and merged later so long as they don't conflict (each participant must join as a different entity). For example, if the second and third participants each join and return the invitation sent by the original creator:

```ts
// creator.js
import {
  exportWalletInvitation,
  importWalletInvitation,
  mergeWalletInvitations,
} from '@bitauth/libauth';

import { getInvitationsSomehow } from './my/application';

const [invitationJsonAB, invitationJsonAC] = await getInvitationsSomehow();

const iAB = importWalletInvitation(invitationJsonAB);
if (typeof iAB === 'string')
  throw new Error(`Invalid invitation returned by participant 2: ${iAB}`);

const iAC = importWalletInvitation(invitationJsonAC);
if (typeof iAC === 'string')
  throw new Error(`Invalid invitation returned by participant 3: ${iAC}`);

const finalInvitation = mergeWalletInvitations(iAB, iAC);
if (typeof finalInvitation === 'string')
  throw new Error(`Error merging wallet invitations: ${finalInvitation}`);

const finalInvitationJson = exportWalletInvitation(finalInvitation);
```

### Creating Wallets and Verifying Security Seals

Once the wallet invitation has been joined by all participants, it can be converted into a `Wallet`, a data structure which encodes all the information required for this entity to use the wallet.

Before continuing, **each entity must verify that their computed "security seal" matches that of the other entities**. This measure prevents man-in-the-middle (MITM) attacks whereby an attacker – possibly one of the other entities – maliciously modifies the invitation to mislead one or more entities, ultimately allowing the attacker to steal or destroy funds.

The `securitySeal` is a `string` beginning with `security-seal:` which encodes a hash of the wallet's `shared` information using the `CashAddressFormat`.

```ts
// every-participant-after-complete.js

import {
  importWalletInvitation,
  walletInvitationToWallet,
} from '@bitauth/libauth';

import { getInviteInfoSomehow, verifySecuritySeal } from './my/app';

const finalInvitation = importWalletInvitation(finalInvitationJson);

if (finalInvitation.complete !== true)
  throw new Error('Expected a completed wallet invitation.');

/**
 * If this participant is actively joining multiple wallets, they may need to
 * look up the relevant details by invitation ID.
 */
const invitationId = finalInvitation.invitationId;
const { myVariables, joinedInvitation } = getInviteInfoSomehow(invitationId);

/**
 * For verification, this method requires each entity to provide both their
 * previously provided `variables` and the `invitation` resulting from when they
 * initially joined. This ensures that an attacker did not modify the invitation
 * after they joined (and provides enough detail to produce useful error
 * messages if the final invitation has been corrupted).
 */
const { wallet, securitySeal } = walletInvitationToWallet({
  finalInvitation: finalInvitation,
  joinedInvitation: joinedInvitation,
  variables: myVariables,
});
if (typeof wallet === 'string')
  throw new Error(`Wallet cannot be created: ${wallet}`);

if ((await verifySecuritySeal(securitySeal)) === 'false')
  throw new Error(
    `Security alert: this wallet is compromised and must be recreated.`,
  );
```

If all entities can verify that their security seals match, the wallet has been successfully created.

### Backing Up Wallets

All material required to reproduce and use a wallet is contained in the `Wallet` data structure, which is further divided into `wallet.entityId`, `wallet.secret`, and `wallet.shared`.

The `entityId` string indicates what role this participant plays in the wallet.

The `secret` object contains key material which is (and should remain) unknown to the other entities. This should be saved to the current device in the most secure possible way.

While some wallet templates are designed to not require additional backups of `secret`s (e.g. wallets with multiple fallback spending strategies), it's valuable for generalized wallets to provide users with additional wallet `secret` backup options. Consider using `walletToWrittenBackupSecret` to produce a well-formatted, text-based backup message for users to write and store securely.

The `shared` object contains the wallet's `template` and all material which is shared among the wallet entities (derived public keys, `WalletData`, and `AddressData`). Publicly divulging this object would eliminate wallet privacy, but should not put funds at risk.

```ts
// continued from every-participant-after-complete.js

import { saveToLocalSecureStorage, saveToCloudStorage } from './my/app';

/**
 * TODO: gc?
 *
 * Note, security seals are also useful as a deterministic, collision-resistant
 * shared identifier for wallets.
 *
 * Wallet invitation UUIDs (`WalletInvitation.invitationId`) are set by the
 * invitation's creator and can therefore experience collisions (due to faulty
 * or malicious random number generation); security seals cannot experience
 * collisions unless the device is participating as multiple entities in the
 * same wallet (if this is possible, append `wallet.entityId` to the identifier
 * to prevent collisions).
 */
// const walletId = `${securitySeal}_${wallet.entityId}`;

// export each object as a JSON-encoded string:
const { secret, shared } = exportWallet(wallet);

/**
 * A Wallet's ID is a deterministic, collision-resistant shared identifier for
 * the wallet.
 *
 * Note, it's wise to implement secret storage such that the same device can
 * safely participate as multiple entities, e.g. save the secret to the key
 * `${wallet.id}_${wallet.entityId}` rather than `wallet.id` alone. This ensures
 * that the secret data for one entity isn't inadvertently overwritten with the
 * secret data for another entity.
 */
await saveToLocalSecureStorage(wallet.id, wallet.entityId, secret);
await saveToCloudStorage(wallet.id, shared);

console.log(
  `Carefully write the below backup information on paper using graphite or archival ink, then store the paper securely. To avoid loss of funds, do not share this information with anyone, and do not print or save it digitally:`,
);
console.log(encodeWrittenBackupSecret(wallet.secret));

// Later...

/**
 * To re-instantiate the wallet, import an object with the `entityId` and the
 * JSON-encoded `secret` and `shared` strings:
 */
const wallet = importWallet({
  entityId: entityIdString,
  secret: secretJson,
  shared: sharedJson,
});
```

#### Why Backup `wallet.shared` in addition to `wallet.secret`?

**An HD key alone is almost never a sufficient backup for a wallet**.

While most single-entity wallets (P2PKH) are similar enough that they can be recovered from a "wallet backup" (e.g. a BIP39 mnemonic seed phrase) without knowing which wallet software produced the backup, backup strategies for practically all multi-entity wallets must account for **shared, non-key material**.

For example, a standard 2-of-3 P2SH wallets can be spent using 2 signatures from any of the 3 participants. However, transactions from a 2-of-3 P2SH wallet **must also include the public keys of the other, non-signing participants** to be valid. While this is typically not a problem, if signer 3 loses their private key and both other signers are forced to restore from a backup, if none of the participants have a record of signer 3's public key, **the funds are lost**. While the participants have the 2 required private keys, they lack some critical information required to create transactions.

Existing wallets solve this problem by saving required non-key (`shared`) material to a server (managed by the wallet software vendor), saving it to the user's account with a cloud backup service, or emailing it to the user. One or more of these strategies may also suit your use case.

## Allocating Addresses

With the `Wallet` created, it's now possible to allocate addresses. A wallet includes two kinds of addresses:

1. **assigned addresses** – Assigned addresses should be allocated any time the entity requires an address, e.g. displaying an address or QR code, sharing an address over a network, etc. These addresses are generated from locking scripts which are assigned to the entity. (Templates may assign only one locking script to each entity.)
2. **supported addresses** – Supported addresses can be spent by this entity and should be included in the wallet's "balance" in user interfaces, but they should never be directly distributed by this entity. The `assigned`/`supported` distinction is useful for preventing address re-use between entities, e.g. by two co-owners handing out addresses simultaneously. Supported addresses are generated from the locking scripts unlocked by each unlocking script assigned to the entity (excluding `assigned` addresses).

To allocate addresses, provide the `Wallet` and an array of `AddressDescription`s to `allocateWalletAddresses`:

```ts
// allocate-address.js
import {
  importWallet,
  allocateWalletAddresses,
  applyWalletAction,
  lockingBytecodeToCashAddress,
} from '@bitauth/libauth';

import { setDisplayedAddress, sendToOtherDevices, saveWallet } from './my/app';

const wallet = importWallet({
  entityId: 'signer_1',
  secret: secretJson,
  shared: sharedJson,
});
const addressDescriptions = [
  { timestamp: Date.now(), description: 'Lunch with Bob' },
];
const allocate = allocateWalletAddresses({ wallet, addressDescriptions });
if (typeof allocate === 'string')
  throw new Error(`Could not allocate addresses: ${addresses}`);

setDisplayedAddress(
  lockingBytecodeToCashAddress(allocate.addresses[0].lockingBytecode),
);

/**
 * Modifying a wallet always creates a `WalletAction` – in multi-entity
 * wallets, these should be shared with other entities.
 *
 * While address allocation does not require acceptance by other entities,
 * sharing this proposal allows other entities to apply it to their view of the
 * wallet, maintaining consistency of the `wallet.shared` backup (which now
 * includes a description for the newly-allocated address).
 */
await sendToOtherDevices(allocate.walletAction);
/**
 * Unlike most Libauth functions, `applyWalletAction` directly modifies the
 * provided `wallet` to reduce the computation and memory cost of applying
 * wallet actions. To avoid mutating `wallet`, use `cloneWallet(wallet)`.
 */
applyWalletAction(wallet, allocate.walletAction);
await saveWallet(wallet);
```

The `allocateWalletAddresses` function modifies the provided `Wallet` to allocate the addresses and document the provided address descriptions. As with all actions that modify a wallet, this produces a `WalletActionProposal` which must be shared with the other entities (continue to [Creating Transactions](#creating-transactions) for details).

The modified wallet should be [persisted to storage and/or backed up](#backing-up-wallets) to preserve the new address description(s). Note that address allocation can only impact `wallet.shared` data, so `wallet.secret` does not need to be backed up again.

## Fetching Unspent Transaction Outputs (UTXOs)

To determine the wallet's current assets and create new transactions, implementations must first fetch the wallet's Unspent Transaction Outputs (UTXOs).

From the perspective of each entity, a wallet can include three categories of UTXOs:

1. **assigned UTXOs** - UTXOs that match **assigned addresses**.
2. **supported UTXOs** - UTXOs that match **supported addresses**.
3. **external UTXOs** - UTXOs that match addresses and token categories required by the entity's `trackUtxos` property in the wallet template. These UTXOs can be understood by the wallet, but they aren't necessarily under the control of the tracking entity; i.e. naively sending funds to the addresses in these UTXOs would often result in losses. External UTXOs are tracked to enable wallets to perform various wallet "actions" in complex contract systems and decentralized application (see [Wallet Actions](#wallet-actions)).

All assets held in both `assigned` and `supported` UTXOs are considered **owned** by the wallet, and **should be represented as part of the wallet's balance(s) in user interfaces**.

Assets held by `external` UTXOs cannot be attributed in a generalized way, but some wallet templates define strategies for extracting additional, application-specific information from these UTXOs, e.g. latest price, market depth and order book data, open interest, voting data, etc. Implementations may use this additional data to design specialized user experiences for these wallet templates.

The below example demonstrates fetching all UTXOs and calculating a wallet's balance using the information from `wallet.allocated`:

```ts
// fetch-utxos.js
import { importWallet } from '@bitauth/libauth';

import { fetchUTXOsFromChaingraph, saveUtxos, updateBalance } from './my/app';

const wallet = importWallet({
  entityId: 'signer_1',
  secret: importWalletSecretData(secretJson),
  shared: importWalletSharedData(sharedJson),
});

const owned = [
  /**
   * `wallet.addresses.assigned` is a simple array of `WalletAddress`es.
   */
  ...wallet.addresses.assigned,
  /**
   * `wallet.addresses.supported` is a map of locking script IDs to
   * `WalletAddress` arrays: `{ [lockingScriptId: string]: WalletAddress[] }`.
   */
  ...wallet.addresses.supported.flat(),
].map((addr) => addr.lockingBytecode);

/**
 * This hypothetical method fetches all UTXOs required in the operation of this
 * wallet (including external UTXOs). All UTXOs will be saved, but only the
 * "owned" UTXOs will be used in the balance calculation.
 */
const utxos = await fetchUTXOsFromChaingraph({
  lockingBytecodeValues: [
    ...owned,
    /**
     * Like `wallet.addresses.supported`, `wallet.external.addresses` is a map
     * of locking script IDs to `WalletAddress` arrays.
     */
    ...wallet.external.addresses.flat().map((addr) => addr.lockingBytecode),
  ],
  tokenCategories: wallet.external.tokenCategories,
});
await saveUtxos(utxos);

/**
 * Compute the total value in satoshis held by this wallet's UTXOs.
 */
const balanceSatoshis = utxos.reduce(
  (sum, utxo) =>
    owned.includes(utxo.lockingBytecode) ? sum + utxo.valueSatoshis : sum,
  0,
);
updateBalance(balanceSatoshis);
```

## Creating Transactions

- `createWalletActionProposal(wallet, actionId)`
- `cloneWalletActionProposal(proposal)`, `cloneWalletAction(action)`
- (mutates) `walletActionProposalSelectUtxos(proposal, coins): { usedCoins: string[] } | string[]`
- `exportWalletActionProposal(proposal)`
- `importWalletActionProposal(proposal)`
- (mutates) `walletActionProposalResolveConstraints(proposal: WalletActionProposal): true | string[]` - tries to reify any remaining constraints or return errors describing the issue
- (mutates) `walletActionProposalFinalize(proposal: WalletActionProposal): {action: WalletAction, proposal?: WalletActionProposal} | string[];` pop out completed actions

---

TODO: "wallet extension" -> "newAddresses" portion of `WalletActionProposal`, `applyWalletAction`

## Extending Wallets

While many templates are designed to create wallets with a practically-unlimited number of addresses using Hierarchical-Deterministic (HD) Keys ([BIP32](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki)), some templates require additional information to create each address (templates which employ `AddressData` or non-HD `Key` variables).

Wallets relying only on wallet-wide data can typically derive up to `2,147,483,648` addresses, while wallets which rely on address-specific data can derive only the number of addresses prepared via the initial `WalletInvitation`. To determine the count of available and used addresses, use `countAvailableWalletAddresses` and `countUsedWalletAddresses` respectively, e.g.:

```ts
// count-wallet-addresses.js
import {
  countAvailableWalletAddresses,
  countUsedWalletAddresses,
  importWallet,
} from '@bitauth/libauth';

const wallet = importWallet({
  entityId: 'owner',
  secret: secretJson,
  shared: sharedJson,
});

/**
 * Returns the number of addresses which can be derived given the data currently
 * contained in the wallet.
 */
const totalAddresses = countAvailableWalletAddresses(wallet);
/**
 * Returns the number of addresses which have already been marked as allocated
 * in this wallet.
 */
const usedAddresses = countUsedWalletAddresses(wallet);
if (usedAddresses >= totalAddresses)
  throw new Error('This wallet must be extended to generate a new address.');
```

If a wallet has exhausted its available addresses, it must be **extended** to accommodate additional addresses.

A `WalletExtension` is similar to a `WalletInvitation` but operates on an existing wallet: each entity must contribute its variables for the additional addresses, but the finalized extension does not necessarily require re-verifying the wallet's security seal. (Messages between entities can be signed with previously-verified keys to prevent MITM attacks, though this functionality is not currently built into Libauth.)

To extend a wallet, one of the participants creates and shares a `WalletExtension` for the new address(es) with each other participant. Once each participant has received the finalized extension, they can safely extend their `Wallet` and derive the new address(es).

For example, to extend a wallet with an `AddressData` variable of ID `oracle_claim`:

```ts
// extend-wallet-organizer.js
import {
  createWalletExtension,
  exportWalletExtension,
  importWallet,
} from '@bitauth/libauth';

const wallet = importWallet({
  entityId: 'organizer',
  secret: secretJson,
  shared: sharedJson,
});

/**
 * This example creates a `WalletExtension` with one new address, providing a
 * value for the `AddressData` variable with an ID of `oracle_claim`.
 */
const extension = createWalletExtension({
  newAddresses: [{ bytecode: { oracle_claim: '012345' } }],
  wallet,
});
if (typeof extension === 'string')
  throw new Error(`Could not create wallet extension: ${extension}`);

const extensionJson = exportWalletExtension(extension);
```

### Joining Wallet Extensions

When another participant receives the exported `extensionJson`, they can **join** the wallet extension (much like they joined the wallet invitation):

```ts
// extend-wallet-signer-1.js
import {
  exportWalletExtension,
  importWallet,
  importWalletExtension,
  joinWalletExtension,
} from '@bitauth/libauth';

const wallet = importWallet({
  entityId: 'signer_1',
  secret: secretJson,
  shared: sharedJson,
});

/**
 * Parse and validate the `WalletExtension`.
 */
const extension = importWalletExtension({ extensionJson, wallet });
if (typeof extension === 'string')
  throw new Error(`Invalid wallet extension: ${extension}`);

/**
 * Add a `Key` (`signer_1_key`) required from this entity (`signer_1`):
 */
const updatedExtension = joinWalletExtension({
  extension,
  newAddresses: [{ keys: { privateKeys: { signer_1_key: '010203...' } } }],
  wallet,
});
if (typeof updatedExtension === 'string')
  throw new Error(`Failed to join wallet extension: ${updatedExtension}`);

const updatedExtensionJson = exportWalletExtension(updatedExtension);
```

### Merging Wallet Extensions

As with `WalletInvitation`s, `WalletExtension`s can be joined asynchronously and merged:

```ts
// extend-wallet-merge.js
import {
  exportWalletExtension,
  importWallet,
  importWalletExtension,
  joinWalletExtension,
} from '@bitauth/libauth';

const wallet = importWallet({
  entityId: 'organizer',
  secret: secretJson,
  shared: sharedJson,
});

const extension1 = importWalletExtension({ extension1Json, wallet });
if (typeof extension1 === 'string')
  throw new Error(`Invalid extension from signer 1: ${extension1}`);

const extension2 = importWalletExtension({ extension2Json, wallet });
if (typeof extension2 === 'string')
  throw new Error(`Invalid extension from signer 2: ${extension2}`);

const mergedExtension = mergeWalletExtensions(extension1, extension2);
if (typeof mergedExtension === 'string')
  throw new Error(`Could not merge wallet extensions: ${mergedExtension}`);

const mergedExtensionJson = exportWalletExtension(mergedExtension);
```

### Applying Wallet Extensions

Once a wallet extension is finalized, it can be **applied** to a `Wallet`.

**Note: the newly-extended `Wallet` must be backed up again.**

In all cases, the wallet's `shared` material will have been updated for the new addresses. If the wallet extension included `Key` material from this entity, the `secret` must also be [backed up](#backing-up-wallets) again. Old backups remain valid, but can not recover any newly added addresses.

```ts
// every-participant-after-extension.js

import {
  applyWalletExtension,
  importWallet,
  importWalletExtension,
} from '@bitauth/libauth';

import { backupNewWalletMaterial } from './my/app';

const wallet = importWallet({
  entityId: 'signer_1',
  secret: secretJson,
  shared: sharedJson,
});

const extension = importWalletExtension({ finalExtensionJson, wallet });
if (extension.complete !== true)
  throw new Error('Expected a completed wallet extension.');

const wallet = applyWalletExtension({ wallet, extension });
if (typeof wallet === 'string')
  throw new Error(`Wallet extension cannot be applied: ${wallet}`);

/**
 * The wallet must be backed up again after applying a wallet extension.
 */
await backupNewWalletMaterial(wallet);
```
