/**
 * Created by nagamai on 9/8/2016.
 */
import 'core-js/fn/object/assign';
import {setAppData} from './utils';
import {makePayment} from './apis/payment';
import {cardFieldHandler} from './apis/card-ui';
import {getConfigValue} from './ui-config';
import {validateExpiryDate, validateScheme, validateCreditCard} from './validation/custom-validations';
import {schemeFromNumber} from './utils';
import {makeMotoCardPayment} from './apis/cards';
import {init,setConfig,handlersMap} from './config';

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

function listener(event) {
    if(!(event.data.cardType === fieldType[1] || event.data.cardType === "card"|| event.data.paymentDetails ))
        return;
    if(event.origin === getConfigValue('hostedFieldDomain')){
       let keys = Object.keys(event.data);
       //var val = event.data[keys[0]];
       event.data[keys[0]] = event.data[keys[0]].replace(/\s+/g, '');
       Object.assign(paymentDetails, event.data);
        return;
    }
    let data = event.data;
    citrus.payment.setAppData('pgSettingsData', data.pgSettingsData);
    citrus.setConfig(data.config);
    delete data.pgSettingsData;
    delete data.config;
    Object.assign(data.paymentDetails,paymentDetails);
    delete data.paymentDetails.paymentMode;
    delete data.paymentDetails.cardType;
    parentUrl = event.data.parentUrl;
    delete data.parentUrl;
    citrus.cards.makeMotoCardPayment(data).then(function (response) {
        response.responseType = "serverResponse";
        delete response.isValidRequest;
        parent.postMessage(response.data, parentUrl);
    });
}
Object.assign(window.citrus,{
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
    payment : {
        makePayment,
        setAppData
    },
    cards : {
        makeMotoCardPayment
    },
    UI : {
        cardFieldHandler
    }
});

citrus.registerHandlers("errorHandler", function (error) {
    let response = {};
    response.type = "errorHandler";
    response.error = error;
    parent.postMessage(response, parentUrl);
});

citrus.registerHandlers("serverErrorHandler", function (error) {
    let response = {};
    response.type = "serverErrorHandler";
    response.error = error;
    parent.postMessage(response, parentUrl);
});

