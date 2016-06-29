import isCardValid from './credit-card-validation';
import some from '../../node_modules/lodash/some';
import {validate as v} from 'validate.js';
import {schemeFromNumber, getAppData} from '../utils';
import {handlersMap,getConfig} from '../config'


const keysCheck = (value, options, key, attributes) => {
    //bit hackish as validate.js doesn't provide option to do main object checks
    if(key === 'mainObjectCheck') value = attributes;

    if(!value) return; // if field is not mandatory then do nothing

    const inputKeys = Object.keys(value);
    const constraintKeys = options; // array of keys
    let extraKey;
    const isOk = inputKeys.every(key => {
        if (constraintKeys.indexOf(key) > -1){
            return true;
        }else{
            extraKey = key;
            return false;
        }
    });

    if(!isOk){ return `'${extraKey}' key is not allowed in the config`}

};

/**
 * @param {String} dateStr
 * @returns {Boolean} returns true if valid date string, else false
 */

const validateExpiryDate = (dateStr) => {

   	var d = dateStr.slice(3);
        if(d.length==2){
            var today = new Date();
            var year = today.getFullYear().toString().slice(0,2);
            dateStr = dateStr.toString().slice(0,3) + year + d;
        }

    var today = new Date();
    var month = today.getMonth() + 1;

    var expiry = dateStr.replace(/\s+/g, '').replace("/", "");
    var inputMonth = expiry.substr(0, 2);
    var inputYear = expiry.slice(-4);
    var len = expiry.length;
    var year = today.getFullYear().toString().slice(-4);

    let returnVal = true;

    if (len == 6) {
        if (!(((inputMonth < month && inputYear > year) || (inputMonth >= month && inputYear >= year)) 
            && inputMonth <= 12 && inputYear<=(parseInt(year)+50).toString())) {
            returnVal = false;
        }
    }
    else {
        returnVal = false;
    }
    
    return returnVal;
};

//copied from old citrus.js

const cardDate = (value) => {
    if(validateExpiryDate(value)){
        return value;
    };
    handlersMap['errorHandler']("Expiry date is invalid");
    throw ("Expiry date is invalid");
};

const schemeMap = {
    Visa : {
        aliases: ['visa', 'visacard'],
        serverAlias: 'VISA'
    },
    MasterCard : {
        aliases: ['mcrd', 'master', 'mastercard', 'mcard'],
        serverAlias: 'MCRD' //todo: to handle for blazecard - it needs MASTERCARD
    },
    Maestro : {
        aliases: ['maestro', 'mastro', 'mtro', 'maestrocard'],
        serverAlias: 'MTRO'
    },
    VisaElectron : {
        aliases: ['visaelectron', 'electron']
    },
    AmEx :{
        aliases: ['amex', 'americanexpress', 'americanex'],
        serverAlias: 'AMEX'
    },
    DinersClub : {
        aliases: ['dinersclub', 'diners', 'diner'],
        serverAlias: 'DINERS'
    },
    CarteBlanche : {
        aliases: ['carteblanche', 'carte']
    },
    Discover : {
        aliases: ['discover']
    },
    JCB : {
        aliases: ['jcb']
    },
    enRoute :{
        aliases : ['enroute', 'enrout']
    },
    Solo : {
        aliases: ['solo']
    },
    Switch: {
        aliases: ['switch']
    },
    LaserCard: {
        aliases: ['lasercard', 'laser']
    },
    Rupay : {
        aliases: ['rupay', 'rupaycard'],
        serverAlias: 'RPAY'
    }
};

/**
 * validates given card scheme and returns formatted scheme
 * @param  {String} scheme
 * @param {true | falsy} ingnoreServerAlias if falsy returns serverAlias else returns internal key,
 * @returns {false | String} returns either false or casted scheme as string
 */
const validateScheme = (scheme, ignoreServerAlias) => {
    scheme = scheme.toLowerCase().replace(/\s+/g, '');

    const found = some(schemeMap, (config, cardType) => {
        if (
            some(config.aliases, (val) => {
                return scheme === val;
            })
        ){
            scheme = ignoreServerAlias ? cardType : config.serverAlias || cardType ;
            return true;
        }
    });
    
    return found ? scheme : false;
};

const typeMap = {
    'credit' : ['credit', 'creditcard'],
    'debit' : ['debit', 'debitcard']
};

const validateCardType = (type) => {
    type = type.toLowerCase().replace(/\s+/g, '');

    const found = some(typeMap, (aliasArr, name) => {
        if (
            some(aliasArr, (val) => {
                return type === val;
            })
        ){
            type = name;
            return true;
        }
    });
    return found ? type : false;
};

//cardCheck
const validateCvv = (value,scheme) => {

    if(scheme === 'amex' && value.length == 4)
    {
        return value;
    }else if(value.length > 0 && value.length < 4){
        return value;
    }

    handlersMap['errorHandler']("CVV is invalid");
    throw ("CVV is invalid");

};

const cardCheck = (paymentDetails, options, key, attributes) => {
    if(options !== true) return;
    const validatedCardType = validateCardType(paymentDetails.type);

    if(validatedCardType === 'credit' || validatedCardType === 'debit'){
        let scheme = validateScheme(schemeFromNumber(paymentDetails.number), true);//validateScheme(paymentDetails.scheme, true);

        if(!scheme) { return ' :invalid scheme type'}

        if(!getConfig().fastForward && getAppData('pgSettingsData')[validatedCardType+'Card'].indexOf( validateScheme(scheme, false)) < 0 ){
            return ':cardscheme is not supported';
        }

        if(scheme !== 'Maestro'){
            if (!isCardValid(paymentDetails.number)){
                return ' :invalid credit card number';
            }
        }
    }else{
        return ' :invalid card type';
    }
};

const blazeCardCheck = (paymentDetails, options, key, attributes) => {

    if(options !== true) return;
    if(key === 'mainObjectCheck') paymentDetails = attributes;
    const validatedCardType = validateCardType(paymentDetails.cardType);

    if(validatedCardType === 'credit' || validatedCardType === 'debit'){
        let scheme = validateScheme(paymentDetails.cardScheme, true);
        //todo: handle schemecheck for blazecard

        if(!scheme) { return ' :invalid scheme type'}

        if(scheme !== 'Maestro'){
            if (!isCardValid(paymentDetails.cardNo, scheme)){
                return ' :invalid credit card number';
            }
        }
    }else{
        return ' :invalid card type';
    }
};

//created custFormat validator as original 'format' validator uses .exec instead of .test on regex
// this is based on original 'format' validator itself.
const custFormat = function(value, options) {
    if (v.isString(options) || (options instanceof RegExp)) {
        options = {pattern: options};
    }

    options = v.extend({}, this.options, options);

    var message = options.message  || "is invalid"
        , pattern = options.pattern
        , match;

    // Empty values are allowed
    if (v.isEmpty(value)) {
        return;
    }
    if (!v.isString(value)) {
        return message;
    }

    if (v.isString(pattern)) {
        pattern = new RegExp(options.pattern, options.flags);
    }

    /*match = pattern.exec(value);
    if (!match || match[0].length != value.length) {
        return message;
    }*/
    if(!pattern.test(value)){
        return message;
    }
};

const validateCreditCard = (cardNo, scheme) =>{
    return isCardValid(cardNo, validateScheme(scheme, true));
};


export { keysCheck, cardDate, cardCheck, custFormat, validateScheme, validateExpiryDate, validateCvv,
    validateCreditCard, validateCardType, blazeCardCheck }