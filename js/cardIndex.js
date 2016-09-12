/**
 * Created by nagamai on 9/8/2016.
 */
import 'core-js/fn/object/assign';
import {setAppData} from './utils';
import {makePayment} from './apis/payment';
import {cardFieldHandler} from './apis/card-ui';
import {validateExpiryDate, validateScheme, validateCreditCard} from './validation/custom-validations';
import {schemeFromNumber} from './utils';
import {makeMotoCardPayment} from './apis/cards';
//require('./index');
import {init,setConfig,handlersMap} from './config';

init(); //initializes custom validators

window.citrus = window.citrus || {};

if (window.addEventListener) {
    addEventListener("message", listener, false)
} else {
    attachEvent("onmessage", listener)
}

let paymentDetails = {"type": "credit","holder": "test"};

function listener(event) {
    if(event.origin === "http://localhost"){
       Object.assign(paymentDetails, event.data);
        return;
    }
    let data = event.data;
    citrus.payment.setAppData('pgSettingsData', data.pgSettingsData);
    citrus.setConfig(data.config);
    delete data.pgSettingsData;
    delete data.config;
    data.paymentDetails = paymentDetails;

    citrus.cards.makeMotoCardPayment(data).then(function (response) {
        response.responseType = "serverResponse";
        delete response.isValidRequest;
        parent.postMessage(response.data, "*");
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
    parent.postMessage(response, "*");
});

citrus.registerHandlers("serverErrorHandler", function (error) {
    let response = {};
    response.type = "serverErrorHandler";
    response.error = error;
    parent.postMessage(response, "*");
});

