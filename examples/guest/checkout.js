var citruspg = $.citrus.gateway($.citrus.env.local);

function paynow() {
	// reset errors
	$('#payerror').html('');

	// create bill
	var bill = {
		merchantAccessKey: $('#merchantAccessKey').val(),
		merchantTxnId: $('#merchantTxnId').val(),
		amount: {
			currency: 'INR',
			value: $('#amount').val()
		},
		returnUrl: $('#returnUrl').val(),
		requestSignature: $('#requestSignature').val(),
		
		userDetails: {
			firstName: $('#firstName').val(),
			lastName: $('#lastName').val(),
			email: $('#email').val(),
			mobileNo: $('#mobileNo').val(),
			address: {
				street1: $('#addressStreet1').val(),
				street2: $('#addressStreet1').val(),
				city: $('#addressCity').val(),
				zip: $('#addressZip').val(),
				state: $('#addressState option:selected').val(),
				country: 'INDIA'
			}
		},
		
		customParameters: {
			paramOne: $('#paramOne').val(),
			secundo: $('#secundo').val()
		}
	};

	// read payment options
	var mode = $('input[type="radio"][name="paymentMode"]:checked').attr('id');
	var paymentOptions = {
		mode: mode,
		token: '',
		tokenCvv: '',
		cardNumber: $('#cardNumber').val(),
		cardHolder: mode == 'card' ? $('#cardHolder').val() : $('#prepaidCardHolder').val(),
		cardExpiry: $('#cardExpiry').val(),
		cardCvv: $('#cardCvv').val(),
		bankCode: $('#bank option:selected').val(),
	};

	// make payment
	citruspg.makePayment(
		bill, 
		paymentOptions,
		function(error, redirect) {
			if (error) {
				// redirect
				$('#payerror').html('<p>' + error.error + ': ' + error.message + '</p>');
			}
			else {
				// display error
				$(location).attr({ href: redirect });
			}
		}
	);
}

$(document).ready(function() {
	// setup card inputs;
	$('#cardNumber').payment('formatCardNumber');
	$('#cardExpiry').payment('formatCardExpiry');
	$('#cardCvv').payment('formatCardCVC');
	
	// setup make payment buttons
	$('button.pay').click(paynow);
});
