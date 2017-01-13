import {baseSchema} from "./../validation/validation-schema";
import cloneDeep from "lodash/cloneDeep";
import {urlReEx} from "../constants";
import {handlersMap, getConfig} from "../config";
import {getAppData, setAppData, getElement, postMessageWrapper, doValidation} from "./../utils";
import {singleHopDropOutFunction} from "./singleHop";
import {refineMotoResponse} from "./response";
import {validPaymentTypes, getConfigValue, validHostedFieldTypes} from "../hosted-field-config";
import {handleDropIn, openPopupWindowForDropIn} from "./drop-in";

let winRef = null;
let _dpCallback;
//let cancelApiResp;
const citrusSelectorPrefix = 'citrus';
const regExMap = {
    'cardNumber': /^[0-9]{15,19}$/,
    'name': /^(?!\s*$)[a-zA-Z .]{1,50}$/,
    'CVV': /^[0-9]{3,4}$/, //todo: handle cases for amex
    url: urlReEx
};

const hostedFieldPaymentObjschema = Object.assign(cloneDeep(baseSchema), {
    paymentDetails: {
        presence: true,
        keysCheck: ['type', 'holder','paymentMode']
    },
    "paymentDetails.holder": {
        presence: true,
        format: regExMap.name
    },
    mode:{presence:true,inclusion:{within:["dropOut","dropIn"],message:"invalid mode %{value} it should have one of these values dropIn, dropOut"}}

});
hostedFieldPaymentObjschema.mainObjectCheck.keysCheck.push('paymentDetails');

let savedCardPaymentObjSchema =  Object.assign(cloneDeep(baseSchema), {
    paymentDetails: {
        presence: true,
        keysCheck: ['paymentMode','token']
    },
     "paymentDetails.paymentMode": {
        presence: true
    },
    "paymentDetails.token":{
        presence:true
    },
    mode:{presence:true,inclusion:{within:["dropOut","dropIn"],message:"invalid mode %{value} it should have one of these values dropIn, dropOut"}}
});
savedCardPaymentObjSchema.mainObjectCheck.keysCheck.push('paymentDetails');

//parent call
const makeHostedFieldPayment = (paymentObj) => {
    // const paymentMode = paymentObj.paymentDetails.paymentMode.toLowerCase().replace(/\s+/g, '');
    //todo:remove dependency on paymentDetails.type, this code can cause problems late on.
    let cardSetupType = paymentObj.paymentDetails.type ? paymentObj.paymentDetails.type.toLowerCase() :'';
    let element = document.getElementById("citrusnumber-" + cardSetupType);
    //todo:check whether the below two lines are required, otherwise remove them
    if (!element){
        element = document.getElementById("citrusnumber-card");
        cardSetupType = 'card';
    }
    if (!element)
        throw new Error(`Either invalid paymentDetails type ${cardSetupType}, it should be either of these values ` + validPaymentTypes +
            ' or there was some problem in setting up hosted fields');
    const win = element.contentWindow;
    let message = {messageType:'makePayment'};
    message.pgSettingsData = getAppData('pgSettingsData');
    message.config = getConfig();
    message.paymentData = paymentObj;
    if (validateCardDetails(cardSetupType)) {
         doValidation(paymentObj,hostedFieldPaymentObjschema);
        if (paymentObj.mode.toLowerCase() !== "dropout") {
            //open pop up window here
            winRef = openPopupWindowForDropIn(winRef);
        }
        setAppData('paymentObj', paymentObj);
       postMessageWrapper(win,message,getConfigValue('hostedFieldDomain'));
    }
    else {
        //handle invalid fields
    }
};

//parent call
const makeSavedCardHostedFieldPayment = (savedCardFrameId) =>{
    const makeSavedCardHostedFieldPaymentInternal = (paymentObj)=>{
     doValidation(paymentObj,savedCardPaymentObjSchema);
        let cardSetupType = "savedCard";
    let savedFrameUid;
    if(savedCardFrameId)
    {
        savedFrameUid =  savedCardFrameId.split('citruscvv-savedCard-')[1]
    }
        let hostedField = getHostedFieldForSavedCard({_uid: savedFrameUid});
    let frameId = savedCardFrameId?savedCardFrameId:getCitrusFrameIdForSavedCard(hostedField);
    //console.log('farmeId',frameId,hostedField);
    let element = getElement('#'+frameId);
    if (!element)
        throw new Error(`Either invalid paymentDetails type ${cardSetupType}, it should be either of these values ` + validPaymentTypes +
            ' or there was some problem in setting up hosted fields');
    const win = element.contentWindow;
    let message = {messageType:'makeSavedCardPayment',cardType:'savedCard',scheme:hostedField.savedCardScheme};
    message.pgSettingsData = getAppData('pgSettingsData');
    message.config = getConfig();
    message.paymentData = paymentObj;
    if (validateSavedCardCvvDetails(hostedField)) {
        
        if (paymentObj.mode.toLowerCase() !== "dropout") {
            //open pop up window here
            winRef = openPopupWindowForDropIn(winRef);
        }
        setAppData('paymentObj', paymentObj);
       postMessageWrapper(win,message,getConfigValue('hostedFieldDomain'));
    }
    else {
        //handle invalid fields
    }
    };
    return makeSavedCardHostedFieldPaymentInternal;
};

//parent call
//parent listener
const listener = (event) => {
    try {
        if (event.origin !== getConfigValue('hostedFieldDomain'))
            return;
        var validationKeyPrefix;
        if(event.data.hostedField) 
            validationKeyPrefix = event.data.hostedField.fieldType + '-' + event.data.cardType;
        switch (event.data.messageType) {
            case 'focusReceived':
            case 'focusLost':
                handleFocus(event);
                return;
            case 'validation':
                if(event.data.cardType==="savedCard")
                {
                    validationKeyPrefix = getCitrusFrameIdForSavedCard(event.data.hostedField);
                }
                setAppData(validationKeyPrefix + '-validation', event.data.cardValidationResult);
                setAppData(validationKeyPrefix + '-ignore-validation', event.data.ignoreValidationBroadcast);
                //console.log('set event data for ' +validationKeyPrefix + '-validation');
                handleValidationMessage(event);
                return;
            case 'schemeChange':
                setAppData(event.data.cardType + 'scheme');
                setAppData(validationKeyPrefix+ '-ignore-validation', event.data.ignoreValidationBroadcast);
                handleSchemeChange(event);
                return;
            case 'fetchDynamicPricingToken':
                handleFetchDynamicPricingToken(event.data);
                return;
            case 'dynamicPriceToken':
                _dpCallback(event.data.dynamicPriceResponse);
                return;   
            case 'errorHandler':
            case 'serverErrorHandler':
                if(winRef)
                    winRef.close();
                handlersMap[event.data.messageType](event.data.error);
                return;
        }
        const motoResponse = event.data.response;
        const paymentObj = getAppData('paymentObj');
        if (motoResponse && motoResponse.redirectUrl) { //url check has to configured, currently its hardcoded
            if (paymentObj.mode.toLowerCase() === "dropout") {
                singleHopDropOutFunction(motoResponse.redirectUrl);
            } else {
                /* OL integration logic to be uncommented later*/
                // let htmlStr = motoResponse.redirectUrl.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"');
                // winRef.document.open("text/html", "replace");
                // winRef.document.write(htmlStr);
                // winRef.document.close();
                // return;
                /*End of OL integration logic*/
                handleDropIn(motoResponse,winRef,paymentObj);

        }
    } else {
            if (winRef) {
                winRef.close();
            }
            //if we did not get returnUrl from server, pass the motoResonse 
            //after modifying it, what particular case it handles need to be understood.
            const response = refineMotoResponse(motoResponse);
            handlersMap['serverErrorHandler'](response);

        }

    } catch (e) {
        console.log(e);
    }
};

//parent call
const handleFetchDynamicPricingToken = (data)=>{
    let dynamicPriceHandler = handlersMap['dynamicPriceHandlder'];
    let hostedField = event.data.hostedField;
    let cardType = event.data.cardType;
    const applyDynamicPricing = (dynamicPricingData,callback)=>{
        let frameId = getFrameId(hostedField,cardType);
        let data = cloneDeep(dynamicPricingData);
        data.paymentMode = (dynamicPricingData.paymentMode==="credit")?"CREDIT_CARD":"DEBIT_CARD";
        data.merchantAccessKey = getConfig().merchantAccessKey;
        let message = {messageType:'fetchDynamicPricingToken',dynamicPricingData:data,cardType,hostedField};
        message.config = getConfig(); 
        _dpCallback = callback;
        postMessage(frameId,message);
    };
    let dynamicPriceHandlerInstance = Object.create(Object.prototype,{applyDynamicPricing:{
        value:applyDynamicPricing,
        writable:false,
        configurable:false,
        enumerable:false
        }
    });
    if(dynamicPriceHandler)
        dynamicPriceHandler(dynamicPriceHandlerInstance);
};



const handleSchemeChange = (event)=>{
    postMessageToChild('cvv',event.data.cardType,event.data,false);
    postMessageToChild('expiry',event.data.cardType,event.data,false);
};

const handleValidationMessage = (event) => {
    var hostedField = event.data.hostedField, cardValidationResult = event.data.cardValidationResult;
    //console.log(hostedField,cardValidationResult,'test');
    //don't put invalid class and don't broadcast it to
    //the client either in case this boolean is true
    if (!event.data.ignoreValidationBroadcast) {
        toggleValidationClass(hostedField, cardValidationResult);
        let validationHandler = handlersMap['validationHandler'];
        if (validationHandler)
            validationHandler(hostedField, cardValidationResult);
    }
};

const toggleValidationClass = (hostedField, cardValidationResult) => {
    var element = getElement(hostedField.selector);
    element.className = element.className.replace('citrus-hosted-field-invalid', '').replace('citrus-hosted-field-valid', '');
    if (cardValidationResult.isValid) {
        element.className += ' citrus-hosted-field-valid';
    } else {
        element.className += ' citrus-hosted-field-invalid';
    }
};
const handleFocus = (event) => {
    var hostedField = event.data.hostedField;
    var element = getElement(hostedField.selector);
    if (event.data.messageType === "focusReceived") {
        element.className = element.className += ' citrus-hosted-field-focused';
    } else if (event.data.messageType === "focusLost") {
        element.className = element.className.replace('citrus-hosted-field-focused', '');
    }
};



const getHostedFieldByType = (fieldType, cardSetupType) => {
    let hostedFields = getAppData('hostedFields-' + cardSetupType);
    for (var i = 0; i < hostedFields.length; ++i) {
        if (hostedFields[i].fieldType === fieldType)
            return hostedFields[i];
    }
};

const getHostedFieldForSavedCard = ({_uid})=> {
    let hostedFields = getAppData('hostedFields-savedCard');
    let hostedField;
    for(var i=0;i<hostedFields.length; ++i){
        hostedField = hostedFields[i];
        if(hostedField._uid===_uid)
            return hostedField;
    }
};

//todo:refactor this code later
//assumed if the validationResult is not present for a hostedField
//it is invalid
const validateCardDetails = (cardSetupType) => {
    let isValidCard = true;
    //scheme does not matter while checking for validation of number field, simply passing false as the first parameter
    let fieldValidationResult = checkSingleFieldValidationResult(false,'number',cardSetupType);
    console.log(fieldValidationResult);
    if(!fieldValidationResult.isValidField)
        return false;
    else{
        if (fieldValidationResult.validationResult.scheme === "maestro") {
                isValidCard = validateCardFieldsOtherThenNumber(true,cardSetupType);
        } else {
           isValidCard = validateCardFieldsOtherThenNumber(false,cardSetupType);
        }
    }
    return isValidCard;
};

function validateCardFieldsOtherThenNumber(isMaestro,cardSetupType){
    let isValidCard = true;
    let isValidField = true;
    let fieldValidationResult;
    let validHostedFieldTypesWithoutNumber = validHostedFieldTypes.filter((val) => {
        return val !== "number";
    });
    for(var i = 0; i < validHostedFieldTypesWithoutNumber.length; ++i) {
       fieldValidationResult = checkSingleFieldValidationResult(isMaestro,validHostedFieldTypesWithoutNumber[i],cardSetupType);
       if(!fieldValidationResult.isValidField)
        isValidCard = false;
    }
    return isValidCard;
}

const checkSingleFieldValidationResult=(isMaestro,hostedFieldType, cardSetupType)=>{
    let validationKeyPrefix = hostedFieldType + '-'+cardSetupType;
    let validationResultKey = validationKeyPrefix+ '-validation';
    let ignoreValidationBroadcast = getAppData(validationKeyPrefix + '-ignore-validation');
    let hostedField = getHostedFieldByType(hostedFieldType, cardSetupType);
    let validationResult = getAppData(validationResultKey);
    console.log(validationKeyPrefix,validationResultKey,validationResult,hostedField,validationResult);
    let isValidField = true;
    if (validationResult) {
        if (!validationResult.isValid)
                isValidField = false;
        if (!ignoreValidationBroadcast)
            toggleValidationClass(hostedField, {
                            isValid: validationResult.isValid
            });
        else
            postMessageToChild(hostedFieldType, cardSetupType, {
                            messageType: 'validate'
            });
    }
    if (!validationResult) {
        postMessageToChild(hostedFieldType, cardSetupType, {
                        messageType: 'validate'
        }); 
        //if the card is Maestro and we don't have validationResult for the field
        //it means nothing has been entered into this field, as expiry, cvv is not reqiured for Maestro
        //treat those fields as valid, as Card number is always required so in that case empty should be invalid
        if(!isMaestro||hostedFieldType==="number")
            isValidField = false;
    }
    return {validationResult,isValidField};
}
const validateSavedCardCvvDetails = (hostedField)=>{
    let validationKeyPrefix = getCitrusFrameIdForSavedCard(hostedField);
    let validationResultKey = validationKeyPrefix+'-validation';
    let validationResult = getAppData(validationResultKey);
    let ignoreValidationBroadcast = getAppData(validationKeyPrefix + '-ignore-validation');
    let isValidCard = true;
    if (validationResult) {
        if (!validationResult.isValid)
            isValidCard = false;
        if (!ignoreValidationBroadcast)
            toggleValidationClass(hostedField, {
                            isValid: validationResult.isValid
            });
        else
            postMessageToSavedCardFrame(hostedField, {
                            messageType: 'validate'
            });
    }
    if (!validationResult && hostedField.savedCardScheme && hostedField.savedCardScheme != "Maestro") {
        postMessageToSavedCardFrame(hostedField, {
                        messageType: 'validate'
                    });
        isValidCard = false;
    }
    return isValidCard;
};




const postMessageToChild = (fieldType, cardType, message, isSetTimeoutRequired) => {
    let frameId = getCitrusFrameId(fieldType, cardType);
    if (isSetTimeoutRequired) {
        setTimeout(() => {
            postMessage(frameId, message);
        }, 0);
    } else {
        postMessage(frameId, message);
    }
};

const postMessageToSavedCardFrame=(hostedField,message,isSetTimeoutRequired)=>{
    let frameId = getCitrusFrameIdForSavedCard(hostedField);
    if (isSetTimeoutRequired) {
        setTimeout(() => {
            postMessage(frameId, message);
        }, 0);
    } else {
        postMessage(frameId, message);
    }
};

const postMessage = (frameId, message) => {
    let childFrameDomain = getConfigValue('hostedFieldDomain');
    let win = document.getElementById(frameId).contentWindow;
    postMessageWrapper(win, message, childFrameDomain);
};

//todo:refactor both these methods to one method later on
const getCitrusFrameId = (fieldType, cardType) => {
    return citrusSelectorPrefix + fieldType + '-' + cardType;
};

const getCitrusFrameIdForSavedCard = (hostedField)=>{
    return citrusSelectorPrefix + 'cvv-savedCard-' + hostedField._uid;
};

const getFrameId=(hostedField,cardType)=>{
    if(cardType==='savedCard')
        return getCitrusFrameIdForSavedCard(hostedField);
     else
        return getCitrusFrameId(hostedField.fieldType,cardType);
};

export {
    makeHostedFieldPayment,
    makeSavedCardHostedFieldPayment,
    listener,
    postMessageToChild,
    postMessageToSavedCardFrame,
    getCitrusFrameId,
    getCitrusFrameIdForSavedCard,
    getFrameId
};