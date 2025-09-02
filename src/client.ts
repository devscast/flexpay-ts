import type { z } from "zod";

import { Environment, EnvironmentType } from "@/environment";
import { AccountException, ClientException, NetworkException } from "@/exception";
import {
  CardRequest,
  CardRequestSchema,
  CardResponse,
  CardResponseSchema,
  CheckResponse,
  CheckResponseSchema,
  Credential,
  CredentialSchema,
  MobileRequest, MobileRequestSchema,
  MobileResponse,
  MobileResponseSchema,
  PayoutRequest,
  PayoutRequestSchema,
  PayoutResponse,
  PayoutResponseSchema,
  Status,
} from "@/schemas";

export class Client {
  private readonly credential: Credential;
  private readonly env: Environment;

  constructor(merchant: string, token: string, env: EnvironmentType = "dev") {
    this.credential = CredentialSchema.parse({ merchant, token });
    this.env = new Environment(env);
  }

  async mobile(request: MobileRequest): Promise<MobileResponse> {
    const body = {
      ...MobileRequestSchema.parse(request),
      merchant: this.credential.merchant,
    };
    const data = await this.requestJson("POST", this.env.getMobilePaymentUrl(), body);

    return this.parseWith(MobileResponseSchema, data);
  }

  async card(request: CardRequest): Promise<CardResponse> {
    const body = {
      ...CardRequestSchema.parse(request),
      merchant: this.credential.merchant,
      authorization: `Bearer ${this.credential.token}`,
    };
    const data = await this.requestJson("POST", this.env.getCardPaymentUrl(), body);

    return this.parseWith(CardResponseSchema, data);
  }

  async pay(request: MobileRequest | CardRequest): Promise<MobileResponse | CardResponse> {
    if (typeof (request as any).phone === "string") return this.mobile(request as MobileRequest);
    if (typeof (request as any).homeUrl === "string") return this.card(request as CardRequest);
    throw new Error("Unsupported request shape");
  }

  async check(orderNumber: string): Promise<CheckResponse> {
    const data = await this.requestJson("GET", this.env.getCheckStatusUrl(orderNumber));

    return this.parseWith(CheckResponseSchema, data);
  }

  async payout(request: PayoutRequest): Promise<PayoutResponse> {
    const body = {
      ...PayoutRequestSchema.parse(request),
      merchant: this.credential.merchant,
    };
    const data = await this.requestJson("POST", this.env.getPayoutUrl(), body);

    return this.parseWith(PayoutResponseSchema, data);
  }

  handleCallback(data: any): MobileResponse {
    return this.parseWith(MobileResponseSchema, data);
  }

  isSuccessful(response: { code: Status }): boolean {
    return response.code === Status.SUCCESS;
  }

  private async requestJson(method: "GET" | "POST", url: string, jsonBody?: unknown): Promise<any> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      // Parity with PHP client (auth_bearer); also most FlexPay endpoints expect Bearer
      Authorization: `Bearer ${this.credential.token}`,
    };

    const maxRetries = 3;
    const baseDelayMs = 500;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers,
          body: method === "POST" ? JSON.stringify(jsonBody ?? {}) : undefined,
        });

        const contentType = response.headers.get("content-type") || "";
        const isJson = contentType.includes("application/json");
        let payload: any = {};
        if (isJson) {
          try {
            payload = await response.json();
          } catch {
            payload = {};
          }
        }

        if (!response.ok) {
          // Mimic PHP error mapping via NetworkException::create
          const message = (payload && (payload.message as string)) || "";
          const type = (payload && (payload.error as string)) || "unknown";
          const status = response.status;

          // Throw mapped subclasses (Account/Client/Server/Network)
          throw NetworkException.create(message, type, status);
        }

        return payload;
      } catch (err: any) {
        // Network errors or thrown mapped exceptions
        // If it's already one of our mapped exceptions, don't retry on 4xx.
        if (
          err instanceof AccountException ||
          err instanceof ClientException ||
          (err instanceof NetworkException && typeof err.status === "number" && err.status >= 400 && err.status < 500)
        ) {
          // No retry on 4xx equivalents
          throw err;
        }

        // Retry on network/5xx errors
        if (attempt < maxRetries) {
          const delay = baseDelayMs * Math.pow(2, attempt); // 500, 1000, 2000
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        // Final failure: if it's a native fetch error, wrap it
        if (!(err instanceof NetworkException)) {
          throw new NetworkException(err?.message ?? "Network error");
        }
        throw err;
      }
    }

    throw new NetworkException("Unexpected request flow");
  }

  private parseWith<S extends z.ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
    return schema.parse(data);
  }
}
