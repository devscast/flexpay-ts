# Flexpay Typescript

![npm](https://img.shields.io/npm/v/@devscast/flexpay?style=flat-square)
![npm](https://img.shields.io/npm/dt/@devscast/flexpay?style=flat-square)
[![Lint](https://github.com/devscast/flexpay-ts/actions/workflows/lint.yml/badge.svg?branch=main)](https://github.com/devscast/flexpay-ts/actions/workflows/lint.yml)
[![Tests](https://github.com/devscast/flexpay-ts/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/devscast/flexpay-ts/actions/workflows/test.yml)
![GitHub](https://img.shields.io/github/license/devscast/flexpay-ts?style=flat-square)

For privacy reasons, Flexpay original documentation cannot be shared without written permission, for more information about credentials
and implementation details, please reach them at flexpay.cd

## Installation
You can use the Typescript client by installing the npm package and adding it to your application’s dependencies:

```bash
npm install @devscast/flexpay
```
## Usage

### Authentication
* **Step 1**. Contact Flexpay to get a Merchant Account
  You will receive a Merchant Form to complete in order to provide your business details and preferred Cash out Wallet or Banking Details.
* **Step 2**. Once the paperwork is completed, you will be issued with Live and Sandbox Accounts (Merchant Code and Authorization token)

Then use these credentials to authenticate your client

```ts
import { Client as Flexpay } from "@devscast/flexpay";

const flexpay = new Flexpay("merchant_code", "token", "dev") // use "prod" for production
```

### Create a Payment Request

```typescript
import { CardRequest, MobileRequest } from "@devscast/flexpay";

const mobile = {
    amount: 10, // 10 USD
    currency: "USD",
    phone: "243999999999",
    reference: "your_unique_transaction_reference",
    description: "your_transaction_description",
    callbackUrl: "your_website_webhook_url",
} as MobileRequest;

const card = {
    amount: 10, // 10 USD
    currency: "USD",
    reference: "your_unique_transaction_reference",
    description: "your_transaction_description",
    callbackUrl: "your_website_webhook_url",
    homeUrl: "your_website_home_url",
} as CardRequest
```

> **Note**: we highly recommend your `callbacks` urls to be unique for each transaction.

### Mobile Payment
Once called, Flexpay will send a payment request to the user's mobile money account, and the user will have to confirm the payment on their phone.
after that the payment will be processed and the callback url will be called with the transaction details.

```typescript
const response = await  flexpay.pay(mobile);
```

### Visa Card Payment
You can set up card payment via VPOS features, which is typically used for online payments.
it's a gateway that allows you to accept payments from your customers using their credit cards.

```typescript
const response = await flexpay.pay(card);
// redirect to response.url to complete the payment
```

#### **handling callback (callbackUrl, approveUrl, cancelUrl, declineUrl)**
Flexpay will send a POST request to the defined callbackUrl and the response will contain the transaction details.
you can use the following code to handle the callback by providing incoming data as array.

```typescript
const webhook = flexpay.handleCallback(req.body);
flexpay.isSuccessful(webhook) // true or false
````

### Check Transaction state
You don't trust webhook ? you can always check the transaction state by providing the order number.

```typescript
const tx = flexpay.check(mobile.orderNumber);
flexpay.isSuccessful(tx) // true or false
```

## Contributors

<a href="https://github.com/devscast/flexpay-tz/graphs/contributors" title="show all contributors">
  <img src="https://contrib.rocks/image?repo=devscast/flexpay-ts" alt="contributors"/>
</a>

