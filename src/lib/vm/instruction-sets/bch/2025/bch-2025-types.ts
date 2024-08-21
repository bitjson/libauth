import type {
  AuthenticationProgramBch,
  AuthenticationProgramStateBch,
  AuthenticationProgramStateResourceLimits,
  AuthenticationVirtualMachine,
  ResolvedTransactionBch,
} from '../../../../lib.js';

export type AuthenticationProgramStateResourceLimitsBch2025 =
  AuthenticationProgramStateResourceLimits & {
    metrics: {
      /**
       * The cumulative cost of all operations executed over the course of
       * verifying the transaction; the sum of `arithmeticCost`,
       * `executedInstructionCount`, `64 * hashDigestIterations`,
       * and `stackPushedBytes`.
       */
      operationCost: number;
    };
  };

export type AuthenticationProgramStateBch2025 = AuthenticationProgramStateBch &
  AuthenticationProgramStateResourceLimitsBch2025;

export type AuthenticationVirtualMachineBch2025 = AuthenticationVirtualMachine<
  ResolvedTransactionBch,
  AuthenticationProgramBch,
  AuthenticationProgramStateBch2025
>;
