export type DraftTransaction = {
  todo: '';
};

/**
 * A shared workspace in which transactions can be drafted and incrementally
 * signed for a particular wallet action.
 */
export type TransactionProposal = {
  /**
   * An index of unspent transaction outputs (UTXOs) used in this draft
   * transaction set. This primarily enables offline signing by entities without
   * requiring those entities to look up UTXO information.
   *
   * UTXO identifiers are strings composed of a
   * hex-encoded transaction ID concatenated with `:` and the output index,
   * e.g. `f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16:0`.
   *
   * UTXO values are hex-encoded in network transaction format, i.e. beginning
   * with the encoded `valueSatoshis` and continuing through `lockingBytecode`
   * (including the the token prefix, if applicable).
   */
  utxos: {
    [utxoId: string]: string;
  };
  /**
   * A mapping of template identifiers used by this draft transaction set
   * to the version hash of the templates they reference. Template IDs may use
   * any valid identifier; version hashes must be the hex-encoded `versionHash`
   * produced by {@link importWalletTemplate} (or the higher-level
   * {@link importWallet}).
   */
  templates: {
    [templateId: string]: string;
  };
  /**
   * TODO: actions are contiguously indexed in the order they're created
   */
  actions: {
    [index: number]: {
      template: string;
      actionId: string;
      data: { [variableId: string]: string };
      /**
       * TODO: map of action transaction IDs to draft transaction IDs
       */
      transactions: {
        [actionTransactionId: string]: string;
      };
    };
  };
  /**
   * A mapping of draft transaction IDs to {@link DraftTransaction}s. IDs may be
   * any valid identifier, and draft transactions may reference each other by
   * these identifiers.
   */
  transactions: {
    [draftTransactionId: string]: DraftTransaction;
  };
};
