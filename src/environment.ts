export type EnvironmentType = "prod" | "dev";

export class Environment {
  constructor(public readonly value: EnvironmentType) {}

  getMobilePaymentUrl(): string {
    return `${this.getBaseUrl()}/paymentService`;
  }

  getPayoutUrl(): string {
    return `${this.getBaseUrl()}/merchantPayOutService`;
  }

  getCheckStatusUrl(orderNumber: string): string {
    return `${this.getBaseUrl()}/check/${encodeURIComponent(orderNumber)}`;
  }

  getCardPaymentUrl(): string {
    return this.value === "prod"
      ? "https://cardpayment.flexpay.cd/v1.1/pay"
      : "https://beta-cardpayment.flexpay.cd/v1.1/pay";
  }

  private getBaseUrl(): string {
    return this.value === "prod"
      ? "https://backend.flexpay.cd/api/rest/v1"
      : "https://beta-backend.flexpay.cd/api/rest/v1";
  }
}
