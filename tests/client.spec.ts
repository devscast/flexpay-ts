import fs from "node:fs";
import path from "node:path";

import {beforeEach, describe, expect, it, vi} from "vitest";

import {Client} from "@/client";
import {Type} from "@/schemas";

function loadFixture(name: string): unknown {
  const p = path.resolve(__dirname, "fixtures", name);
  const raw = fs.readFileSync(p, "utf-8");
  return JSON.parse(String(raw));
}

function mockFetchWithResponse(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
  const {status = 200, headers = {"Content-Type": "application/json"}} = init ?? {};
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  const response = new Response(payload, {status, headers});
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
}

describe("Client", () => {
  let client: Client;

  beforeEach(() => {
    vi.restoreAllMocks();
    client = new Client("ZONDO", "token");
  });

  it("should create a card payment", async () => {
    mockFetchWithResponse(loadFixture("card_success.json"));
    const response = await client.card({
      amount: 1,
      reference: "ref",
      currency: "USD",
      description: "test",
      callbackUrl: "http://localhost:8000/callback",
      approveUrl: "http://localhost:8000/approve",
      cancelUrl: "http://localhost:8000/cancel",
      declineUrl: "http://localhost:8000/decline",
      homeUrl: "http://localhost:8000/home",
    });

    expect(client.isSuccessful(response)).toBe(true);
    expect(response.orderNumber).toBe("O42iABI27568020268434827");
    expect(response.url).toBe("https://gwvisa.flexpay.cd/checkout/bbba6b699af8a70e9cfa010d6d12dba5_670d206b7defb");
  });

  it("should create a payout", async () => {
    mockFetchWithResponse(loadFixture("payout_success.json"));
    const response = await client.payout({
      amount: 10,
      reference: "ref",
      currency: "USD",
      callbackUrl: "http://localhost:8000/callback",
      phone: "243123456789",
      type: Type.MOBILE,
    });

    expect(client.isSuccessful(response)).toBe(true);
    expect(response.message).toBe("Transaction envoyée avec succès.");
    expect(response.orderNumber).toBe("SQeCGunXEGnr243815877848");
  });

  it("should check payment status", async () => {
    mockFetchWithResponse(loadFixture("check_success.json"));
    const response = await client.check("some_order_number");

    expect(client.isSuccessful(response)).toBe(true);
    expect(response.transaction).toBeTruthy();
    expect(response.transaction?.status).toBe(1);
    expect(response.transaction?.reference).toBe("test");
  });

  it("should handle payment status errors", async () => {
    mockFetchWithResponse(loadFixture("check_error.json"));
    const response = await client.check("not_found");

    expect(client.isSuccessful(response)).toBe(false);
    expect(response.transaction).toBeNull();
  });

  it("should create a mobile payment", async () => {
    mockFetchWithResponse(loadFixture("mobile_success.json"));
    const response = await client.mobile({
      amount: 10,
      reference: "ref",
      currency: "USD",
      callbackUrl: "http://localhost:8000/callback",
      phone: "243123456789",
      type: Type.MOBILE,
    });

    expect(client.isSuccessful(response)).toBe(true);
    expect(response.orderNumber).toBe("DtX9SmCYojWW243123456789");
  });

  it("should handle webhooks", () => {
    const data = loadFixture("response_success.json");
    const response = client.handleCallback(data);

    expect(client.isSuccessful(response)).toBe(true);
    expect(response.reference).toBe("ZDN000003");
    expect(response.orderNumber).toBe("UBGC8s9L3VBm243815877848");
  });
});
