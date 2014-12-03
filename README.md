citrus.js
=========

citrus.js is a javascript library for the browser that lets you integrate your checkout page with CitrusPay payment gateway.

# Overview

To use `citrus.js`, you first have to get your gateway credentials (a.k.a. "merchant access key" and "merchant secret key") from CitrusPay, whether for our test environment ("staging") or our live environment ("production"). Please visit [CitrusPay website](http://www.citruspay.com) for onboarding...

Then using these credentials, you generate a "signature" for each payment on your server. This signature ensures the end-to-end integrity of your payment, and that nobody will be able to tamper with it (i.e. pay 1 rupee and make you believe that 1,000 rupees were paid !).

When you generate your checkout page, you need to embed at least the following data:
* your merchant access key
* your transaction (or order) identifier
* the amount of your transactuion (or order)
* the signature generated for the 3 above fields

You let the user choose her/his method of payment (credit / debit card, netbanking) in your page, then you call `citrus.js` `makePayment` API with 3 parameters:
* the bill to be paid (containing your transaction (or order) details, your "merchant access key", the signature, the "return URL", user contact details and optional additional parameters of your choice (a.k.a. "custom parameters"))
* the payment options selected by the user
* a callback function that will receive the URL to redirect the user to to complete payment (3D-secure, netbanking site, etc.) or an error if payment cannot proceed

After the user has completed payment, she/he is redirected to your "return URL" (specified as part of your bill) with the result of the payment. You should verify the signature of this response, and you can, optionally, verify the status of the payment with a server-to-server webservice call. Depending on the status of the payment (success or failure), you can proceed with your online order flow and direct the user to the next step.
