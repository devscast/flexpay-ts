import * as z from "zod";

export enum Status {
  SUCCESS = 0, // When the request is successfully processed
  FAILURE = 1, // When there is a problem
}

export enum Type {
  MOBILE = 1, // mobile money transaction
  CARD = 2, // visa credit card transaction
}

export const CurrencySchema = z.enum(["USD", "CDF"]);
export type Currency = z.infer<typeof CurrencySchema>;
export type Method = "MOBILE" | "CARD";

export const CredentialSchema = z.object({
  merchant: z.string().min(1, "Merchant cannot be empty"),
  token: z.string().min(1, "The authorization token cannot be empty"),
});

export type Credential = z.infer<typeof CredentialSchema>;

const StatusCoerce = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === "string" ? Number(v) : v))
  .refine((n) => n === Status.SUCCESS || n === Status.FAILURE, "Invalid status code")
  .transform((n) => n as Status);

const NullableString = z.union([z.string(), z.null()]).optional();

export const MobileResponseSchema = z
  .object({
    code: StatusCoerce,
    message: z.string().optional().default(""),
    orderNumber: NullableString,
    provider_reference: NullableString,
    providerReference: NullableString, // accept already-normalized
    reference: NullableString,
    url: NullableString,
  })
  .transform((v) => ({
    code: v.code,
    message: v.message ?? "",
    orderNumber: v.orderNumber ?? null,
    providerReference: (v as any).providerReference ?? v.provider_reference ?? null,
    reference: v.reference ?? null,
    url: v.url ?? null,
  }));

export const CardResponseSchema = z.object({
  code: StatusCoerce,
  message: z.string().optional().default(""),
  orderNumber: NullableString,
  url: NullableString,
});

export const TransactionSchema = z.object({
  amount: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  amountCustomer: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  channel: NullableString,
  createdAt: z.string(),
  currency: CurrencySchema,
  orderNumber: NullableString,
  reference: z.string(),
  status: StatusCoerce,
});

export const CheckResponseSchema = z.object({
  code: StatusCoerce,
  message: z.string().optional().default(""),
  transaction: z.union([TransactionSchema, z.null()]).optional().default(null),
});

export const PayoutResponseSchema = z.object({
  code: StatusCoerce,
  message: z.string().optional().default(""),
  orderNumber: NullableString,
});

const Url = z.string().min(1);

const BaseRequestSchema = z.object({
  amount: z.number().gt(0, "The transaction amount should be greater than 0"),
  approveUrl: Url.optional().nullable(),
  callbackUrl: Url,
  cancelUrl: Url.optional().nullable(),
  currency: CurrencySchema,
  declineUrl: Url.optional().nullable(),
  description: z.string().optional().nullable(),
  reference: z.string().min(1, "The transaction reference is mandatory"),
});

export const MobileRequestSchema = BaseRequestSchema.extend({
  phone: z.string().length(12, "The phone number should be 12 characters long, eg: 243123456789"),
});

export const CardRequestSchema = z.object({
  amount: z.number().gt(0),
  approveUrl: Url,
  callbackUrl: Url,
  cancelUrl: Url,
  currency: CurrencySchema,
  declineUrl: Url,
  description: z.string().min(1, "The description must be provided"),
  homeUrl: Url,
  reference: z.string().min(1).max(25, "The reference must be between 1 and 25 characters"),
});

export const PayoutRequestSchema = z.object({
  amount: z.number().gt(0),
  callbackUrl: Url,
  currency: CurrencySchema,
  phone: z.string().length(12, "The phone number should be 12 characters long, eg: 243123456789"),
  reference: z.string().min(1),
});

export type MobileResponse = z.infer<typeof MobileResponseSchema>;
export type CardResponse = z.infer<typeof CardResponseSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type CheckResponse = z.infer<typeof CheckResponseSchema>;
export type PayoutResponse = z.infer<typeof PayoutResponseSchema>;

export type MobileRequest = z.infer<typeof MobileRequestSchema>;
export type CardRequest = z.infer<typeof CardRequestSchema>;
export type PayoutRequest = z.infer<typeof PayoutRequestSchema>;
