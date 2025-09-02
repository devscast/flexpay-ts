import { z } from "zod";

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
  token: z.string().min(1, "The authorization token cannot be empty"),
  merchant: z.string().min(1, "Merchant cannot be empty"),
});

export type Credential = z.infer<typeof CredentialSchema>;

const StatusCoerce = z
  .union([z.string(), z.number()])
  .transform(v => (typeof v === "string" ? Number(v) : v))
  .refine(n => n === Status.SUCCESS || n === Status.FAILURE, "Invalid status code")
  .transform(n => n as Status);

const NullableString = z.union([z.string(), z.null()]).optional();

export const MobileResponseSchema = z
  .object({
    code: StatusCoerce,
    message: z.string().optional().default(""),
    reference: NullableString,
    provider_reference: NullableString,
    providerReference: NullableString, // accept already-normalized
    orderNumber: NullableString,
    url: NullableString,
  })
  .transform(v => ({
    code: v.code,
    message: v.message ?? "",
    reference: v.reference ?? null,
    providerReference: (v as any).providerReference ?? v.provider_reference ?? null,
    orderNumber: v.orderNumber ?? null,
    url: v.url ?? null,
  }));

export const CardResponseSchema = z.object({
  code: StatusCoerce,
  message: z.string().optional().default(""),
  orderNumber: NullableString,
  url: NullableString,
});

export const TransactionSchema = z.object({
  reference: z.string(),
  amount: z.union([z.string(), z.number()]).transform(v => Number(v)),
  amountCustomer: z.union([z.string(), z.number()]).transform(v => Number(v)),
  createdAt: z.string(),
  status: StatusCoerce,
  currency: CurrencySchema,
  orderNumber: NullableString,
  channel: NullableString,
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
  reference: z.string().min(1, "The transaction reference is mandatory"),
  currency: CurrencySchema,
  callbackUrl: Url,
  description: z.string().optional().nullable(),
  approveUrl: Url.optional().nullable(),
  cancelUrl: Url.optional().nullable(),
  declineUrl: Url.optional().nullable(),
});

export const MobileRequestSchema = BaseRequestSchema.extend({
  phone: z.string().length(12, "The phone number should be 12 characters long, eg: 243123456789"),
  type: z.nativeEnum(Type).optional().default(Type.MOBILE),
});

export const CardRequestSchema = z.object({
  amount: z.number().gt(0),
  reference: z.string().min(1).max(25, "The reference must be between 1 and 25 characters"),
  currency: CurrencySchema,
  description: z.string().min(1, "The description must be provided"),
  callbackUrl: Url,
  approveUrl: Url,
  cancelUrl: Url,
  declineUrl: Url,
  homeUrl: Url,
});

export const PayoutRequestSchema = z.object({
  amount: z.number().gt(0),
  reference: z.string().min(1),
  currency: CurrencySchema,
  callbackUrl: Url,
  phone: z.string().length(12, "The phone number should be 12 characters long, eg: 243123456789"),
  type: z.nativeEnum(Type).optional().default(Type.MOBILE),
});

export type MobileResponse = z.infer<typeof MobileResponseSchema>;
export type CardResponse = z.infer<typeof CardResponseSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type CheckResponse = z.infer<typeof CheckResponseSchema>;
export type PayoutResponse = z.infer<typeof PayoutResponseSchema>;

export type MobileRequest = z.infer<typeof MobileRequestSchema>;
export type CardRequest = z.infer<typeof CardRequestSchema>;
export type PayoutRequest = z.infer<typeof PayoutRequestSchema>;
