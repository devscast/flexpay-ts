import fs from "node:fs";
import path from "node:path";

import {beforeEach, describe, expect, it, vi} from "vitest";

import {Client} from "@/client";

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

  it("should handle card payment errors", async () => {
    mockFetchWithResponse(loadFixture("card_error.json"));
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

    expect(client.isSuccessful(response)).toBe(false);
    expect(response.orderNumber).toBeNull();
    expect(response.url).toBeNull();
  });

  it("should handle mobile payment errors", async () => {
    mockFetchWithResponse(loadFixture("mobile_error.json"));
    const response = await client.mobile({
      amount: 10,
      reference: "ref",
      currency: "USD",
      callbackUrl: "http://localhost:8000/callback",
      phone: "243123456789",
    });

    expect(client.isSuccessful(response)).toBe(false);
    expect(response.reference).toBeNull();
    expect(response.orderNumber).toBeNull();
  });

  it("should handle payout errors", async () => {
    mockFetchWithResponse({
      code: "1",
      message: "Transaction failed",
      orderNumber: null
    });
    const response = await client.payout({
      amount: 10,
      reference: "ref",
      currency: "USD",
      callbackUrl: "http://localhost:8000/callback",
      phone: "243123456789",
    });

    expect(client.isSuccessful(response)).toBe(false);
    expect(response.orderNumber).toBeNull();
  });

  it("should handle network errors with retry", async () => {
    let callCount = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        return Promise.reject(new Error("Network error"));
      }
      return Promise.resolve(new Response(JSON.stringify(loadFixture("mobile_success.json")), {
        status: 200,
        headers: {"Content-Type": "application/json"}
      }));
    }));

    const response = await client.mobile({
      amount: 10,
      reference: "ref",
      currency: "USD",
      callbackUrl: "http://localhost:8000/callback",
      phone: "243123456789",
    });

    expect(callCount).toBe(3);
    expect(client.isSuccessful(response)).toBe(true);
  });

  it("should handle 401 unauthorized errors", async () => {
    mockFetchWithResponse({
      message: "Unauthorized access",
      error: "unauthorized"
    }, {status: 401});

    await expect(client.mobile({
      amount: 10,
      reference: "ref",
      currency: "USD",
      callbackUrl: "http://localhost:8000/callback",
      phone: "243123456789",
    })).rejects.toThrow("Unauthorized access");
  });

  it("should handle 400 bad request errors", async () => {
    mockFetchWithResponse({
      message: "Invalid request parameters",
      error: "bad_request"
    }, {status: 400});

    await expect(client.card({
      amount: 1,
      reference: "ref",
      currency: "USD",
      description: "test",
      callbackUrl: "http://localhost:8000/callback",
      approveUrl: "http://localhost:8000/approve",
      cancelUrl: "http://localhost:8000/cancel",
      declineUrl: "http://localhost:8000/decline",
      homeUrl: "http://localhost:8000/home",
    })).rejects.toThrow("Invalid request parameters");
  });

  it("should handle 500 server errors with retry", async () => {
    let callCount = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve(new Response(JSON.stringify({
        message: "Internal server error",
        error: "server_error"
      }), {
        status: 500,
        headers: {"Content-Type": "application/json"}
      }));
    }));

    await expect(client.payout({
      amount: 10,
      reference: "ref",
      currency: "USD",
      callbackUrl: "http://localhost:8000/callback",
      phone: "243123456789",
    })).rejects.toThrow("Internal server error");

    expect(callCount).toBe(4); // Initial + 3 retries
  });

  it("should route mobile payment through pay method", async () => {
    mockFetchWithResponse(loadFixture("mobile_success.json"));
    const response = await client.pay({
      amount: 10,
      reference: "ref",
      currency: "USD",
      callbackUrl: "http://localhost:8000/callback",
      phone: "243123456789",
    });

    expect(client.isSuccessful(response)).toBe(true);
    expect((response as any).orderNumber).toBe("DtX9SmCYojWW243123456789");
  });

  it("should route card payment through pay method", async () => {
    mockFetchWithResponse(loadFixture("card_success.json"));
    const response = await client.pay({
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
    expect((response as any).orderNumber).toBe("O42iABI27568020268434827");
  });

  it("should throw error for unsupported request shape in pay method", async () => {
    await expect(client.pay({
      amount: 10,
      reference: "ref",
      currency: "USD",
      callbackUrl: "http://localhost:8000/callback",
    } as any)).rejects.toThrow("Unsupported request shape");
  });

  it("should validate mobile request parameters", async () => {
    await expect(client.mobile({
      amount: -1, // Invalid amount
      reference: "ref",
      currency: "USD",
      callbackUrl: "http://localhost:8000/callback",
      phone: "243123456789",
    })).rejects.toThrow();
  });

  it("should validate phone number length", async () => {
    await expect(client.mobile({
      amount: 10,
      reference: "ref",
      currency: "USD",
      callbackUrl: "http://localhost:8000/callback",
      phone: "24312345", // Too short
    })).rejects.toThrow();
  });

  it("should validate card request parameters", async () => {
    await expect(client.card({
      amount: 1,
      reference: "", // Empty reference
      currency: "USD",
      description: "test",
      callbackUrl: "http://localhost:8000/callback",
      approveUrl: "http://localhost:8000/approve",
      cancelUrl: "http://localhost:8000/cancel",
      declineUrl: "http://localhost:8000/decline",
      homeUrl: "http://localhost:8000/home",
    })).rejects.toThrow();
  });

  it("should validate card reference length", async () => {
    await expect(client.card({
      amount: 1,
      reference: "a".repeat(26), // Too long (>25 chars)
      currency: "USD",
      description: "test",
      callbackUrl: "http://localhost:8000/callback",
      approveUrl: "http://localhost:8000/approve",
      cancelUrl: "http://localhost:8000/cancel",
      declineUrl: "http://localhost:8000/decline",
      homeUrl: "http://localhost:8000/home",
    })).rejects.toThrow();
  });

  it("should validate payout parameters", async () => {
    await expect(client.payout({
      amount: 0, // Invalid amount
      reference: "ref",
      currency: "USD",
      callbackUrl: "http://localhost:8000/callback",
      phone: "243123456789",
    })).rejects.toThrow();
  });

  it("should create client with production environment", () => {
    const prodClient = new Client("MERCHANT", "token", "prod");
    expect(prodClient).toBeInstanceOf(Client);
  });

  it("should create client with default development environment", () => {
    const devClient = new Client("MERCHANT", "token");
    expect(devClient).toBeInstanceOf(Client);
  });


  it("should handle empty merchant name", () => {
    expect(() => new Client("", "token")).toThrow();
  });

  it("should handle empty token", () => {
    expect(() => new Client("MERCHANT", "")).toThrow();
  });

  it("should handle non-JSON response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("Not JSON", {
        status: 200,
        headers: {"Content-Type": "text/plain"}
      })
    ));

    await expect(client.mobile({
      amount: 10,
      reference: "ref",
      currency: "USD",
      callbackUrl: "http://localhost:8000/callback",
      phone: "243123456789",
    })).rejects.toThrow();
  });

  it("should handle malformed JSON response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("invalid json", {
        status: 200,
        headers: {"Content-Type": "application/json"}
      })
    ));

    await expect(client.mobile({
      amount: 10,
      reference: "ref",
      currency: "USD",
      callbackUrl: "http://localhost:8000/callback",
      phone: "243123456789",
    })).rejects.toThrow();
  });

  it("should handle callback with provider_reference field", () => {
    const data = {
      code: 0,
      message: "Success",
      reference: "test-ref",
      provider_reference: "provider-123",
      orderNumber: "order-123",
      url: null
    };
    const response = client.handleCallback(data);

    expect(client.isSuccessful(response)).toBe(true);
    expect(response.providerReference).toBe("provider-123");
  });

  it("should handle status as string in response", () => {
    const data = {
      code: "0", // String instead of number
      message: "Success",
      reference: "test-ref",
      orderNumber: "order-123"
    };
    const response = client.handleCallback(data);

    expect(client.isSuccessful(response)).toBe(true);
    expect(response.code).toBe(0);
  });
});
