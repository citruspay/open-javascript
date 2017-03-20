import {handlersMap, getConfig} from "./config";
import validate from "validate.js";
import flow from "lodash/flow";
import {PAGE_TYPES, TRACKING_IDS} from "./constants";
import {UUID} from "./external/uuid.core";

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

  const cards = [
    {
      type: 'maestro',
      patterns: [5018, 502, 503, 506, 56, 58, 639, 6220, 67],
      format: defaultFormat,
      length: [12, 13, 14, 15, 16, 17, 18, 19],
      cvcLength: [3],
      luhn: true
    }, {
      type: 'forbrugsforeningen',
      patterns: [600],
      format: defaultFormat,
      length: [16],
      cvcLength: [3],
      luhn: true
    }, {
      type: 'dankort',
      patterns: [5019],
      format: defaultFormat,
      length: [16],
      cvcLength: [3],
      luhn: true
    }, {
      type: 'visa',
      patterns: [4],
      format: defaultFormat,
      length: [13, 16],
      cvcLength: [3],
      luhn: true
    }, {
      type: 'mastercard',
      patterns: [51, 52, 53, 54, 55, 22, 23, 24, 25, 26, 27],
      format: defaultFormat,
      length: [16],
      cvcLength: [3],
      luhn: true
    }, {
      type: 'amex',
      patterns: [34, 37],
      format: /(\d{1,4})(\d{1,6})?(\d{1,5})?/,
      length: [15],
      cvcLength: [3, 4],
      luhn: true
    }, {
      type: 'dinersclub',
      patterns: [30, 36, 38, 39],
      format: /(\d{1,4})(\d{1,6})?(\d{1,4})?/,
      length: [14],
      cvcLength: [3],
      luhn: true
    }, {
      type: 'discover',
      patterns: [60, 64, 65, 622],
      format: defaultFormat,
      length: [16],
      cvcLength: [3],
      luhn: true
    }, {
      type: 'unionpay',
      patterns: [62, 88],
      format: defaultFormat,
      length: [16, 17, 18, 19],
      cvcLength: [3],
      luhn: false
    }, {
      type: 'jcb',
      patterns: [35],
      format: defaultFormat,
      length: [16],
      cvcLength: [3],
      luhn: true
    }
  ];

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
 
//checks whether the card number matches
//the regex for any particular card if 
//it matches it returns the card object which contains
//the card type(master,visa),pattern,cvvLength etc for that
const cardFromNumber = (num) => {
     var card, p, pattern, _i, _j, _len, _len1, _ref;
    num = (num + '').replace(/\D/g, '');
    for (_i = 0, _len = cards.length; _i < _len; _i++) {
      card = cards[_i];
      _ref = card.patterns;
      for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
        pattern = _ref[_j];
        p = pattern + '';
        if (num.substr(0, p.length) === p) {
          return card;
        }
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

const doValidation = (confObj, schema) => {
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

const isExternalJsConsumer = (requestOrigin)=> {
    return !isIcpRequest() && !isV3Request(requestOrigin);
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
};

//removes all spaces from an element, including space from sides and inbetween
const trim=(value)=>{
    if(!value)
        return value;
    else
        return value.replace(/\s+/g, '');
}

//if passed a number will convert it to
//float with given number of precision digits
//assumed the number to be on base 10
const convertToFloat=(value,digitsAfterDecimal,base=10)=>{
    //if value is falsy except 0 or value does not have
    //toFixed method return value as it is
    if(!value && value!==0)
        return value;
    let convertedValue = parseFloat(value,base);
    //if value is not in a format which can be converted to float
    //result will be NaN, if NaN return original value
    if(convertedValue!==convertedValue)
        return value;
    return convertedValue.toFixed(digitsAfterDecimal);
}
//todo:implement it later
const isCardSchemeSupported=(scheme)=>{};

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
    isExternalJsConsumer,
    trim,
    convertToFloat
};