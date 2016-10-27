/**
 * Created by nagamai on 9/8/2016.
 */
//import 'babel-polyfill';
import 'core-js/fn/object/assign';
import 'core-js/fn/promise';
import 'core-js/fn/string/includes';
import {setAppData,getAppData} from './utils';
import {makePayment} from './apis/payment';
import {addField,validateCvv,validateExpiry} from './hosted-field-main';
import {getConfigValue} from './hosted-field-config';
import {validateExpiryDate, validateScheme, validateCreditCard} from './validation/custom-validations';
import {schemeFromNumber} from './utils';
import {makeMotoCardPayment} from './apis/cards';
import {init,setConfig,handlersMap} from './config';
import {applyAttributes} from './hosted-field-setup';

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
    //console.log(event.data);
    if(!event.data)
        return;
    if(event.data.messageType==="style")
    {
        applyAttributes(event.data);
        return;
    }
    if(event.data.messageType==="validation")
    {
        if(event.data.fieldType==="number")
        {
            setAppData('scheme',event.data.cardValidationResult.scheme);
            if(fieldType=='cvv')
            validateCvv(true);
            else if(fieldType=='expiry')
            validateExpiry(true);
        }
        return;
    }
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
    parentUrl = getAppData('parentUrl');
    citrus.cards.makeMotoCardPayment(data).then(function (response) {
        response.responseType = "serverResponse";
        delete response.isValidRequest;
        response.data.redirectUrl.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
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
    hostedFields : {
        addField
    }
});

//todo:remove this handlers
citrus.registerHandlers("errorHandler", function (error) {
    let response = {};
    response.type = "errorHandler";
    response.error = error;
    parent.postMessage(JSON.parse(JSON.stringify(response)), parentUrl);
});

citrus.registerHandlers("serverErrorHandler", function (error) {
    let response = {};
    response.type = "serverErrorHandler";
    response.error = error;
    parent.postMessage(response, parentUrl);
});