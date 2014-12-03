assert = require 'assert'
sinon = require 'sinon'
$ = require 'jQuery'
global.jQuery = $

require('../../lib/citrus')

describe 'Wallet', ->
	w = $.citrus.wallet 'no:where', 'n3k07'
	describe 'constructor', ->
		it 'has assigned env', ->
			assert.equal 'no:where', w.env
		it 'has assigned token', ->
			assert.equal 'n3k07', w.token
	describe 'load', ->
		ajax = null
		beforeEach ->
			ajax = sinon.stub jQuery, 'ajax'
		afterEach ->
			ajax.restore()
		it 'gets profile payment with token', ->
			ajax.returns done: ->
			w.load()
			assert.ok ajax.calledOnce
			request = ajax.getCall(0).args[0]
			assert.equal 'GET', request.type
			assert.equal 'no:where/service/v2/profile/me/payment', request.url
			assert.equal 'Bearer n3k07', request.headers.Authorization
		describe 'after webservice', ->
			it 'calls back with cards filtered', ->
				ajax.returns
					done: (onDone) -> onDone
						type: 'payment'
						defaultOption: ''
						paymentOptions: [
								name: 'card one'
								type: 'credit'
								scheme: 'MCRD'
								number: 'XXXXXXXXXXXX8420'
								expiryDate: '022012'
								bank: ''
								token: 'k0t38'
								owner: 'fu bar'
								mmid: ''
								impsRegisteredMobile: ''
							,
								name: 'better card'
								type: 'debit'
								scheme: 'VISA'
								number: 'XXXXXXXXXXXX4444'
								expiryDate: '082016'
								bank: ''
								token: '84eef66'
								owner: 'Foo Bar'
								mmid: ''
								impsRegisteredMobile: ''
						]
				callback = sinon.stub()
				w.load callback
				assert.ok callback.calledOnce
				card = callback.getCall(0).args[0]
				assert.equal '**** **** **** 4444', card.number
				assert.equal 'Foo Bar', card.holder
				assert.equal 'visa', card.scheme
				assert.equal '08/2016', card.expiry
				assert.equal '84eef66', card.token
			it 'ignores buggy cards', ->
				ajax.returns
					done: (onDone) -> onDone
						type: 'payment'
						defaultOption: ''
						paymentOptions: [
								name: 'card one'
								type: 'credit'
								scheme: 'AMEX'
								number: 'XXXXXXXXXXXX8420'
								expiryDate: '022052'
								bank: ''
								token: 'k0t38'
								owner: 'fu bar'
								mmid: ''
								impsRegisteredMobile: ''
						,
								name: 'card one'
								type: 'credit'
								scheme: 'XYZ'
								number: 'XXXXXXXXXXXX8420'
								expiryDate: '022052'
								bank: ''
								token: 'k0t38'
								owner: 'fu bar'
								mmid: ''
								impsRegisteredMobile: ''
						]
				callback = sinon.stub()
				w.load callback
				assert.ok callback.calledOnce
				card = callback.getCall(0).args[0]
				assert.equal '**** **** **** 8420', card.number
				assert.equal 'fu bar', card.holder
				assert.equal 'amex', card.scheme
				assert.equal '02/2052', card.expiry
				assert.equal 'k0t38', card.token
			it 'calls back with netbankings', ->
				ajax.returns
					done: (onDone) -> onDone
						type: 'payment'
						defaultOption: ''
						paymentOptions: [
								name: 'my bank'
								type: 'netbanking'
								scheme: ''
								number: ''
								expiryDate: ''
								bank: 'knab'
								token: ''
								owner: ''
								mmid: ''
								impsRegisteredMobile: ''
						]
				callback = sinon.stub()
				w.load null, callback
				assert.ok callback.calledOnce
				bank = callback.getCall(0).args[0]
				assert.equal 'knab', bank.name
	describe 'cards', ->
		it 'populates cards from load', ->
			load = sinon.stub w, 'load', (onCards) -> onCards
				number: '4242'
				scheme: 'soj'
				expiry: 'MM/yyyy'
				token: 'scrt'
			cards = w.cards()
			assert.equal 1, cards.length
			assert.equal '4242', cards[0].number
			load.restore()
		it 'cashes cards', ->
			w._cards = true
			assert.equal true, w.cards()
	describe 'netbankings', ->
		it 'populates netbanking from load', ->
			load = sinon.stub w, 'load', (onCards, onNetbanking) ->
				onNetbanking name: 'foo'
				onNetbanking name: 'bar'
			netbankings = w.netbankings()
			assert.equal 2, netbankings.length
			assert.equal 'foo', netbankings[0].name
			assert.equal 'bar', netbankings[1].name
			load.restore()
		it 'cashes cards', ->
			w._netbankings = true
			assert.equal true, w.netbankings()
	describe 'save', ->
		ajax = null
		beforeEach ->
			ajax = sinon.stub jQuery, 'ajax'
		afterEach ->
			ajax.restore()
		it 'it invokes profile payment webservice with card', ->
			w.save
				mode: 'card'
				token: 'zzz'
				tokenCvv: 'vvc'
				cardNumber: '4444333322221111'
				cardHolder: 'mr. bean'
				cardExpiry: '16/32'
				cardCvv: '666'
				bankCode: '000'
			assert.ok ajax.calledOnce
			request = ajax.getCall(0).args[0]
			assert.equal 'PUT', request.type
			assert.equal 'no:where/service/v2/profile/me/payment', request.url
			assert.equal 'Bearer n3k07', request.headers.Authorization
			assert.equal 'application/json', request.contentType
			payment = JSON.parse request.data
			assert.equal 'payment', payment.type
			assert.equal '', payment.defaultOption
			assert.equal 1, payment.paymentOptions.length
			assert.equal 'credit', payment.paymentOptions[0].type
			assert.equal '4444333322221111', payment.paymentOptions[0].number
			assert.equal 'mr. bean', payment.paymentOptions[0].owner
			assert.equal 'VISA', payment.paymentOptions[0].scheme
			assert.equal '16/2032', payment.paymentOptions[0].expiryDate
		it 'it invokes profile payment webservice with netbanking', ->
			w.save
				mode: 'netbanking'
				token: 'zzz'
				tokenCvv: 'vvc'
				cardNumber: '4444333322221111'
				cardHolder: 'mr. bean'
				cardExpiry: '16/32'
				cardCvv: '666'
				bankCode: '000'
			assert.ok ajax.calledOnce
			request = ajax.getCall(0).args[0]
			assert.equal 'PUT', request.type
			assert.equal 'no:where/service/v2/profile/me/payment', request.url
			assert.equal 'Bearer n3k07', request.headers.Authorization
			assert.equal 'application/json', request.contentType
			payment = JSON.parse request.data
			assert.equal 'payment', payment.type
			assert.equal '', payment.defaultOption
			assert.equal 1, payment.paymentOptions.length
			assert.equal 'netbanking', payment.paymentOptions[0].type
			assert.equal '000', payment.paymentOptions[0].bank
		it 'it ignores wallet tokens', ->
			w.save
				mode: 'token'
				token: 'zzz'
				tokenCvv: 'vvc'
				cardNumber: '4444333322221111'
				cardHolder: 'mr. bean'
				cardExpiry: '16/32'
				cardCvv: '666'
				bankCode: '000'
			assert.ok !ajax.called
