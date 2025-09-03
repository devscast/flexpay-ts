# Flexpay Typescript

![Lint](https://github.com/devscast/flexpay/actions/workflows/lint.yaml/badge.svg)
![Test](https://github.com/devscast/flexpay/actions/workflows/test.yaml/badge.svg)
[![Latest Stable Version](https://poser.pugx.org/devscast/flexpay/version)](https://packagist.org/packages/devscast/flexpay)
[![Total Downloads](https://poser.pugx.org/devscast/flexpay/downloads)](https://packagist.org/packages/devscast/flexpay)
[![License](https://poser.pugx.org/devscast/flexpay/license)](https://packagist.org/packages/devscast/flexpay)

For privacy reasons, Flexpay original documentation cannot be shared without written permission, for more information about credentials
and implementation details, please reach them at flexpay.cd

## Installation
You can use the PHP client by installing the Composer package and adding it to your application’s dependencies:

```bash
composer require devscast/flexpay
```
## Usage

### Authentication
* **Step 1**. Contact Flexpay to get a Merchant Account
  You will receive a Merchant Form to complete in order to provide your business details and preferred Cash out Wallet or Banking Details.
* **Step 2**. Once the paperwork is completed, you will be issued with Live and Sandbox Accounts (Merchant Code and Authorization token)

Then use these credentials to authenticate your client

```php
use Devscast\Flexpay\Client as Flexpay;
use Devscast\Flexpay\Credential;
use Devscast\Flexpay\Environment;

$flexpay = new Flexpay(
    new Credential('token', 'merchant_code'),
    Environment::SANDBOX // use Environment::LIVE for production
);
```

### Create a Payment Request

```php
use Devscast\Flexpay\Data\Currency;
use Devscast\Flexpay\Request\CardRequest;
use Devscast\Flexpay\Request\MobileRequest;

$mobile = new MobileRequest(
    amount: 10, // 10 USD
    currency: Currency::USD,
    phone: "243999999999",
    reference: "your_unique_transaction_reference",
    description: "your_transaction_description",
    callbackUrl: "your_website_webhook_url",
);

$card = new CardRequest(
    amount: 10, // 10 USD
    currency: Currency::USD,
    reference: "your_unique_transaction_reference",
    description: "your_transaction_description",
    callbackUrl: "your_website_webhook_url",
    homeUrl: "your_website_home_url",
)
```

> **Note**: we highly recommend your `callbacks` urls to be unique for each transaction.

### Mobile Payment
Once called, Flexpay will send a payment request to the user's mobile money account, and the user will have to confirm the payment on their phone.
after that the payment will be processed and the callback url will be called with the transaction details.

```php
$response = $flexpay->pay($mobile);
```

### Visa Card Payment
You can set up card payment via VPOS features, which is typically used for online payments.
it's a gateway that allows you to accept payments from your customers using their credit cards.

```php
$response = $flexpay->pay($card);
// redirect to $response->url to complete the payment
```

#### **handling callback (callbackUrl, approveUrl, cancelUrl, declineUrl)**
Flexpay will send a POST request to the defined callbackUrl and the response will contain the transaction details.
you can use the following code to handle the callback by providing incoming data as array.

```php
$state = $flexpay->handleCallback($_POST);
$state->isSuccessful(); // true or false
````

### Check Transaction state
You don't trust webhook ? you can always check the transaction state by providing the order number.

```php
$state = $flexpay->check($payment->orderNumber);
$state->isSuccessful(); // true or false
```
