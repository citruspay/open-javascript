# jQuery style

$ = jQuery
$.citrus = {}

# payment

class PaymentMode
	constructor: (@type) ->

class Netbanking extends PaymentMode
	constructor: (@code) ->
		super 'netbanking'

	validate: -> 
		throw {
			error: 'invalid_bank_code'
		} unless @code
		true

	asChargePaymentOption: ->
		type: 'paymentOptionToken'
		paymentMode:
			type: @type
			code: @code
			bank: ''

	asWalletPaymentOption: ->
		type: 'payment'
		defaultOption: ''
		paymentOptions: [
			type: @type
			bank: @code
		]

class CreditCard extends PaymentMode
	constructor: (number, @holder, expiry, @cvv) ->
		super 'credit'
		@number = number.replace /\s+/g, ''
		@xd = $.payment.cardExpiryVal(expiry)

	expiry: ->
		month = @xd.month.toString()
		('0' + month).slice(month.length - 1) + '/' + @xd.year.toString()

	scheme: ->
		switch $.payment.cardType(@number)
			when 'visa' then 'VISA'
			when 'mastercard' then 'MCRD'
			when 'maestro' then 'MTRO'
			when 'amex' then 'AMEX'
			when 'dinersclub' then 'DINERS'
			else throw { error : 'unsupported_card_scheme' }

	validate: ->
		throw {
			error: 'invalid_card_number'
		} unless $.payment.validateCardNumber(@number)
		
		throw {
			error: 'invalid_card_expiry'
		} unless $.payment.validateCardExpiry(@xd.month, @xd.year)

		throw {
			error: 'invalid_card_cvv'
		} unless $.payment.validateCardCVC(@cvv)

		true

	asChargePaymentOption: ->
		type: 'paymentOptionToken'
		paymentMode:
			type: 'credit'
			scheme: this.scheme()
			number: @number
			holder: @holder
			expiry: this.expiry()
			cvv: @cvv

	asWalletPaymentOption: ->
		type: 'payment'
		defaultOption: ''
		paymentOptions: [
			type: @type
			number: @number
			owner: @holder
			scheme: this.scheme()
			expiryDate: this.expiry()
		]

class CardToken extends PaymentMode
	constructor: (@token, @cvv) ->
		super 'token'

	asChargePaymentOption: ->
		type: 'paymentOptionIdToken'
		id: @token
		cvv: @cvv

createPaymentMode = (paymentOptions) ->
	switch paymentOptions.mode
		when 'token' then new CardToken(
			paymentOptions.token, 
			paymentOptions.tokenCvv)
		when 'card' then new CreditCard(
			paymentOptions.cardNumber,
			paymentOptions.cardHolder,
			paymentOptions.cardExpiry,
			paymentOptions.cardCvv)
		when 'netbanking' then new Netbanking(
			paymentOptions.bankCode)
		else throw { error: 'invalid_payment_mode' }


clone = (obj) ->
	if obj == null or typeof obj != 'object'
		obj
	else
		copy = {}
		for attr of obj
			copy[attr] = clone(obj[attr]) if obj.hasOwnProperty(attr)
		copy

class Gateway
	constructor: (@env) ->

	makePayment: (invoice, paymentOptions, callback) ->
		try 
			# validate payment mode
			paymentMode = $.citrus.paymentMode paymentOptions
			paymentMode.validate()

			# create payment
			payment = clone invoice
			payment.paymentToken = paymentMode.asChargePaymentOption()

			# charge
			this.charge(payment, callback)
		catch error
			callback error

	charge: (payment, callback) ->
		error = null
		$.ajax
			type: 'POST'
			url: @env + '/service/moto/authorize/struct/extended'
			contentType: 'application/json'
			data: JSON.stringify(payment)
		.done (response) ->
			if response.pgRespCode is '0'
				callback null, response.redirectUrl
			else
				callback { error: 'payment_processing_error', message: response.txMsg }
		.fail (xhr, status, message) ->
			switch xhr.status
				when 500 then callback { error: 'payment_server_error', message: message }
				else callback { error: 'network_error', message: message }

# API

$.citrus.env =
	local: 'http://localhost:8080/admin-site'
	staging: 'https://stgadmin.citruspay.com'
	sandbox: 'https://sandboxadmin.citruspay.com'
	production: 'https://admin.citruspay.com'

$.citrus.netbanking = (code) ->
	new Netbanking(code)

$.citrus.card = (args...) ->
	new CreditCard(args...)

$.citrus.token = (args...) ->
	new CardToken(args...)

$.citrus.paymentMode = (args...) ->
	createPaymentMode(args...)

$.citrus.clone = (args...) ->
	clone(args...)

$.citrus.gateway = (env = $.citrus.env.production) ->
	new Gateway(env)

# wallet

_2scheme = (cs) ->
	switch cs
		when 'VISA' then 'visa'
		when 'MCRD' then 'mastercard'
		when 'MTRO' then 'maestro'
		when 'AMEX' then 'amex'
		when 'DINERS' then 'dinersclub'
		else throw { error : 'unsupported_card_scheme' }

formatExipry = (expiry) ->
	xd =
		month: expiry.slice 0, 2
		year: expiry.slice 2
	throw { error: 'invalid_card_expiry' } unless $.payment.validateCardExpiry xd.month, xd.year
	'' + xd.month + '/' + xd.year

class Wallet
	constructor: (@env, @token) ->

	load: (onCard, onNetbanking) ->
		$.ajax
			type: 'GET'
			url: @env + '/service/v2/profile/me/payment'
			headers: 
				Authorization: 'Bearer ' + @token
		.done (response) ->
			for option in response.paymentOptions.reverse()
				do (option) ->
					try
						switch option.type
							when 'debit', 'credit' then onCard(
								number: option.number.replace /XXXX/g, '**** '
								holder: option.owner
								scheme: _2scheme option.scheme
								expiry: formatExipry option.expiryDate
								token: option.token
							) if onCard
							when 'netbanking' then onNetbanking(
								name: option.bank
							) if onNetbanking
					catch x
						# ignore

	cards: () ->
		this.load( (card) =>
			@_cards = [] unless @_cards
			@_cards.push card
		) unless @_cards
		@_cards

	netbankings: () ->
		this.load(
			() -> 
			(netbanking) =>
				@_netbankings = [] unless @_netbankings
				@_netbankings.push netbanking
		) unless @_netbankings
		@_netbankings

	save: (paymentOptions) ->
		try
			# create wallet payment option
			paymentMode = $.citrus.paymentMode paymentOptions
			paymentOption = paymentMode.asWalletPaymentOption()

			# invoke wallet save
			$.ajax
				type: 'PUT'
				url: @env + '/service/v2/profile/me/payment'
				contentType: 'application/json'
				headers: 
					Authorization: 'Bearer ' + @token
				data: JSON.stringify paymentOption
		catch x
			# ignore

# API

$.citrus.wallet = (args...) ->
	new Wallet(args...)
