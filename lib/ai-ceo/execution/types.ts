import "server-only";

export type ExecutionPayload =
  Record<string, unknown>;

export type ExecutionResult = {
  success: boolean;
  completed: boolean;
  message: string;
  data?: Record<
    string,
    unknown
  >;
};

export type ExecutionContext = {
  recommendationId: string;
  executionType: string;
  payload: ExecutionPayload;

  recommendation?: Record<
    string,
    unknown
  >;

  metadata?: Record<
    string,
    unknown
  >;
};

export type ExecutionHandler = (
  context: ExecutionContext
) => Promise<ExecutionResult>;

export type ExecutionHandlerRegistration = {
  executionType: string;
  handler: ExecutionHandler;

  department:
    | "payments"
    | "seo"
    | "growth"
    | "prediction"
    | "marketing"
    | "revenue"
    | "system"
    | "general";

  description: string;

  requiresApproval: boolean;

  producesFinalAction: boolean;
};

export type ExecutionRegistry = Map<
  string,
  ExecutionHandlerRegistration
>;