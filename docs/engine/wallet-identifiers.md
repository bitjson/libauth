# Libauth Wallet Identifiers

Libauth wallet identifiers are used to identify a specific wallet instance in communications among wallet entities. Identifiers are encoded using the CashAddress format with the prefix `libauth_wallet_seal` and version `0`.

During the wallet invitation process, wallet identifiers may be exchanged with the prefix included, e.g. `libauth_wallet_seal:qr6psn79jeqrh8trs7pu74adlex8t3s97c6kl0y3xwznp6vrr60pvxsclfvc6`; within Libauth wallet engine data structures, the prefix is excluded (but remains verifiable via the checksum), e.g. `qr6psn79jeqrh8trs7pu74adlex8t3s97c6kl0y3xwznp6vrr60pvxsclfvc6`.
