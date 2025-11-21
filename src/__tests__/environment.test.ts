import { beforeEach, describe, expect, it } from "vitest";

import { Environment } from "../environment";

describe("Environment enum and helper", () => {
  let dev: Environment;
  let prod: Environment;

  beforeEach(() => {
    dev = new Environment("dev");
    prod = new Environment("prod");
  });

  it("should return correct card payment URL", () => {
    expect(prod.getCardPaymentUrl()).toBe("https://cardpayment.flexpay.cd/v1.1/pay");
    expect(dev.getCardPaymentUrl()).toBe("https://beta-cardpayment.flexpay.cd/v1.1/pay");
  });

  it("should return correct mobile payment URL", () => {
    expect(prod.getMobilePaymentUrl()).toBe(
      "https://backend.flexpay.cd/api/rest/v1/paymentService",
    );
    expect(dev.getMobilePaymentUrl()).toBe(
      "https://beta-backend.flexpay.cd/api/rest/v1/paymentService",
    );
  });

  it("should return correct payout URL", () => {
    expect(prod.getPayoutUrl()).toBe(
      "https://backend.flexpay.cd/api/rest/v1/merchantPayOutService",
    );
    expect(dev.getPayoutUrl()).toBe(
      "https://beta-backend.flexpay.cd/api/rest/v1/merchantPayOutService",
    );
  });

  it("should return correct check status URL", () => {
    expect(prod.getCheckStatusUrl("123456")).toBe(
      "https://backend.flexpay.cd/api/rest/v1/check/123456",
    );
    expect(dev.getCheckStatusUrl("123456")).toBe(
      "https://beta-backend.flexpay.cd/api/rest/v1/check/123456",
    );
  });
});
