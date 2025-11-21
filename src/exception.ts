export class NetworkException extends Error {
  public readonly status?: number;
  public readonly type?: string;

  constructor(message: string, type?: string | null, status?: number | null) {
    const finalMessage =
      status !== null && status !== undefined
        ? `${message} (HTTP ${status}/${type ?? "unknown"})`
        : message;

    super(finalMessage);

    this.name = this.constructor.name;
    this.status = status ?? undefined;
    this.type = type ?? undefined;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static create(message: string, type: string, status: number): NetworkException {
    const finalMessage = message.trim() === "" ? "No message was provided" : message;

    if (status === 401 || status === 429) {
      return new AccountException(finalMessage, type, status);
    } else if (status >= 400 && status <= 499) {
      return new ClientException(finalMessage, type, status);
    } else if (status >= 500 && status <= 599) {
      return new ServerException(finalMessage, type, status);
    } else {
      return new NetworkException(finalMessage, type, status);
    }
  }
}

export class AccountException extends NetworkException {}

export class ClientException extends NetworkException {}

export class ServerException extends NetworkException {}
