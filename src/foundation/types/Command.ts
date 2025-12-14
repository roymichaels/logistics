export interface Command<TPayload = unknown> {
  type: string;
  payload: TPayload;
  metadata?: {
    userId?: string;
    businessId?: string;
    timestamp: number;
    correlationId?: string;
  };
}

export interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type CommandHandler<TCommand extends Command = Command, TResult = unknown> = (
  command: TCommand
) => Promise<CommandResult<TResult>>;
