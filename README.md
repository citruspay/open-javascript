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

Thus, including `citrus.js` in your page should look like this
```html
	<script type="text/javascript" src="jquery.min.js"></script>
	<script type="text/javascript" src="jquery.payment.js"></script>
	<script type="text/javascript" src="citrus.js"></script>
``` 
