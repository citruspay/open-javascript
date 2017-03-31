//import 'babel-polyfill';
import "core-js/fn/object/assign";
import "core-js/fn/promise";
import "core-js/fn/string/includes";
import {makeNetBankingPayment, makeSavedNBPayment} from "./apis/net-banking";
import {getPaymentDetails, getMcpCurrenciesAndCardSchemes} from "./apis/payment-details";
import {makeMotoCardPayment, makeSavedCardPayment} from "./apis/cards";
import {makeExtWalletsPayment} from "./apis/external-wallets";
import {init, handlersMap, setConfig} from "./config";
import {getCardCurrencyInfo} from "./apis/mcp";
import {isUrl} from "./utils";
import {applyDynamicPricing} from "./apis/card-dp";
import {applyNbDynamicPricing} from "./apis/net-banking-dp";
import {makePayment} from "./apis/payment";
import {listener} from "./apis/hosted-field-payment";
import {singleHopDropInFunction} from "./apis/singleHop";
import {applyWallletDynamicPricing} from "./apis/wallet-dp";
import {create} from "./hosted-field-setup";
import {getDynamicPriceToken} from "./apis/dynamic-pricing-endpoint";

init(); //initializes custom validators

window.citrus = window.citrus || {};

if (window.addEventListener) {
    addEventListener("message", listener, false)
} else {
    attachEvent("onmessage", listener)
}

Object.assign(window.citrus, {
    setConfig,
    registerHandlers: (key, handler) => {
        handlersMap[key] = handler;
    },
    utils: {
        isUrl
    },
    netbanking: {
        makeNetBankingPayment,
        makeSavedNBPayment,
        applyNbDynamicPricing
    },
    cards: {
        makeMotoCardPayment,
        makeSavedCardPayment,
        getCardCurrencyInfo,
        getMcpCurrenciesAndCardSchemes,
        //misnomer, function gives payment methods allowed by merchants
        getPaymentDetails,
        applyDynamicPricing
    },
    hostedFields: {
        create
    },
    wallet: {
        makeExtWalletsPayment
    },
    features: {
        singleHopDropInFunction,
        applyWallletDynamicPricing,
        getDynamicPriceToken
    },
    payment: {
        makePayment
    }
});
