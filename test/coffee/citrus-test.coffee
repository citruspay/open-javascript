assert = require 'assert'
sinon = require 'sinon'
$ = require 'jQuery'
global.jQuery = $
require 'jquery.payment'

require('../../lib/citrus')

describe 'Netbanking', ->
	nb = $.citrus.netbanking 'idc012'
	describe 'constructor', ->
		it 'has netbanking type', ->
			assert.equal 'netbanking', nb.type
		it 'has assigned bank code', ->
			assert.equal 'idc012', nb.code
	describe 'validate', ->
		it 'validates non empty code', ->
			assert.ok nb.validate()
		it 'invalidates empty code', ->
			assert.throws(
				() -> $.citrus.netbanking('').validate(),
				(err) -> 'invalid_bank_code' == err.error)
		it 'invalidates null code', ->
			assert.throws(
				() -> $.citrus.netbanking().validate(),
				(err) -> 'invalid_bank_code' == err.error)
	describe 'asChargePaymentOption', ->
		opt = nb.asChargePaymentOption()
		it 'is a payment option', ->
			assert.equal 'paymentOptionToken', opt.type
		describe 'paymentMode', ->
			pm = opt.paymentMode
			it 'is netbanking', ->
				assert.equal 'netbanking', pm.type
			it 'has no bank name', ->
				assert.equal '', pm.bank
			it 'has right code', ->
				assert.equal 'idc012', pm.code
	describe 'asWalletPaymentOption', ->
		opt = nb.asWalletPaymentOption()
		it 'has payment profile element type', ->
			assert.equal 'payment', opt.type
		it 'has one payment netbanking option', ->
			assert.equal 1, opt.paymentOptions.length
			assert.equal 'netbanking', opt.paymentOptions[0].type
			assert.equal 'idc012', opt.paymentOptions[0].bank

describe 'CreditCard', ->
	cc = $.citrus.card '4444 3333 2222 1111', 'foo bar', '4 /16', '321'
	describe 'constructor', ->
		it 'has credit type', ->
			assert.equal 'credit', cc.type
		it 'has assigned number', ->
			assert.equal '4444333322221111', cc.number
		it 'has assigned holder', ->
			assert.equal 'foo bar', cc.holder
		it 'has assigned cvv', ->
			assert.equal '321', cc.cvv
	describe 'expiry', ->
		it 'formats dates to mm/yyyy', ->
			assert.equal '04/2016', cc.expiry()
		it 'accepts expired dates', ->
			expired = $.citrus.card '', '', ' 1 / 1981 ', ''
			assert.equal '01/1981', expired.expiry()
	describe 'scheme', ->
		it 'maps visa card', ->
			assert.equal 'VISA', cc.scheme()
		it 'maps master card', ->
			mci = $.citrus.card '5432', '', '', ''
			assert.equal 'MCRD', mci.scheme()
		it 'rejects unsupported scheme', ->
			unionpay = $.citrus.card '6236265930072952775', '', '', ''
			assert.throws(
				() -> unionpay.scheme(),
				(err) -> 'unsupported_card_scheme' == err.error)
	describe 'validate', ->
		it 'validates good cards', ->
			assert.ok cc.validate()
		it 'invalidates bad luhns', ->
			invalid = $.citrus.card '4444444444444444', '', '', ''
			assert.throws(
				() -> invalid.validate(),
				(err) -> 'invalid_card_number' == err.error)
		it 'invalidates expired', ->
			invalid = $.citrus.card '4444333322221111', '', '05/1999', ''
			assert.throws(
				() -> invalid.validate(),
				(err) -> 'invalid_card_expiry' == err.error)
		it 'invalidates short cvv', ->
			invalid = $.citrus.card '4444333322221111', '', '08/2022', '1'
			assert.throws(
				() -> invalid.validate(),
				(err) -> 'invalid_card_cvv' == err.error)
		it 'invalidates long cvv', ->
			invalid = $.citrus.card '4444333322221111', '', '08/2022', '12345'
			assert.throws(
				() -> invalid.validate(),
				(err) -> 'invalid_card_cvv' == err.error)
		it 'accepts empty cvv for maestro 12 digits cards', ->
			maestro = $.citrus.card '6759649826438453', '', '04/2048', ''
			assert.ok maestro.validate()
		it 'accepts null cvv for maestro 12 digits cards', ->
			maestro = $.citrus.card '6759649826438453', '', '04/2048', null
			assert.ok maestro.validate()
		it 'accepts undefined cvv for maestro 12 digits cards', ->
			maestro = $.citrus.card '6759649826438453', '', '04/2048'
			assert.ok maestro.validate()
		it 'accepts empty cvv for maestro 19 digits cards', ->
			maestro = $.citrus.card '6799990100000000019', '', '04/2048', ''
			assert.ok maestro.validate()
		it 'accepts null cvv for maestro 19 digits cards', ->
			maestro = $.citrus.card '6799990100000000019', '', '04/2048', null
			assert.ok maestro.validate()
		it 'accepts undefined cvv for maestro 19 digits cards', ->
			maestro = $.citrus.card '6799990100000000019', '', '04/2048'
			assert.ok maestro.validate()
	describe 'asChargePaymentOption', ->
		opt = cc.asChargePaymentOption()
		it 'is a payment option', ->
			assert.equal 'paymentOptionToken', opt.type
		describe 'paymentMode', ->
			pm = opt.paymentMode
			it 'is credit', ->
				assert.equal 'credit', pm.type
			it 'has right scheme', ->
				assert.equal 'VISA', pm.scheme
			it 'has right number', ->
				assert.equal '4444333322221111', pm.number
			it 'has right holder', ->
				assert.equal 'foo bar', pm.holder
			it 'has right expiry', ->
				assert.equal '04/2016', pm.expiry
			it 'has right cvv', ->
				assert.equal '321', pm.cvv
	describe 'asWalletPaymentOption', ->
		opt = cc.asWalletPaymentOption()
		it 'has payment profile element type', ->
			assert.ok 'payment', opt.type
		it 'has one payment credit card option', ->
			assert.equal 1, opt.paymentOptions.length
			assert.equal 'credit', opt.paymentOptions[0].type
			assert.equal '4444333322221111', opt.paymentOptions[0].number
			assert.equal 'VISA', opt.paymentOptions[0].scheme
			assert.equal 'foo bar', opt.paymentOptions[0].owner
			assert.equal '04/2016', opt.paymentOptions[0].expiryDate
		it 'escapes HTML Entities in owner', ->
			xss = $.citrus.card '4444 3333 2222 1111', '<script>alert("foo&bar");</script>', '4 /16', '321'
			assert.equal(
				'&lt;script&gt;alert("foo&amp;bar");&lt;/script&gt;', 
				xss.asWalletPaymentOption().paymentOptions[0].owner)

describe 'PrepaidCard', ->
	ppc = $.citrus.prepaid 'fix@fuzz.biz'
	describe 'constructor', ->
		it 'has prepaid type', ->
			assert.equal 'prepaid', ppc.type
		it 'has assigned holder', ->
			assert.equal 'fix@fuzz.biz', ppc.holder
	describe 'validate', ->
		it 'validates good prepaid', ->
			assert.ok ppc.validate()
		it 'invalidates null holder', ->
			invalid = $.citrus.prepaid null
			assert.throws(
				() -> invalid.validate(),
				(err) -> 'invalid_card_holder' == err.error
			)
		it 'invalidates empty holder', ->
			invalid = $.citrus.prepaid ""
			assert.throws(
				() -> invalid.validate(),
				(err) -> 'invalid_card_holder' == err.error
			)
		it 'invalidates non email holder', ->
			invalid = $.citrus.prepaid "fix-fuzz.biz"
			assert.throws(
				() -> invalid.validate(),
				(err) -> 'invalid_card_holder' == err.error
			)
	describe 'asChargePaymentOption', ->
		opt = ppc.asChargePaymentOption()
		it 'is a payment option', ->
			assert.equal 'paymentOptionToken', opt.type
		describe 'paymentMode', ->
			pm = opt.paymentMode
			it 'is prepaid', ->
				assert.equal 'prepaid', pm.type
			it 'has right scheme', ->
				assert.equal 'CPAY', pm.scheme
			it 'has empty number', ->
				assert.equal '', pm.number
			it 'has right holder', ->
				assert.equal 'fix@fuzz.biz', pm.holder
			it 'has empty expiry', ->
				assert.equal '', pm.expiry
			it 'has empty cvv', ->
				assert.equal '', pm.cvv

describe 'CardToken', ->
	tk = $.citrus.token 'deadbeef', '248'
	describe 'constructor', ->
		it 'has token type', ->
			assert.equal 'token', tk.type
		it 'has assigned token', ->
			assert.equal 'deadbeef', tk.token
		it 'has assigned cvv', ->
			assert.equal '248', tk.cvv
	describe 'validate', ->
		it 'validates good token', ->
			assert.ok tk.validate()
		it 'invalidates null token', ->
			invalid = $.citrus.token null, '248'
			assert.throws(
				() -> invalid.validate(),
				(err) -> 'invalid_token' == err.error)
		it 'invalidates empty token', ->
			invalid = $.citrus.token '', '248'
			assert.throws(
				() -> invalid.validate(),
				(err) -> 'invalid_token' == err.error)
		it 'invalidates null cvv', ->
			invalid = $.citrus.token 'deadbeef', null
			assert.throws(
				() -> invalid.validate(),
				(err) -> 'invalid_card_cvv' == err.error)
		it 'invalidates empty cvss', ->
			invalid = $.citrus.token 'deadbeef', ''
			assert.throws(
				() -> invalid.validate(),
				(err) -> 'invalid_card_cvv' == err.error)
	describe 'asChargePaymentOption', ->
		opt = tk.asChargePaymentOption()
		it 'is a payment token', ->
			assert.equal 'paymentOptionIdToken', opt.type
		it 'has right id', ->
			assert.equal 'deadbeef', opt.id
		it 'has right cvv', ->
			assert.equal '248', opt.cvv
	describe 'asWalletPaymentOption', ->
		it 'is not supported', ->
			assert.throws(
				-> tk.asWalletPaymentOption(),
				(error) -> true)

describe 'createPaymentMode', ->
	it 'creates token', ->
		token = $.citrus.paymentMode { mode: 'token', token: 'nekot', tokenCvv: 'vvc' }
		assert.equal 'nekot', token.token
		assert.equal 'vvc', token.cvv
	it 'creates netbanking', ->
		bank = $.citrus.paymentMode { mode: 'netbanking', bankCode: 'edoc' }
		assert.equal 'edoc', bank.code
	it 'creates card', ->
		card = $.citrus.paymentMode { 
			mode: 'card', 
			cardNumber: 'rebmun', 
			cardHolder: 'redloh',
			cardExpiry: '12/12',
			cardCvv: 'cvc' }
		assert.equal 'rebmun', card.number
		assert.equal 'redloh', card.holder
		assert.deepEqual { month: 12, year: 2012 }, card.xd
		assert.equal 'cvc', card.cvv
	it 'creates prepaid card', ->
		prepaid = $.citrus.paymentMode { 
			mode: 'prepaid', 
			cardHolder: 'zap@zip.us' }
		assert.equal 'zap@zip.us', prepaid.holder
	it 'rejects invalid mode', ->
		assert.throws(
			() -> $.citrus.paymentMode { mode: 'foo' },
			(err) -> 'invalid_payment_mode' == err.error)

describe 'clone', ->
	obj = { foo: 'bar' }
	it 'creates a different object', ->
		assert.ok obj == obj
		assert.ok obj != $.citrus.clone obj
	it 'copies values', ->
		assert.deepEqual obj, $.citrus.clone obj

describe 'Gateway', ->
	gateway = $.citrus.gateway('http://foo/bar')
	describe 'charge', ->
		describe 'calls moto charge', ->
			beforeEach ->
				sinon.stub jQuery, 'ajax', ->
					done: ->
						fail: ->
			afterEach ->
				jQuery.ajax.restore()
			it 'calls moto charge', ->
				gateway.charge
					mtx: 'a64'
					uri: 'foo:baz'
					->
				assert.ok jQuery.ajax.calledOnce 
				params = jQuery.ajax.getCall(0).args[0]
				assert.equal 'POST', params.type
				assert.equal 'http://foo/bar/service/moto/authorize/struct/extended', params.url
				assert.equal 'application/json', params.contentType
				assert.deepEqual { mtx: 'a64', uri: 'foo:baz' }, JSON.parse params.data
		describe 'after webservice call', ->
			jquery = null
			beforeEach ->
				jquery = sinon.mock jQuery
			afterEach ->
				jquery.restore()
			it 'calls back with mpi url on sucess', ->
				jquery.expects('ajax').once().returns 
					done: (onresponse) ->
						onresponse
							pgRespCode: '0'
							redirectUrl: 'biz:buz'
							txMsg: 'Transaction successful'
						fail: ->
				callback = sinon.stub()
				gateway.charge
					mtx: 'a64'
					uri: 'foo:baz'
					callback
				jquery.verify()
				assert.ok callback.calledOnce
				assert.equal null, callback.getCall(0).args[0]
				assert.equal 'biz:buz', callback.getCall(0).args[1]
			it 'calls back with error on pg error', ->
				jquery.expects('ajax').once().returns
					done: (onresponse) -> 
						onresponse
							pgRespCode: '124'
							txMsg: 'big error'
						fail: ->
				callback = sinon.stub()
				gateway.charge
					mtx: 'a64'
					uri: 'foo:baz'
					callback
				jquery.verify()
				assert.ok callback.calledOnce
				assert.equal 'payment_processing_error', callback.getCall(0).args[0].error
				assert.equal 'big error', callback.getCall(0).args[0].message
				assert.equal null, callback.getCall(0).args[1]
			it 'calls back with error on server error', ->
				jquery.expects('ajax').once().returns
					done: () -> 
						fail: (onError) ->
							onError status: 500, 'error', 'server down'
				callback = sinon.stub()
				gateway.charge
					mtx: 'a64'
					uri: 'foo:baz'
					callback
				jquery.verify()
				assert.ok callback.calledOnce
				assert.equal 'payment_server_error', callback.getCall(0).args[0].error
				assert.equal 'server down', callback.getCall(0).args[0].message
				assert.equal null, callback.getCall(0).args[1]
			it 'calls back with error on network error', ->
				jquery.expects('ajax').once().returns
					done: () -> 
						fail: (onError) ->
							onError status: 400, 'error', 'no internet'
				callback = sinon.stub()
				gateway.charge
					mtx: 'a64'
					uri: 'foo:baz'
					callback
				jquery.verify()
				assert.ok callback.calledOnce
				assert.equal 'network_error', callback.getCall(0).args[0].error
				assert.equal 'no internet', callback.getCall(0).args[0].message
				assert.equal null, callback.getCall(0).args[1]
	describe 'makePayment', ->
		invoice =
			mtx: '3SVC4479O00000002S3'
			amount:
				currency: 'INR'
				value:1
		paymentOptions =
			mode: 'netbanking'
			bankCode: 'abc'
		charge = null
		beforeEach ->
			charge = sinon.stub gateway, 'charge', ->
		afterEach ->
			charge.restore()
		it 'parses and validates payment options', ->
			paymentMode = sinon.stub
				validate: ->
				asChargePaymentOption: ->
			sinon.stub $.citrus, 'paymentMode', (options) ->
				assert.equal paymentOptions, options
				paymentMode
			gateway.makePayment invoice, paymentOptions
			assert.ok paymentMode.validate.calledOnce
			assert.ok paymentMode.asChargePaymentOption.calledOnce
			$.citrus.paymentMode.restore()
		it 'charge new payment', ->
			gateway.makePayment invoice, paymentOptions
			assert.ok charge.calledOnce
			assert.deepEqual {
				mtx: '3SVC4479O00000002S3'
				amount:
					currency: 'INR'
					value:1
				paymentToken:
					type: 'paymentOptionToken'
					paymentMode:
						type: 'netbanking'
						bank: ''
						code: 'abc'
				},
				charge.getCall(0).args[0]
