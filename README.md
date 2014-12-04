citrus.js
=========

`citrus.js` is a javascript library for the browser that lets you integrate your checkout page with CitrusPay payment gateway.

# Overview

To use `citrus.js`, you first have to get your gateway credentials (a.k.a. "merchant access key" and "merchant secret key") from CitrusPay, whether for our test environment ("staging") or our live environment ("production"). Please visit [CitrusPay website](http://www.citruspay.com) for onboarding...

Then using these credentials, you generate a "[signature](../../wiki/signature#request-signature)" for each payment on your server. This signature ensures the end-to-end integrity of your payment, and that nobody will be able to tamper with it (i.e. pay 1 rupee and make you believe that 1,000 rupees were paid !).

When you generate your checkout page, you need to embed at least the following data:
* your merchant access key
* your order (or transaction) identifier
* the amount of your order (or transactuion)
* the signature generated for the 3 above fields

In your page, you let the user choose her/his method of payment (credit / debit card, netbanking), then you call `citrus.js` `makePayment` API with 3 parameters:
* the [bill](../../wiki/bill) to be paid (containing your order (or transaction) details, your "merchant access key", the signature, your "return URL", user contact details and optional additional parameters of your choice (a.k.a. "custom parameters"))
* the [payment options](../../wiki/payment-options) selected by the user
* a callback function that will receive the URL to redirect the user to to complete payment (3D-secure, netbanking site, etc.) or an error if payment cannot proceed

After the user has completed payment, she/he is redirected to your "return URL" (specified as part of your bill) with the result of the payment. You should verify the [signature](../../wiki/signature#response-signature) of this response, and you can, optionally, verify the status of the payment with a server-to-server webservice call. Depending on the status of the payment (success or failure), you can proceed with your online order flow and direct the user to the next step.

## Save customer's cards with Citrus Wallet

Once you have integrated with CitrusPay payment gateway as described above, you can let your customers save their paymant options (credit / debit cards, NetBanking bank) with CitrusPay and present her/him with these saved options the next time she/he wants to pay on your site, saving your customer the effort of entering credit / debit card details. This requires that you have verified the user's identity.

For integrating your site with Citrus Wallet, you first need to get your Citrus Wallet credentials (a.k.a. "oauth client ids" and "oauth client secrets") from CitrusPay. Please contact our [technical support](mailto:tech.support@citruspay.com) for creating theses credentials...

Then using these credentials, from your server, you '[bind](../../wiki/bind)' your identified user to a CitrusPay user:

1. request a 'subscription' OAuth token using your subscription "oauth client id" and "oauth client secret"
2. call the CitrusPay user binding webservice with the 'subscription' oauth token, the user's email and mobile number (optional)
3. request a 'wallet' one-time OAuth token using your wallet "oauth client id" and "oauth client secret" and the username returned by the binding webservice

When you generate your checkout page, you to embed the 'wallet' OAuth token. When your page loads, it can call the `load` API to fetch the saved payment options from Citrus Wallet. When your customer presses 'make payment', your page can call the `save` API to save the selected payment options to Citrus Wallet.

# Sample usage

In the following snipet, we try to do a netbanking payment of 10 rupees with ICICI Bank against CitrusPay 'sandbox' environment. The user's browser is redirected to the ICICI netbanking login page if the payment request is accepted by CitrusPay payment gateway, or the error is logged to the JavaScript console otherwise.

```javascript
// configure citrus.js with sandbox environment
var citruspg = $.citrus.gateway($.citrus.env.sandbox);

// creates bill
var bill = {
	"merchantAccessKey": "F2VZD1HBS2VVXJPMWO77",
	"merchantTxnId": "xyz884422",
	"amount": {
		"currency": "INR",
		"value": "10"
	},
	"returnUrl": "http://www.example.com",
	"requestSignature": "3670241785923f1d389a6e0a7a97820ddae40307",
	"userDetails": {
		"firstName": "Chhota",
		"lastName": "Bheem",
		"email": "chhota.bheem@pogo.tv",
		"mobileNo": "9988776655",
	}
};

// create payment options
var paymentOptions = {
    "mode": "netbanking",
    "bankCode": "CID001"
};

// start payment processing
citruspg.makePayment(
	bill,
	paymentOptions,
	function(error, url) {
		if (error) {
			// log error
			console.log(error);
		} else {
			// redirect user to second factor authentication (netbanking or 3D-secure)
			$(location).attr({ href: url });
		}
	}
);
```

# API

## Dependencies

`citrus.js` depends on
* [jQuery](https://jquery.com): tested with version 1.11.1
* [jquery.payment](https://github.com/stripe/jquery.payment): tested with version 1.1.4

Thus, including `citrus.js` in your HTML page should look like this
```html
	<script type="text/javascript" src="jquery.min.js"></script>
	<script type="text/javascript" src="jquery.payment.js"></script>
	<script type="text/javascript" src="citrus.js"></script>
```

We recommand you also use _jQuery_ and _jquery.payment_ to easily build great payment user exeprience...

## $.citrus.gateway([env])

Creates a proxy to CitrusPay payment gateway. You can specify to which CitrusPay environment you want the proxy to point to (default is 'production' environment).

Example
```javascript
// create a gateway proxy for the integration environement
var testpg = $.citrus.gateway($.citrus.env.sandbox);

// create a gateway proxy for the live environment
var citruspg = $.citrus.gateway($.citrus.env.production);
// or
var gateway = $.citrus.gateway();
```

## gateway.makePayment(bill, paymentOptions, callback)

Submits a payment request to CitrusPay payment gateway and starts the payment interactive authorization flow (3D-secure for credit / debit cards, and bank NetBanking site for netbanking).

`bill` lets you specify your CitrusPay merchant credentials, your transaction parameters and customer details. Full specification can be found [here](../../wiki/bill).

`paymentOptions` lets you specify the mode of payment chosen by the customer. Full specification can be found [here](../../wiki/payment-options).

`callback` is a function that accepts 2 parameters:
* `error` if an error occured while processing payment, `null` otherwise; an error is an object with an error code named `error` and an optional error explanation named `message`; valid error codes are
  * `invalid_bank_code` if payment options `mode` is `netbanking` but no `bankCode` is given
  * `invalid_card_cvv` if payment options `mode` is `card` but `cardCvv` is not 3/4 digits
  * `invalid_card_expiry` if payment options `mode` is `card` but `cardExpiry` is not a valid date ('mm/yy' or 'mm/yyyy') or the date is past
  * `invalid_card_number` if payment options `mode` is `card` but `cardNumber` is not a valid PAN (i.e. passing the [Luhn algorithm](http://en.wikipedia.org/wiki/Luhn_algorithm) checksum test)
  * `invalid_payment_mode` if payment options `mode` is not `card`, `netbanking` or `token`
  * `network_error` if the gateway proxy could not access CitrusPay server
  * `payment_processing_error` if the CitrusPay payment gateway rejected the payment; further explanation given in `message`
  * `payment_server_error` if there was un unexpected error on CitrusPay payment gateway
  * `unsupported_card_scheme` if payment options `mode` is `card` and `cardNumber` specifies an unsupported card scheme; supported schemes are: _VISA_, _MasterCard_, _Maestro_, _AmericanExpress_ and _DinersClub_

* `url` if the payment flow can proceed, `undefined` if error; `url` is URL the user's browser has to be redirected to to let the user complete the payment authorization

Example
```javascript
var gateway = $.citrus.gateway();

gateway.makePayment(
	{
		"merchantAccessKey": "F2VZD1HBS2VVXJPMWO77",
		"merchantTxnId": "xyz884422",
		"amount": { "currency": "INR", "value": "10" },
		"returnUrl": "http://www.example.com",
		"requestSignature": "3670241785923f1d389a6e0a7a97820ddae40307",
		"userDetails": {
			"email": "chhota.bheem@pogo.tv",
			"mobileNo": "9988776655"
		}
	},
	{
		"mode": "card",
		"cardNumber": "4444 3333 2222 1111",
		"cardHolder": "Chhota Bheem",
		"cardExpiry": "08/22",
		"cardCvv": "842",
	},
	function(error, url) {
		if (error) {
			$('#error').html('<p>' + error.error + ': ' + error.message + '</p>');
		} else {
			$(location).attr({ href: url });
		}
	}
);
```
## $.citrus.wallet(token, [env])

Creates a proxy to a user's Citrus Wallet. User is specified by `token` as provided by the [binding](../../wiki/bind) process. `env` specifies the CitrusPay target environment ("sandbox" for integration testing or "production" for live integration; default is "production").

Example
```javascript
// create a wallet proxy for the integration environement
var testwallet = $.citrus.wallet(
	'2c245c89-fed6-493c-87df-fb109974c517', 
	$.citrus.env.sandbox);

// create a gateway proxy for the live environment
var citruswallet = $.citrus.wallet(
	'2c245c89-fed6-493c-87df-fb109974c517', 
	$.citrus.env.production);
// or
var wallet = $.citrus.wallet('2c245c89-fed6-493c-87df-fb109974c517');
```

## wallet.load(onCard, [onNetbanking])

Loads payment options from user's Citrus Wallet and invoke callbacks with each saved credit / debit cards or netbankings in the Citrus Wallet.

`onCard` is a function that accepts a saved card, which is a JavaScript object with following fields
* `number` the masked number of the saved credit / debit card PAN, for user display 
* `holder` name on the saved credit / debit card
* `scheme` the scheme of the credit / debit saved card; one of
  * `visa`
  * `mastercard`
  * `maestro`
  * `amex`
  * `dinersclub`
* `token` the identifier of the saved credit / debit card, to be used as `token` for payment options in `makePayment` API call

`onNetbanking` is a function that accepts a saved NetBanking option, which is a JavaScript with following fields
* `name` the human readable name of the bank
* `code` the CitrusPay code of the bank, to be used as `bankCode` for payment options in `makePayment` API call

Sample saved credit card
```javascript
{
	number: '**** **** **** 4482',
	holder: 'Chhota Bheem',
	scheme: 'mastercard',
	token: 'a74b5ad19da22e48c4d2d7468588ea16'
}
```

Sample saved NetBanking
```javascript
{
	name: 'ICICI Bank',
	code: 'CID001'
}
```

Example
```javascript
var citruswallet = $.citrus.wallet('2c245c89-fed6-493c-87df-fb109974c517');

citruswallet.load(
	function(card) {
		// add card to list of saved cards
		$('#savedCards').append(
			'<input type="radio" name="savedCard" value="' 
			+ card.token + '">' 
			+ card.number);
	},
	function(netbanking) {
		// select saved netbanking in banks drop-down
		$('#banks').val(netbanking.code);
	}
);
```

## wallet.save(paymentOptions)

Save payment options in Citrus Wallet. The format of `paymentOptions` is same as for `makePayment` and fill specification can be found [here](../../wiki/payment-options).

Example
```javascript
// configure citrus to production environment
var gateway = $.citrus.gateway();
var wallet = $.citrus.wallet('2c245c89-fed6-493c-87df-fb109974c517');

// create card payment options
var card = {
	"mode": "card",
	"cardNumber": "4444 3333 2222 1111",
	"cardHolder": "Chhota Bheem",
	"cardExpiry": "08/22",
	"cardCvv": "842",
};

// pay bill with card
gateway.makePayment(
	{
		"merchantAccessKey": "F2VZD1HBS2VVXJPMWO77",
		"merchantTxnId": "xyz884422",
		"amount": { "currency": "INR", "value": "10" },
		"returnUrl": "http://www.example.com",
		"requestSignature": "3670241785923f1d389a6e0a7a97820ddae40307",
		"userDetails": {
			"email": "chhota.bheem@pogo.tv",
			"mobileNo": "9988776655"
		}
	},
	paymentOptions,
	function(error, url) {
		if (error) {
			$('#error').html('<p>' + error.error + ': ' + error.message + '</p>');
		} else {
			// save successful card in wallet
			wallet.save();

			// redirect to 3D-secure
			$(location).attr({ href: url });
		}
	}
);
```
