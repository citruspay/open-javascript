import {baseSchema} from "./../validation/validation-schema";
import cloneDeep from "lodash/cloneDeep";
import {urlReEx} from "../constants";
import {handlersMap, getConfig} from "../config";
import {getAppData, setAppData, isIE, getElement} from "./../utils";
import {singleHopDropOutFunction, singleHopDropInFunction} from "./singleHop";
import {refineMotoResponse} from "./response";
import {custFetch} from "../interceptor";
import {validPaymentTypes, getConfigValue, validHostedFieldTypes} from "../ui-config";

//this file is hosted fields specific
//todo:change the file name later
let winRef = null;
let cancelApiResp;
const regExMap = {
    'cardNumber': /^[0-9]{15,19}$/,
    'name': /^(?!\s*$)[a-zA-Z .]{1,50}$/,
    'CVV': /^[0-9]{3,4}$/, //todo: handle cases for amex
    url: urlReEx
};
let txnId;
const motoCardValidationSchema = Object.assign(cloneDeep(baseSchema), {
    paymentDetails: {
        presence: true,
        cardCheck: true,
        keysCheck: ['type', 'number', 'holder', 'cvv', 'expiry']
    },
    "paymentDetails.holder": {
        presence: true,
        format: regExMap.name
    }
});

motoCardValidationSchema.mainObjectCheck.keysCheck.push('paymentDetails');
const makePayment = (paymentObj) => {
    txnId = paymentObj.merchantTxnId;
    // const paymentMode = paymentObj.paymentDetails.paymentMode.toLowerCase().replace(/\s+/g, '');
    let paymentDetailsType = paymentObj.paymentDetails.type ? paymentObj.paymentDetails.type.toLowerCase() : 'card';
    let element = document.getElementById("citrusnumber-" + paymentDetailsType);
    //todo:check whether the below two lines are required, otherwise remove them
    //
    if (!element)
        element = document.getElementById("citrusnumber-card");
    if (!element)
        throw new Error(`Either invalid paymentDetails type "${paymentDetailsType}", it should be either of these values ` + validPaymentTypes +
            ' or there was some problem in setting up hosted fields');
    const win = element.contentWindow;
    paymentObj.pgSettingsData = getAppData('pgSettingsData');
    paymentObj.config = getConfig();
    if (validateCardDetails(paymentDetailsType)) {
        if (paymentObj.mode.toLowerCase() !== "dropout") {
            winRef = openPopupWindow("");
            winRef.document.write('<html><head> <meta name="viewport" content="width=device-width"/> <meta http-equiv="Cache-control" content="public"/> <title>Redirecting to Bank</title></head><style>body{background: #fafafa;}#wrapper{position: fixed; position: absolute; top: 10%; left: 0; right: 0; margin: 0 auto; font-family: Tahoma, Geneva, sans-serif; color: #000; text-align: center; font-size: 14px; padding: 20px; max-width: 500px; width: 70%;}.maintext{font-family: Roboto, Tahoma, Geneva, sans-serif; color: #f6931e; margin-bottom: 0; text-align: center; font-size: 16pt; font-weight: 400;}.textRedirect{color: #675f58;}.subtext{margin: 15px 0 15px; font-family: Roboto, Tahoma, Geneva, sans-serif; color: #929292; text-align: center; font-size: 10pt;}.subtextOne{margin: 35px 0 15px; font-family: Roboto, Tahoma, Geneva, sans-serif; color: #929292; text-align: center; font-size: 10pt;}@media screen and (max-width: 480px){#wrapper{max-width: 100%!important;}}</style><body> <div id="wrapper"> <div id="imgtext" style="margin-left:1%; margin-bottom: 5px;"><!--<img src="https://context.citruspay.com/kiwi/images/logo.png"/>--> </div><div id="imgtext" style="text-align:center;padding: 15% 0 10%;"><!---<img src="https://context.citruspay.com/kiwi/images/puff_orange.svg"/>--></div><p class="maintext">Processing <span class="textRedirect">Payment</span> </p><p class="subtext"><span>We are redirecting you to the bank\'s page</span></p><p class="subtextOne"><span>DO NOT CLOSE THIS POP-UP</span> </p></div></body></html>');
        }
        setAppData('paymentObj', paymentObj);
        win.postMessage(paymentObj, getConfigValue('hostedFieldDomain'));
    }
};

//parent listener
const listener = (event) => {
    try {
        //console.log('inside listener',event.data);
        switch (event.data.messageType) {
            case 'focusReceived':
            case 'focusLost':
                handleFocus(event);
                return;
            case 'validation':
                //todo:remove this code,
                //keys[0] can change any time the object is being changed
                //should use an explicit key
                let keys = Object.keys(event.data.cardValidationResult);
                setAppData(event.data.hostedField.fieldType + '-' + event.data.cardType + '-validation', event.data.cardValidationResult);
                console.log('set event data for ' + event.data.hostedField.fieldType + '-' + event.data.cardType + '-validation');
                handleValidationMessage(event);
                return;
        }
        const motoResponse = event.data;
        const paymentObj = getAppData('paymentObj');
        if (event.origin === getConfigValue('hostedFieldDomain') && motoResponse.redirectUrl) { //url check has to configured, currently its hardcoded
            if (paymentObj.mode.toLowerCase() === "dropout") {
                singleHopDropOutFunction(motoResponse.redirectUrl);
            } else {
                // if(winRef && winRef.closed)
                // {
                //     //handlersMap["serverErrorHandler"](response);
                //     return;
                // }
                /* OL integration logic to be uncommented later*/
                // let htmlStr = motoResponse.redirectUrl.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"');
                // winRef.document.open("text/html", "replace");
                // winRef.document.write(htmlStr);
                // winRef.document.close();
                // return;
                /*End of OL integration logic*/
                singleHopDropInFunction(motoResponse.redirectUrl).then(function(response) {
                    if (winRef && winRef.closed !== true) {
                        /*start of OL integration logic*/
                        // winRef.document.write(response);
                        // return;
                        /*end of OL integration logic*/
                        let el = document.createElement('body');
                        el.innerHTML = response;
                        let form = el.getElementsByTagName('form');
                        try {
                            let paymentForm = document.createElement('form');
                            paymentForm.setAttribute("action", form[0].action),
                                paymentForm.setAttribute("method", form[0].method),
                                paymentForm.setAttribute("target", winRef.name),
                                paymentForm.innerHTML = form[0].innerHTML,
                                document.documentElement.appendChild(paymentForm),
                                paymentForm.submit(),
                                document.documentElement.removeChild(paymentForm);
                        } catch (e) {
                            console.log(e);
                        }

                    }
                    if (!isIE()) {
                        workFlowForModernBrowsers(winRef);
                    } else {
                        workFlowForIE(winRef);
                    }
                });
            }
        } else {
            if (winRef) {
                winRef.close();
            }
            const response = refineMotoResponse(motoResponse);
            handlersMap['serverErrorHandler'](response);

        }
        if (event.data.responseType === "errorHandler") handlersMap['errorHandler'](event.data.error);
        if (event.data.responseType === "serverErrorHandler") handlersMap['serverErrorHandler'](event.data.error);
    } catch (e) {
        console.log(e);
    }
};

const handleValidationMessage = (event) => {
    var hostedField = event.data.hostedField;
    var element = getElement(hostedField.identifier);
    element.className = element.className.replace('citrus-hosted-field-invalid', '').replace('citrus-hosted-field-valid', '');
    if (event.data.messageType === "validation") {
        if (event.data.cardValidationResult.isValid) {
            element.className += ' citrus-hosted-field-valid';
        } else {
            element.className += 'citrus-hosted-field-invalid';
        }
    }
}
const handleFocus = (event) => {
    console.log(event.data, 'inside handle focus');
    var hostedField = event.data.hostedField;
    var element = getElement(hostedField.identifier);
    if (event.data.messageType === "focusReceived") {
        element.className = element.className += ' citrus-hosted-field-focused';
    } else if (event.data.messageType === "focusLost") {
        element.className = element.className.replace('citrus-hosted-field-focused', '');
    }
}

const openPopupWindow = (url) => {
    if (winRef == null || winRef.closed) {
        var width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
        var height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;
        var w = 800;
        var h = 600;
        var left = ((width - w) / 2);
        var top = height / 10;
        winRef = window.open(url, 'CitrusOverlay', 'scrollbars=yes, width=' + w + ', height=' + h + ', top=' + top + ', left=' + left + 'visible=none;');
    } else {
        winRef.focus();
    }
    return winRef;
};

let transactionCompleted = false;

const workFlowForModernBrowsers = (winRef) => {
    var intervalId = setInterval(function() {
        if (transactionCompleted) {
            return clearInterval(intervalId);
        }
        if (winRef) {
            if (winRef.closed === true) {
                clearInterval(intervalId);
                let param = `accessKey=${getConfig().merchantAccessKey}&txnId=${txnId}`;
                const url = `${getConfig().pgUrl}/service/v0/redis/api/getTxnModel`;
                return custFetch(url, {
                    method: 'post',
                    mode: 'cors',
                    body: param,
                    headers: {
                        "content-type": "application/x-www-form-urlencoded"
                    }
                }).then(function(resp) {
                    handlersMap['transactionHandler'](resp.data);
                });
            }
        } else {
            clearInterval(intervalId);
        }
    }, 500);
};

const workFlowForIE = (winRef) => {
    const intervalId = setInterval(function() {
        if (transactionCompleted) {
            return clearInterval(intervalId);
        }
        if (winRef) {
            if (winRef.closed) {
                clearInterval(intervalId);
                let form = new FormData();
                let param = `accessKey=${getConfig().merchantAccessKey}&txnId=${txnId}`;
                const url = `${getConfig().pgUrl}/service/v0/redis/api/getTxnModel`;
                return custFetch(url, {
                    method: 'post',
                    mode: 'cors',
                    body: param,
                    headers: {
                        "content-type": "application/x-www-form-urlencoded"
                    }
                }).then(function(resp) {
                    handlersMap['transactionHandler'](resp.data);
                });
            }
        }
    }, 500);
};

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
    if (!validationResult) {
        err.error = 'Card number can not be blank.';
        return false;
    }
    if (!validationResult.isValid) {
        err.error = validationResult.txMsg;
        return false;
    }
    if (validationResult.isValid) {
        let validHostedFieldTypesWithoutNumber = validHostedFieldTypes.filter((val)=>{return val!=="number";});
        if (validationResult.scheme === "maestro") {
            //validate other keys if present
            for (var i = 0; i < validHostedFieldTypesWithoutNumber.length; ++i) {
                validationResultKey = validHostedFieldTypesWithoutNumber[i] + '-' + cardSetupType + '-validation';
                validationResult = getAppData(validationResultKey);
                console.log('validation result for key ', validationResultKey, validationResult, i);
                if (validationResult)
                    validationResults.push(validationResult);


                if (validationResult && !validationResult.isValid && !validationResult.isEmpty) {
                    err.error = validationResult.txMsg;
                    err.errors.push[validationResult.txMsg];
                    isValidCard = isValidCard && false;
                }
               
            }
        } else {
            for (var i = 0; i < validHostedFieldTypesWithoutNumber.length; ++i) {
                validationResultKey = validHostedFieldTypesWithoutNumber[i] + '-' + cardSetupType + '-validation';
                validationResult = getAppData(validationResultKey);
                console.log('validation result for key ', validationResultKey, validationResult, i);
                if (validationResult)
                    validationResults.push(validationResult);


                if (validationResult && !validationResult.isValid) {
                    err.error = validationResult.txMsg;
                    err.errors.push[validationResult.txMsg];
                    isValidCard = isValidCard && false;
                }
                if (!validationResult) {
                    err.error = validHostedFieldTypesWithoutNumber[i] + ' can not be blank.';
                    err.errors.push[validHostedFieldTypesWithoutNumber[i] + ' can not be blank.'];
                    isValidCard = isValidCard && false;
                }
            }

        }
    }

    return isValidCard;

    /*
    //{"type":"errorHandler","error":{"amount":["can't be blank"]}}
   if (("isValidCard" in validationResult) && !validationResult.isValidCard) {
        err.error = {"card number": [validationResult.txMsg]};
        handlersMap['errorHandler'](err);
        return false;
    }
    //console.log(validationResult);
    validationResult = getAppData('isValidExpiry');
    if (("isValidExpiry" in validationResult) && !validationResult.isValidExpiry) {
        err.error = {"expiry date": [validationResult.txMsg]};
        handlersMap['errorHandler'](err);
        return false;
    }
    validationResult = getAppData('isValidCvv');
    if (("isValidCvv" in validationResult) && !validationResult.isValidCvv) {
        err.error = {"cvv": [validationResult.txMsg]};
        handlersMap['errorHandler'](err);
        return false;
    }
    return true;*/
}
export {
    makePayment,
    listener
};