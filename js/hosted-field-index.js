/**
 * Created by nagamai on 9/8/2016.
 */
//import 'babel-polyfill';
import "core-js/fn/object/assign";
import "core-js/fn/promise";
import "core-js/fn/string/includes";
import {setAppData, getAppData, postMessageWrapper, schemeFromNumber} from "./utils";
import {validateExpiryDate, validateScheme, validateCreditCard} from "./validation/custom-validations";
import {makeMotoCardPayment, makeSavedCardPayment} from "./apis/cards";
import {makeMCPCardPayment, makeMCPCardPaymentWrapper, getCardCurrencyWrapper} from "./apis/mcp";
import {init, setConfig, handlersMap} from "./config";
import {
    addField,
    validateCvv,
    validateExpiry,
    validateCard,
    addEventListenersForHostedFields
} from "./hosted-field-main";
import {getConfigValue, specialStyleKeys, supportedStyleKeys} from "./hosted-field-config";
import cloneDeep from "lodash/cloneDeep";
import {PAGE_TYPES} from "./constants";
import {applyDynamicPricing} from "./apis/card-dp";

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
    var data = event.data;
    if (!event.data||event.data.generatedBy!=='citrus')
        return;
    if (event.data.messageType === "style") {
        applyAttributes(event.data);
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
    if (!(event.data.cardType === fieldType[1] || event.data.cardType === "card"||event.data.cardType=='savedCard' || event.data.messageType==="makePayment" ))
        return;
    if(event.data.messageType==="fetchDynamicPricingToken"){
        fetchDynamicPricingToken(event.data);
        return;
    }
    if(event.data.messageType==="fetchMcpToken"){
        fetchMcpToken(event.data);
        return;
    }
    if (event.origin === getConfigValue('hostedFieldDomain')&&event.data.messageType==="cardData") {
        let cardData = event.data.cardData;
        let requiredPaymentData = {};
        requiredPaymentData[cardData.key] = cardData.value.replace(/\s+/g, '');
        Object.assign(paymentDetails, requiredPaymentData);
        return;
    }
    parentUrl = getAppData('parentUrl');
    data.config.page = PAGE_TYPES.HOSTED_FIELD;
    if(event.data.messageType==='makePayment')
    {
        //console.log("here");
        citrus.payment.setAppData('pgSettingsData', data.pgSettingsData);
        citrus.setConfig(data.config);
        let paymentData = data.paymentData;
        Object.assign(paymentData.paymentDetails, paymentDetails);
        /*let offerToken = getAppData('dynamicPriceToken');
        console.log('-----------offerToken-----------',offerToken);
        if(offerToken){
            paymentData.offerToken = offerToken;
        }*/
        delete paymentData.paymentDetails.paymentMode;
        delete paymentData.paymentDetails.cardType;
        if (paymentData.targetMcpCurrency)
            citrus.cards.makeMCPCardPaymentWrapper(paymentData).then(function (response) {
            response.responseType = "serverResponse";
            delete response.isValidRequest;
            response.data.redirectUrl.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
            let message = {messageType:'serverResponse',response:response.data};
            postMessageWrapper(parent, message, parentUrl);
            });
        else
        citrus.cards.makeMotoCardPayment(paymentData).then(function (response) {
            response.responseType = "serverResponse";
            delete response.isValidRequest;
            response.data.redirectUrl.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
            let message = {messageType:'serverResponse',response:response.data};
            postMessageWrapper(parent, message, parentUrl);
        });
    } else if(event.data.messageType==="makeSavedCardPayment"){
        let paymentData =  cloneDeep(data.paymentData);
        citrus.setConfig(data.config);
        paymentData.paymentDetails.cvv = document.getElementsByTagName('input')[0].value;
        if(event.data.scheme==="Maestro"&&!paymentData.paymentDetails.cvv){
            paymentData.paymentDetails.cvv = Math.floor(Math.random() * 900) + 100;
        }
        makeSavedCardPayment(paymentData).then(function(response){
            response.responseType = "serverResponse";
            delete response.isValidRequest;
            response.data.redirectUrl.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
            let message = {messageType:'serverResponse',response:response.data};
            postMessageWrapper(parent, message, parentUrl);
        });
    }
}
const fetchDynamicPricingToken = (data) => {
    let dynamicPricingData = data.dynamicPricingData;
    let hostedField = data.hostedField;
    let fieldElement = document.getElementsByTagName('input')[0];
    citrus.setConfig(data.config);
    parentUrl = getAppData('parentUrl');
    if(hostedField.fieldType === "number"){
        setAppData('dynamicPriceToken',null);
        dynamicPricingData.cardNo = fieldElement.value.replace(/\s+/g, '');
        return applyDynamicPricing(dynamicPricingData).then(function(resp){
            let message = {messageType:'dynamicPriceToken',hostedField:data.hostedField,cardType:data.cardType,dynamicPriceResponse:resp};
            if(resp&&resp.resultCode===0){
                setAppData('dynamicPriceToken',resp.offerToken);
            }
            postMessageWrapper(parent,message,parentUrl);
        });
    }
};
const fetchMcpToken = (data) => {
    let mcpData = data;
    let hostedField = data.hostedField;
    let fieldElement = document.getElementsByTagName('input')[0];
    citrus.setConfig(data.config);
    parentUrl = getAppData('parentUrl');
    console.log(parentUrl);
    if (hostedField.fieldType === "number") {
        mcpData.cardNumber = fieldElement.value.replace(/\s+/g, '');
        console.log(parentUrl);
        return getCardCurrencyWrapper(mcpData).then(function (resp) {
            let message = {
                messageType: 'mcpToken',
                hostedField: data.hostedField,
                cardType: data.cardType,
                binResponse: resp
            };
            postMessageWrapper(parent, message, parentUrl);
        });
    }
};
/*copied from hosted-field-set-up start*/
//child code
const applyAttributes = (attributes) => {
    if (!attributes)
        return;
    let applicableStyle = {};

    function createStyleObject(styleParam) {
        if (!styleParam)
            return;
        let keys = Object.keys(styleParam);
        for (var i = 0; i < keys.length; ++i) {
            let key = keys[i];
            if (supportedStyleKeys.indexOf(key) !== -1) {
                applicableStyle[convertHyphenFormatToCamelCase(key)] = styleParam[key];
            } else if (specialStyleKeys.indexOf(key) !== -1) {
                //todo:handle :focus,.valid,.invalid here
            } else {
                console.warn(`${key} is not supported`);
            }
        }
    }

    setAppData('hostedField', attributes.hostedField);
    setAppData('cardType', attributes.cardType);
    if(attributes.cardType.toLowerCase()==='savedcard')
    {
        setAppData(attributes.cardType+'scheme',attributes.hostedField.savedCardScheme);
    }
    addEventListenersForHostedFields(attributes.cardType);
    createStyleObject(attributes.commonStyle);
    createStyleObject(attributes.specificStyle);
    var inputElement = document.getElementsByTagName('input')[0];
    if (attributes.hostedField && attributes.hostedField.placeholder) {
        inputElement.setAttribute('placeholder', attributes.hostedField.placeholder);
    }
    Object.assign(inputElement.style, applicableStyle);
    var cssText = '';
    for (var i = 0; i < specialStyleKeys.length; ++i) {
        var specialStyleKey = specialStyleKeys[i];
        if (attributes['input' + specialStyleKey]) {
            cssText += convertStyleToCssString('input' + specialStyleKey, attributes['input' + specialStyleKey]);
        }
    }
    addStyleTag(cssText);
};

const convertStyleToCssString = (selector, style)=> {
    if (!style)
        return;
    //console.log(style);
    var keys = Object.keys(style);
    var cssText = selector + ' {';
    for (var i = 0; i < keys.length; ++i) {
        let key = keys[i];
        if (supportedStyleKeys.indexOf(key) !== -1) {
            cssText += key + ':' + style[key] + ';';
        } else {
            console.warn(`${key} is not supported`);
        }
    }
    cssText += '}';
    return cssText;
};

const addStyleTag = (css)=> {
    //var css = 'h1 { background: red; }',
    var head = document.head || document.getElementsByTagName('head')[0],
        style = document.createElement('style');
    style.type = 'text/css';
    if (style.styleSheet) {
        style.styleSheet.cssText = css;
    } else {
        style.appendChild(document.createTextNode(css));
    }
    head.appendChild(style);
};

/*function styleHyphenFormat(propertyName) {
 function upperToHyphenLower(match) {
 return '-' + match.toLowerCase();
 }
 return propertyName.replace(/[A-Z]/g, upperToHyphenLower);
 }*/
function convertHyphenFormatToCamelCase(propertyName) {
    function hyphenLowerToUpper(match) {
        return match[1].toUpperCase();
    }
    return propertyName.replace(/-[a-z]/g, hyphenLowerToUpper);
}

/*copied from hosted-field-set-up end*/
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
        setAppData
    },
    cards: {
        makeMotoCardPayment,
        makeMCPCardPayment,
        makeMCPCardPaymentWrapper
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