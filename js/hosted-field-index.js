/**
 * Created by nagamai on 9/8/2016.
 */
//import 'babel-polyfill';
import "core-js/fn/object/assign";
import "core-js/fn/promise";
import "core-js/fn/string/includes";
import {setAppData, getAppData, postMessageWrapper, schemeFromNumber} from "./utils";
import {makePayment} from "./apis/payment";
import {addField, validateCvv, validateExpiry, validateCard} from "./hosted-field-main";
import {getConfigValue} from "./hosted-field-config";
import {validateExpiryDate, validateScheme, validateCreditCard} from "./validation/custom-validations";
import {makeMotoCardPayment,motoCardValidationSchema} from "./apis/cards";
import {init, setConfig, handlersMap} from "./config";
import {applyAttributes} from "./hosted-field-setup";

init(); //initializes custom validators

window.citrus = window.citrus || {};

if (window.addEventListener) {
    addEventListener("message", listener, false)
} else {
    attachEvent("onmessage", listener)
}

let paymentDetails = {};
let field = document.location.href.split("#");
let fieldType = field[1].split("-");
let parentUrl;
//child(iframe) listener
function listener(event) {
    //console.log(event.data,'inside child frame');
    var data = event.data;
    if (!event.data||event.data.generatedBy!=='citrus')
        return;
    if (event.data.messageType === "style") {
        applyAttributes(event.data);
        return;
    }
    if (event.data.messageType === "validation") {
       /* if (event.data.fieldType === "number") {
            setAppData('scheme', event.data.cardValidationResult.scheme);
            if (fieldType[0] === 'cvv')
                validateCvv(true);
            else if (fieldType[0] === 'expiry')
                validateExpiry(true);
        }*/
        return;
    }
    if(event.data.messageType=="schemeChange"){
        setAppData(event.data.cardType+'scheme', event.data.scheme);
        switch(fieldType[0]){
            case 'cvv':
            validateCvv(true);
            return;
            case 'expiry':
            validateExpiry(true);
            return;
        }
    }
    if (event.data.messageType == 'validate') {
        switch (fieldType[0]) {
            case 'number':
                validateCard();
                break;
            case 'cvv':
                validateCvv(false);
                break;
            case 'expiry':
                validateExpiry(false);
                break;
        }
        return;
    }
    //if the cardType send is same as for which it is setup, or the cardSetupType is card or the data is intended 
    //for making payment then only go ahead
    if (!(event.data.cardType === fieldType[1] || event.data.cardType === "card" || event.data.messageType==="makePayment" ))
        return;
    if (event.origin === getConfigValue('hostedFieldDomain')&&event.data.messageType==="cardData") {
        let cardData = event.data.cardData;
        let requiredPaymentData = {};
        requiredPaymentData[cardData.key] = cardData.value.replace(/\s+/g, '');
        Object.assign(paymentDetails, requiredPaymentData);
        return;
    }
    citrus.payment.setAppData('pgSettingsData', data.pgSettingsData);
    citrus.setConfig(data.config);
    let paymentData = data.paymentData;
    Object.assign(paymentData.paymentDetails, paymentDetails);
    delete paymentData.paymentDetails.paymentMode;
    delete paymentData.paymentDetails.cardType;
    parentUrl = getAppData('parentUrl');
    citrus.cards.makeMotoCardPayment(paymentData).then(function (response) {
        //response.responseType = "serverResponse";
        delete response.isValidRequest;
        response.data.redirectUrl.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
        let message = {messageType:'serverResponse',response:response.data};
        postMessageWrapper(parent, message, parentUrl);
    });
}
Object.assign(window.citrus, {
    setConfig,
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
    payment: {
        makePayment,
        setAppData
    },
    cards: {
        makeMotoCardPayment
    },
    hostedFields: {
        addField
    }
});

//todo:remove this handlers
citrus.registerHandlers("errorHandler", function (error) {
    let message = {};
    message.messageType = "errorHandler";
    message.error = error;
    postMessageWrapper(parent, message, parentUrl);
});

citrus.registerHandlers("serverErrorHandler", function (error) {
    let message = {};
    message.messageType = "serverErrorHandler";
    message.error = error;
    postMessageWrapper(parent, message, parentUrl);
});