**This documentation is being written prior to implementation, much of the below functionality is not yet available.**

# Libauth Wallet Engine

The **Libauth Wallet Engine** is a compiler and set of utility functions that enables wallet software to create and use any kind of wallet or decentralized application protocol on Bitcoin Cash and Bitcoin Cash-like cryptocurrency networks.

## Wallets

A Libauth **`Wallet`** is a collection of data needed to generate receiving addresses and sign transactions which spend from those addresses. Wallets can be held using a single device ("single-entity" wallets) or they can be distributed across multiple devices ("multi-entity" wallets).

Single-entity wallets are typically very simple and require no additional communication or validation during wallet or transaction creation. Libauth includes simple utilities for creating and managing the most common wallet type, a single-entity, **Pay to Public Key Hash (P2PKH)** wallet. For all other kinds of wallets – including multi-entity wallets – Libauth provides a comprehensive, generalized wallet engine.

## Wallet Engine

Practically all cryptocurrency software uses hard-coded wallet implementations. To support new kinds of wallets, developers must carefully implement the new specification, test and review the implementation thoroughly, then release a new version of the software to give users access to the new functionality.

Libauth takes a very different approach: Libauth's wallet engine is fully generalized, allowing developers or end users to define, instantiate, and operate any kind of wallet using the same set of utility functions.

This is made possible by Libauth **wallet templates** – concise specifications which allow wallet software to understand how to create and spend from new types of addresses.

Compatible wallet software can create and join new types of wallets, generate addresses, and collaboratively sign transactions with other wallet software, **including wallet software produced by different vendors**.

## Template Creation & Validation

Libauth wallets are created from wallet templates – JSON files that can be developed and reviewed independently of wallet software.

This separation allows wallet software to be adapted to new use cases quickly and at lower risk of implementation bugs (wallet software developers are not required to deeply understand and re-implement each new protocol).

Wallet software which targets advanced users can even expose the template infrastructure to end users, allowing them to import trusted templates and participate in new types of wallets without updates to the underlying wallet software.

### Template Authoring

Templates contain all the information needed by wallet applications to properly create and use a particular wallet protocol – templates include details required by each wallet party ("entity") including:

- the amount of key material required (and derivation paths, if applicable)
- any data which must be collected from the user
- instructions for compiling each possible locking bytecode (address) type,
- instructions for compiling the unlocking bytecode for each

Templates can also include comments and debugging information for auditing their behavior and security.

The Libauth template format is designed to 1) encode any possible multi-party wallet protocol, and 2) maximize portability between wallet software implementations. The format is easy to parse and statically analyze, and all computations are contained using the BCH VM – ensuring untrusted templates can be evaluated safely and allowing template compilers to reuse significant portions of existing code.

Templates are specified in JSON following the [JSON schema defined in Libauth](https://libauth.org/schema/v2/wallet-template.schema.json).

[Bitauth IDE](https://github.com/bitauth/bitauth-ide) is a low-level environment specifically designed for developing and auditing these templates, but higher-level tools like CashScript and Spedn can also be modified to output templates, taking advantage of Libauth's engine for wallet creation and management.

### Template Validation

Since templates can be shared between wallet software implementations, developers should generally avoid creating new templates and instead seek to use established, widespread, well-reviewed templates in their software.

When a new use case requires template development, the new template should typically be developed and reviewed independently of any particular wallet software. Template projects must version their releases, and each release must explicitly list the previous releases with which it is compatible.

Before using a new template, developers and/or end users should ensure the template has been audited for security to the extent required for their use case. If a template is poorly-designed or malicious, all funds entrusted to it may be at risk of loss.

Additionally, before creating a wallet from a user-provided template, wallet software can use the `testWalletTemplate` method to ensure the template is free of automatically-detectible errors:

```ts
// template-validation.js
import { importWalletTemplate, testWalletTemplate } from '@bitauth/libauth';

import myTemplate from 'my-template.json' assert { type: 'json' };
const template = importWalletTemplate(myTemplate);

/**
 * Libauth includes a simple utility to test that a template's scripts behave as
 * expected. This is no substitute for a proper security audit, but it can offer
 * some protection for users who develop their own templates.
 */
const testResult = testWalletTemplate(template);
if (typeof testResult === string)
  throw new Error(
    `Template failed basic testing. Funds entrusted to this template may be lost: ${testResult}`,
  );
```

<!-- TODO: encourage template projects to Bitauth-sign releases on chain -->
