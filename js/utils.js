import {handlersMap, getConfig} from "./config";
import {validate} from "validate.js";
import flow from "lodash/flow";
import {PAGE_TYPES, TRACKING_IDS} from "./constants";
import {UUID} from './external/uuid.core';

//Important: This should be defined as 'function' and not as ES6 arrow function
//because arrow functions don't have 'arguments' object 
//This function is used to mainly suppress the default validation messages
//shown by validate.js which prepends the name of the attribute in the messagese
//the first parameter passed is the object to be validated, the other object is constraint
//the third object is options (dealing with error messages format, grouping etc.)
const custValidate = function() {
    //Array.from(arguments) 's equivalent to in ES5/ES3 is Array.prototype.slice.call(arguments)
    //const args = Array.from(arguments);
    const args = Array.prototype.slice.call(arguments);

    if (args[2] === undefined) {
        args[2] = {
            fullMessages: false
        }
    } else { //if present
        args[2].fullMessages === undefined ? args[2].fullMessages = false : '';
    }

    //fullMessages false is required, otherwise following message gets printed
    //Main Object Check 'Code' key is not allowed in the config
    //instead of
    //'Code' key is not allowed in the config

    return validate.apply(null, args);

};

const enhanceWithValidation = (schema, func) => {

    return (confObj) => {
        const validationResult = custValidate(confObj, schema);
        if (validationResult) {
            handlersMap['errorHandler'](validationResult);
            throw JSON.stringify(validationResult);
        }
        return func(confObj); //func returns promise
    };
};

const callBackify = (promiseReturningFunc) => {
    return function() {
        //Array.from(arguments) 's equivalent to in ES5/ES3 is Array.prototype.slice.call(arguments)
        //let args = Array.from(arguments);
        let args = Array.prototype.slice.call(arguments);

        if (typeof args[args.length - 1] === 'function') {
            let cb = args.pop();
            promiseReturningFunc.apply(promiseReturningFunc, args)
                .then(function(success) {
                    cb(undefined, success)
                }, function(err) {
                    cb(err);
                });
        } else {
            return promiseReturningFunc.apply(promiseReturningFunc, args);
        }
    }
};

const validateAndCallbackify = flow(enhanceWithValidation, callBackify);

const getMerchantAccessKey = (optionsObj) => {
    const merchantAccessKey = optionsObj.merchantAccessKey || getConfig().merchantAccessKey;
    if (!merchantAccessKey) {
        return handlersMap.errorHandler(new Error('merchantAccessKey is not set'));
    }
    return merchantAccessKey;
};

//logic from jquery payment plugin
const defaultFormat = /(\d{1,4})/g;
const cards = [{
    type: 'forbrugsforeningen',
    patterns: [600],
    format: /^600/,
    length: [16],
    cvcLength: [3],
    luhn: true,
    groupingFormat: defaultFormat
}, {
    type: 'visa',
    patterns: [4],
    format: /^4/,
    length: [13, 16],
    cvcLength: [3],
    luhn: true,
    groupingFormat: defaultFormat
}, {
    type: 'mastercard',
    patterns: [51, 52, 53, 54, 55, 22, 23, 24, 25, 26, 27],
    format: /^(5[1-5]|222[1-9]\d{2}|22[3-9]\d{3}|23\d{4}|24\d{4}|25\d{4}|26\d{4}|27[0-1]\d{3}|272000|2720[0-9][0-9])/,
    length: [16],
    cvcLength: [3],
    luhn: true,
    groupingFormat: defaultFormat
}, {
    type: 'amex',
    patterns: [34, 37],
    format: /^3[47]/,
    length: [15],
    cvcLength: [3, 4],
    luhn: true,
    groupingFormat: /(\d{1,4})(\d{1,6})?(\d{1,5})?/
}, {
    type: 'rupay',
    patterns: [60, 50, 65, 55, 69],
    format: /^(508[5-9][0-9][0-9]|60698[5-9]|60699[0-9]|607[0-8][0-9][0-9]|607[9][0-7][0-9]|60798[0-4]|608[0-4][0-9][0-9]|608500|6521[5-9][0-9]|652[2-7][0-9][0-9]|6528[0-9][0-9]|6529[0-9][0-9]|6530[0-9][0-9]|6531[0-4][0-9])/,
    length: [16],
    cvcLength: [3],
    luhn: true,
    groupingFormat: defaultFormat
}, {
    type: 'maestro',
    patterns: [5018, 502, 503, 504, 545, 56, 58, 639, 6220, 67],
    format: /^(?:5[0678]\d\d|6304|6390|6220|67\d\d)\d{8,15}$/,
    length: [12, 13, 14, 15, 16, 17, 18, 19],
    cvcLength: [3],
    luhn: true,
    groupingFormat: defaultFormat
}, {
    type: 'dinersclub',
    patterns: [30, 36, 38, 39],
    format: /^(36|38|30[0-5])/,
    length: [14],
    cvcLength: [3],
    luhn: true,
    groupingFormat: defaultFormat
}, {
    type: 'discover',
    patterns: [6011, 64, 65, 622],
    format: /^(6011|65|64[4-9]|622)/,
    length: [16],
    cvcLength: [3],
    luhn: true,
    groupingFormat: defaultFormat
}, {
    type: 'unionpay',
    patterns: [62, 88],
    format: /^62/,
    length: [16, 17, 18, 19],
    cvcLength: [3],
    luhn: false,
    groupingFormat: defaultFormat
}, {
    type: 'jcb',
    patterns: [35],
    format: /^35/,
    length: [16],
    cvcLength: [3],
    luhn: true,
    groupingFormat: defaultFormat
}];

const schemeFromNumber = (num) => {
    //if(!num)
    //throw new Error('Card number can not be blank.');
    var card, _i, _len, _ref;
    num = (num + '').replace(/\D/g, '');
    for (_i = 0, _len = cards.length; _i < _len; _i++) {
        card = cards[_i];
        _ref = card.patterns;
        if (card.format.test(num)) {
            return card.type;
        }
    }
};

const cardFromNumber = (num) => {
    var card, _i, _len;
    num = (num + '').replace(/\D/g, '');
    for (_i = 0, _len = cards.length; _i < _len; _i++) {
        card = cards[_i];
        //_ref = card.patterns;
        if (card.format.test(num)) {
            return card;
        }
    }
};

const appDataStore = {};

const setAppData = (key, data) => {
    appDataStore[key] = data;
};

const getAppData = (key) => {
    return appDataStore[key]
};

const isIE = () => {
    var ua = window.navigator.userAgent;
    var ie10orless = ua.indexOf('MSIE ');
    var ie11 = ua.indexOf('Trident/');
    var edge = ua.indexOf('Edge/');
    return !!(ie10orless > -1 || ie11 > -1 || edge > -1);
};

const addListener = (element, eventName, callback, options = false) => {
    if (window.addEventListener) {
        element.addEventListener(eventName, callback, options);
    } else if (window.attachEvent) {
        element.attachEvent('on' + eventName, callback, options);
    }
};

const getElement = (selector) => {
    const invalidSelectorMessage = `invalid selector ${selector}, it should be of the form of #id or .cssClass`;
    if (!selector || selector.length <= 1)
        throw new Error(invalidSelectorMessage);
    const identifierName = selector.slice(1);
    if (selector.indexOf('#') === 0) {
        var element = document.getElementById(identifierName);
        if (!element)
            throw new Error(`no element found with selector ${selector}`);
        else
            return element;
    } else if (selector.indexOf('.') == 0) {
        var elements = document.getElementsByClassName(identifierName);
        if (elements.length == 0) {
            throw new Error(`no element found with selector ${selector} .`)
        }
        if (elements.length == 1)
            return elements[0];
        if (elements.length > 1)
            throw new Error(`more then one element found for selector ${selector}`);
    } else
        throw new Error(invalidSelectorMessage);

};

const postMessageWrapper = (win, messageObj, url) => {
    messageObj.generatedBy = 'citrus';
    win.postMessage(JSON.parse(JSON.stringify(messageObj)), url);
};

const doValidation = (confObj,schema)=>{
    const validationResult = custValidate(confObj, schema);
        if (validationResult) {
            handlersMap['errorHandler'](validationResult);
            throw JSON.stringify(validationResult);
        }
};

const isIcpRequest = ()=>{
   return getConfig().page === PAGE_TYPES.ICP;
};

const isV3Request = (requestOrigin)=>{
   return (requestOrigin === TRACKING_IDS.SSLV3Guest || requestOrigin === TRACKING_IDS.SSLV3Wallet || requestOrigin === TRACKING_IDS.SSLV3Nitro);
};

const isPciRequest = ()=>{
    return getConfig().page === PAGE_TYPES.PCI;
};

const isExternalJsConsumer=(requestOrigin)=>{
    return !isIcpRequest()&&!isV3Request(requestOrigin);
};

const isIOS = ()=>{
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

const isUrl = (data) => {
    //regex for url
    const regexp = /^(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
    return regexp.test(data);
};

const getUid = ()=>{
    return UUID.generate();
}

export {
    validateAndCallbackify,
    getMerchantAccessKey,
    schemeFromNumber,
    cardFromNumber,
    setAppData,
    getAppData,
    isIE,
    addListener,
    getElement,
    postMessageWrapper,
    doValidation,
    isIcpRequest,
    isV3Request,
    isIOS,
    isUrl,
    getUid,
    isPciRequest,
    isExternalJsConsumer
};