import {handlersMap, getConfig} from './config';
import {validate} from 'validate.js';
import flow from 'lodash/flow';

//Important: This should be defined as 'function' and not as ES6 arrow function
//because arrow functions don't have 'arguments' object
const custValidate = function(){
    //Array.from(arguments) 's equivalent to in ES5/ES3 is Array.prototype.slice.call(arguments)
    //const args = Array.from(arguments);
    const args = Array.prototype.slice.call(arguments);

    if(args[2] === undefined){
        args[2] = {fullMessages: false}
    }else{ //if present
        args[2].fullMessages === undefined ? args[2].fullMessages = false : '';
    }

    //fullMessages false is required, otherwise following message gets printed
    //Main Object Check 'Code' key is not allowed in the config
    //instead of
    //'Code' key is not allowed in the config

    return validate.apply(null, args);

};

const enhanceWithValidation = (schema, func) =>{

    return (confObj) => {
        const validationResult = custValidate(confObj, schema);
        console.log('validation Result :: ', validationResult);
        if(validationResult){
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

        if(typeof args[args.length - 1] === 'function'){
            let cb = args.pop();
            promiseReturningFunc.apply(promiseReturningFunc, args)
                .then(function(success){
                    cb(undefined, success)
                }, function(err) {
                    cb(err);
                });
        }else{
            return promiseReturningFunc.apply(promiseReturningFunc, args);
        }
    }
};

const validateAndCallbackify = flow(enhanceWithValidation, callBackify);

const getMerchantAccessKey = (optionsObj) => {
    const merchantAccessKey = optionsObj.merchantAccessKey || getConfig().merchantAccessKey;
    if(!merchantAccessKey){
        return handlersMap.errorHandler(new Error('merchantAccessKey is not set'));
    }
    return merchantAccessKey;
};

//logic from jquery payment plugin

const defaultFormat = /(\d{1,4})/g;

const cards = [
    {
        type: 'visaelectron',
        patterns: [4026, 417500, 4405, 4508, 4844, 4913, 4917],
        format: defaultFormat,
        length: [16],
        cvcLength: [3],
        luhn: true
    }, {
        type: 'maestro',
        patterns: [5018, 502, 503, 56, 58, 639, 6220, 67],
        format: /^(?:5[0678]\d\d|6304|6390|6220|67\d\d)\d{8,15}$/,
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
        format: /^4/,
        length: [13, 16],
        cvcLength: [3],
        luhn: true
    }, {
        type: 'mastercard',
        patterns: [51, 52, 53, 54, 55, 22, 23, 24, 25, 26, 27],
        format: /^5[1-5]|22|23|24|25|26|27/,
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
    },
    {
        type: 'rupay',
        pattern: [60, 50, 65, 55, 69], // /^(60|50|65|55|69)/,
        format: /^(60|50|65|55|69)/,
        length: [16],
        cvcLength: [3],
        luhn: true
    }

];

const schemeFromNumber = function(num) {
    var card, p, pattern, _i, _j, _len, _len1, _ref;
    num = (num + '').replace(/\D/g, '');
    for (_i = 0, _len = cards.length; _i < _len; _i++) {
        card = cards[_i];
        _ref = card.patterns;
        for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
            pattern = _ref[_j];
            p = pattern + '';
            if (num.substr(0, p.length) === p) {
                return card.type;
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


export {validateAndCallbackify, getMerchantAccessKey, schemeFromNumber, setAppData, getAppData};
