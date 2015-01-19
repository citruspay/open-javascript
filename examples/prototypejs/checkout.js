var citruspg = jQuery.citrus.gateway(jQuery.citrus.env.local);

function paynow() {
	// reset errors
	$('payerror').update('');

	// create bill
	var bill = {
		merchantAccessKey: $('merchantAccessKey').value,
		merchantTxnId: $('merchantTxnId').value,
		amount: {
			currency: 'INR',
			value: $('amount').value
		},
		returnUrl: $('returnUrl').value,
		requestSignature: $('requestSignature').value,
		
		userDetails: {
			firstName: $('firstName').value,
			lastName: $('lastName').value,
			email: $('email').value,
			mobileNo: $('mobileNo').value,
			address: {
				street1: $('addressStreet1').value,
				street2: $('addressStreet1').value,
				city: $('addressCity').value,
				zip: $('addressZip').value,
				state: $('addressState').value,
				country: 'INDIA'
			}
		},
		
		customParameters: {
			paramOne: $('paramOne').value,
			secundo: $('secundo').value
		}
	};

	// read payment options
	var wtk = $$('input[type="radio"][name="walletToken"]:checked');
	var mode = $$('input[type="radio"][name="paymentMode"]:checked')[0].readAttribute('id');
	var paymentOptions = {
		mode: mode,

		token: (wtk.length > 0) ? wtk[0].readAttribute('id') : null,
		tokenCvv: (wtk.length > 0) ? $$('input[type="radio"][name="walletToken"]:checked + label input.cvv')[0].value : null,

		cardNumber: $('cardNumber').value,
		cardHolder: mode == 'card' ? $('cardHolder').value : $('prepaidCardHolder').value,
		cardExpiry: $('cardExpiry').value,
		cardCvv: $('cardCvv').value,
		bankCode: $('bank').value,
	};

	// make payment
	citruspg.makePayment(
		bill, 
		paymentOptions,
		function(error, redirect) {
			if (error) {
				// display error
				$('payerror').update('<p>' + error.error + ': ' + error.message + '</p>');
			}
			else {
				// redirect
				window.location = redirect;
			}
		}
	);
}

document.observe('dom:loaded', function() {
	// setup card inputs;
	jQuery('#cardNumber').payment('formatCardNumber');
	jQuery('#cardExpiry').payment('formatCardExpiry');
	jQuery('#cardCvv').payment('formatCardCVC');
	
	// setup make payment buttons
	$$('button.pay').each(function(button) {
		button.on('click', paynow);
	});
});
