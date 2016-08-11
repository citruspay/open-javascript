//import 'babel-polyfill';
import 'core-js/fn/object/assign';
import 'core-js/fn/promise';
import 'core-js/fn/string/includes';

import {makeNetBankingPayment, makeSavedNBPayment, makeBlazeNBPayment} from './apis/net-banking';
import {getPaymentDetails, getPaymentDetailsForMCP} from './apis/payment-details';
import {makeBlazeCardPayment, getmerchantCardSchemes, makeMotoCardPayment, makeSavedCardPayment} from './apis/cards';
//import {makeWallletPayment} from './apis/wallet';
import {validateExpiryDate, validateScheme, validateCreditCard} from './validation/custom-validations';
import {init, handlersMap, setConfig, getConfig} from './config';
import {makeMCPCardPayment, getCardCurrencyInfo} from './apis/mcp';
//import * as tests from './tests/simple-tests';
import {schemeFromNumber} from './utils';
import {applyDynamicPricing,makeDPCardPayment} from './apis/card-dp';
import {applyNbDynamicPricing} from './apis/net-banking-dp';
import {makePayment} from './apis/payment';
import {singleHopDropInFunction} from './apis/singleHop';


init(); //initializes custom validators

window.citrus = window.citrus || {};

window.responseHandler = function(response){
    if(response.txnHandle) {
        let responded = true;
        setConfig({responded});
        delete response.txnHandle;
     }
    handlersMap['transactionHandler'](response);
};

window.onload = function(){
    var iframe = document.createElement('iframe');
    iframe.style.display = "none";
    //url needs to be configured
    iframe.src = "http://localhost/launcher.php";
    iframe.id = "citrus-launcher";
    document.body.appendChild(iframe);
}

function listener(event){
    if(event.origin === ("http://localhost")) {
        if (event.data) {
            handlersMap['transactionHandler'](event.data);
        }else{
            var resp = {};
            handlersMap['transactionHandler'](resp);
        }
    }
}

if (window.addEventListener){
    addEventListener("message", listener, false)
} else {
    attachEvent("onmessage", listener)
}

Object.assign(window.citrus, {
    setConfig,
    getConfig,
    validators: {
        validateExpiryDate,
        validateScheme,
        validateCreditCard
    },
    utils: {
        schemeFromNumber
    },
    registerHandlers: (key, handler) => {
        handlersMap[key] = handler;
    },
    geteways: {
        getPaymentDetails
    },
    netbanking: {
        makeNetBankingPayment,
        makeSavedNBPayment,
        makeBlazeNBPayment,
        applyNbDynamicPricing
    },
    cards: {
        getmerchantCardSchemes,
        makeMotoCardPayment,
        makeBlazeCardPayment,
        makeSavedCardPayment,
        makeMCPCardPayment,
        getCardCurrencyInfo,
        getPaymentDetailsForMCP,
        getPaymentDetails,
        applyDynamicPricing,
        makeDPCardPayment
    },
    wallet: {
        //makeWallletPayment
    },
    features: {
        applyDynamicPricing,
        singleHopDropInFunction
        //makeWallletPayment
    },
    payment:{
        makePayment
    }
});