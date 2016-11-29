import {baseSchema} from "./../validation/validation-schema";
import cloneDeep from "lodash/cloneDeep";
import {urlReEx} from "../constants";
import {handlersMap, getConfig} from "../config";
import {getAppData, setAppData, isIE, getElement, postMessageWrapper,doValidation} from "./../utils";
import {singleHopDropOutFunction, singleHopDropInFunction} from "./singleHop";
import {refineMotoResponse} from "./response";
import {custFetch} from "../interceptor";
import {validPaymentTypes, getConfigValue, validHostedFieldTypes} from "../hosted-field-config";
import {makeNetBankingPayment} from "./net-banking";
import {motoCardValidationSchema} from "./cards";
import {handleDropIn, openPopupWindowForDropIn} from './drop-in';

let winRef = null;
//let cancelApiResp;
const citrusSelectorPrefix = 'citrus';
const regExMap = {
    'cardNumber': /^[0-9]{15,19}$/,
    'name': /^(?!\s*$)[a-zA-Z .]{1,50}$/,
    'CVV': /^[0-9]{3,4}$/, //todo: handle cases for amex
    url: urlReEx
};
let txnId;

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

const makeHostedFieldPayment = (paymentObj) => {
    txnId = paymentObj.merchantTxnId;
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
}

//parent listener
const listener = (event) => {
    try {
        if (event.origin !== getConfigValue('hostedFieldDomain'))
            return;
        switch (event.data.messageType) {
            case 'focusReceived':
            case 'focusLost':
                handleFocus(event);
                return;
            case 'validation':
                setAppData(event.data.hostedField.fieldType + '-' + event.data.cardType + '-validation', event.data.cardValidationResult);
                setAppData(event.data.hostedField.fieldType + '-' + event.data.cardType + '-ignore-validation', event.data.ignoreValidationBroadcast);

                //console.log('set event data for ' + event.data.hostedField.fieldType + '-' + event.data.cardType + '-validation');
                handleValidationMessage(event);
                return;
            case 'schemeChange':
                setAppData(event.data.cardType + 'scheme');
                setAppData(event.data.hostedField.fieldType + '-' + event.data.cardType + '-ignore-validation', event.data.ignoreValidationBroadcast);
                handleSchemeChange(event);
                return;
            case 'errorHandler':
            case 'serverErrorHandler':
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
                handleDropIn(motoResponse,winRef);

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

const handleSchemeChange = (event)=>{
    postMessageToChild('cvv',event.data.cardType,event.data,false);
    postMessageToChild('expiry',event.data.cardType,event.data,false);
}

const handleValidationMessage = (event) => {
    var hostedField = event.data.hostedField, cardValidationResult = event.data.cardValidationResult;
    //console.log(hostedField,cardValidationResult,'test');
    /*if (hostedField.fieldType === "number") {
        postMessageToChild('cvv', event.data.cardType, event.data, false);
        postMessageToChild('expiry', event.data.cardType, event.data, false);
    }*/
    //don't put invalid class and don't broadcast it to
    //the client either in case this boolean is true
    if (!event.data.ignoreValidationBroadcast) {
        toggleValidationClass(hostedField, cardValidationResult);
        let validationHandler = handlersMap['validationHandler'];
        if (validationHandler)
            validationHandler(hostedField, cardValidationResult);
    }
}

const toggleValidationClass = (hostedField, cardValidationResult) => {
    var element = getElement(hostedField.selector);
    element.className = element.className.replace('citrus-hosted-field-invalid', '').replace('citrus-hosted-field-valid', '');
    if (cardValidationResult.isValid) {
        element.className += ' citrus-hosted-field-valid';
    } else {
        element.className += ' citrus-hosted-field-invalid';
    }
}
const handleFocus = (event) => {
    var hostedField = event.data.hostedField;
    var element = getElement(hostedField.selector);
    if (event.data.messageType === "focusReceived") {
        element.className = element.className += ' citrus-hosted-field-focused';
    } else if (event.data.messageType === "focusLost") {
        element.className = element.className.replace('citrus-hosted-field-focused', '');
    }
}



const getHostedFieldByType = (fieldType, cardSetupType) => {
    let hostedFields = getAppData('hostedFields' + '-' + cardSetupType);
    for (var i = 0; i < hostedFields.length; ++i) {
        if (hostedFields[i].fieldType === fieldType)
            return hostedFields[i];
    }
}

//todo:refactor this code later
//assumed if the validationResult is not present for a hostedField
//it is invalid
const validateCardDetails = (cardSetupType) => {
    let err = {
        type: "errorHandler",
        messageType: "validation"
    };
    err.errors = [];
    let isValidCard = true;
    let validationResults = [];
    let requiredValidationFieldType = 'number';
    let validationResultKey = requiredValidationFieldType + '-' + cardSetupType + '-validation';
    let validationResult = getAppData(validationResultKey);
    let hostedField = getHostedFieldByType(requiredValidationFieldType, cardSetupType);
    let scheme;
    if (!validationResult) {
        postMessageToChild(requiredValidationFieldType, cardSetupType, {
            messageType: 'validate'
        });
        /*err.error = 'Card number can not be blank.';
         err.hostedField = hostedField;
         toggleValidationClass(hostedField,{isValid:false});*/
        return false;
    }
    if (!validationResult.isValid) {
        err.error = validationResult.txMsg;
        err.hostedField = hostedField;
        toggleValidationClass(hostedField, {
            isValid: false
        });
        return false;
    }
    if (validationResult.isValid) {
        let validHostedFieldTypesWithoutNumber = validHostedFieldTypes.filter((val) => {
            return val !== "number";
        });
        let hostedFieldsWithoutNumber = [];
        let ignoreValidationBroadcast;
        if (validationResult.scheme === "maestro") {
            let isValidField = true;
            //validate other keys if present
            for (var i = 0; i < validHostedFieldTypesWithoutNumber.length; ++i) {
                validationResultKey = validHostedFieldTypesWithoutNumber[i] + '-' + cardSetupType + '-validation';
                validationResult = getAppData(validationResultKey);
                ignoreValidationBroadcast = getAppData(validHostedFieldTypesWithoutNumber[i] + '-' + cardSetupType + '-ignore-validation');
                //console.log('validation result for key ', validationResultKey, validationResult, i,ignoreValidationBroadcast);
                hostedField = getHostedFieldByType(validHostedFieldTypesWithoutNumber[i], cardSetupType);
                hostedFieldsWithoutNumber.push(hostedField);
                if (validationResult)
                    validationResults.push(validationResult);


                if (validationResult /*&& !validationResult.isEmpty*/ ) {
                    err.error = validationResult.txMsg;
                    err.errors.push[validationResult.txMsg];
                    if (!validationResult.isValid) {
                        isValidCard = false;
                        isValidField = false;
                    }
                    if (!ignoreValidationBroadcast)
                        toggleValidationClass(hostedField, {
                            isValid: validationResult.isValid
                        });
                    else
                        postMessageToChild(validHostedFieldTypesWithoutNumber[i], cardSetupType, {
                            messageType: 'validate'
                        });
                }
                if (!validationResult)
                    postMessageToChild(validHostedFieldTypesWithoutNumber[i], cardSetupType, {
                        messageType: 'validate'
                    });

            }
        } else {
            for (var i = 0; i < validHostedFieldTypesWithoutNumber.length; ++i) {
                validationResultKey = validHostedFieldTypesWithoutNumber[i] + '-' + cardSetupType + '-validation';
                validationResult = getAppData(validationResultKey);
                ignoreValidationBroadcast = getAppData(validHostedFieldTypesWithoutNumber[i] + '-' + cardSetupType + '-ignore-validation');
                //console.log('validation result for key ', validationResultKey, validationResult, i,ignoreValidationBroadcast);
                hostedField = getHostedFieldByType(validHostedFieldTypesWithoutNumber[i], cardSetupType);
                if (validationResult)
                    validationResults.push(validationResult);
                if (validationResult) {
                    err.error = validationResult.txMsg;
                    err.errors.push[validationResult.txMsg];
                    if (!validationResult.isValid)
                        isValidCard = false;
                    if (!ignoreValidationBroadcast)
                        toggleValidationClass(hostedField, {
                            isValid: validationResult.isValid
                        });
                    else
                        postMessageToChild(validHostedFieldTypesWithoutNumber[i], cardSetupType, {
                            messageType: 'validate'
                        });

                }
                if (!validationResult) {
                    /*err.error = validHostedFieldTypesWithoutNumber[i] + ' can not be blank.';
                     err.errors.push[validHostedFieldTypesWithoutNumber[i] + ' can not be blank.'];
                     isValidCard = isValidCard && false;
                     toggleValidationClass(hostedField,{isValid:false});*/
                    postMessageToChild(validHostedFieldTypesWithoutNumber[i], cardSetupType, {
                        messageType: 'validate'
                    });
                    isValidCard = false;
                }
            }

        }
    }

    return isValidCard;
}

const postMessageToChild = (fieldType, cardType, message, isSetTimeoutRequired) => {
    let frameId = getCitrusFrameId(fieldType, cardType);
    if (isSetTimeoutRequired) {
        setTimeout(() => {
            postMessage(frameId, message);
        }, 0);
    } else {
        postMessage(frameId, message);
    }
}

const postMessage = (frameId, message) => {
    let childFrameDomain = getConfigValue('hostedFieldDomain');
    let win = document.getElementById(frameId).contentWindow;
    postMessageWrapper(win, message, childFrameDomain);
}

const getCitrusFrameId = (fieldType, cardType) => {
    return citrusSelectorPrefix + fieldType + '-' + cardType;
}

export {
    makeHostedFieldPayment,
    listener,
    postMessageToChild,
    getCitrusFrameId
};