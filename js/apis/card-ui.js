/**
 * Created by nagamai on 9/9/2016.
 */
import {cardFromNumber,schemeFromNumber,getAppData,addListener} from "./../utils";
import {getConfigValue} from '../ui-config';
import {validateExpiryDate, validateCreditCard} from './../validation/custom-validations';

let paymentField;
let field;
let cvvLen = 4;
let parentUrl = getAppData('parentUrl'); 
//todo:change its name later
let digit;
let parentUrl = getAppData('parentUrl');
const cardFieldHandler = () => {
    let fieldType = document.location.href.split("#");
    field = fieldType[1].split("-");
    paymentField = document.createElement("input");
    paymentField.setAttribute("id", field[0] + "citrusInput");
    document.body.appendChild(paymentField);
    var placeHolder = "";
    switch (field[0]) {
        case "cvv":
            placeHolder = "cvv";
            break;
        case "number":
            placeHolder = "card number";
            break;
        case "expiry":
            placeHolder = "expiry(mm/yy)";
            break;
    }
    var defaultStyle = {
        background: 0,
        display: 'inline-block',
        width: '78%',
        padding: "10px 0",
        fontSize: '13px',
        border:0
    };
    paymentField.setAttribute('placeholder', placeHolder);
    Object.assign(paymentField.style, defaultStyle);
    addEventListenersForHostedFields();
};

const postPaymentData = () => {
    //Send value of the field to the cardnumber iframe
    let cardData = {};
    cardData[field[0]] = paymentField.value;
    cardData.cardType = field[1];
    //todo:IMPORTANT, change * to citrus server url,
    //also if possible use name instead of index as index will be unreliable
    //if there are other iframes on merchant's page
    for(var i=0;i<parent.window.frames.length;i++)
    {parent.window.frames[i].postMessage(cardData, getConfigValue('hostedFieldDomain'));}
};

const addEventListenersForHostedFields = () => {
        //add the event listeners for ui validations of those fields.
        addListener(paymentField,"blur", postPaymentData, false);
        addListener(paymentField,"focus", addFocusAttributes, false);
        addListener(paymentField,"blur", removeFocusAttributes, false);        
        switch (field[0]) {
            case "number" :
                addListener(paymentField,"blur", validateCard, false);
                addListener(paymentField,'keypress', restrictNumeric, false);
                addListener(paymentField,'keypress', restrictCardNumber, false);
                addListener(paymentField,'keypress', formatCardNumber, false);
                addListener(paymentField,'input', reFormatCardNumber, false);
                break;
            case "expiry" :
                addListener(paymentField,"blur", validateExpiry, false);
                addListener(paymentField,'keypress', restrictNumeric, false);
                addListener(paymentField,'keypress', formatExpiry, false);
                addListener(paymentField,'input', reformatExpiry, false);
                break;
            case "cvv"    :
                addListener(paymentField,'blur', validateCvv, false);
                paymentField.setAttribute("type", "password");
                addListener(paymentField,'keypress', restrictNumeric, false);
                addListener(paymentField,'keypress', restrictCVC, false);
                break;
        }
};

const addFocusAttributes=()=>{
    var hostedField = getAppData('hostedField');
    let focusReceivedMessage = {messageType:'focusReceived',fieldType:field[0],hostedField};
    parent.postMessage(focusReceivedMessage,getParentUrl());
}

const removeFocusAttributes =()=>{
     var hostedField = getAppData('hostedField');
    let focusLostMessage = {messageType:'focusLost',fieldType:field[0],hostedField};
    parent.postMessage(focusLostMessage,getParentUrl());
}

const formatCardNumber = () => {
    let num = paymentField.value;

    var card, groups, upperLength, _ref;
    card = cardFromNumber(num);
    if (!card) {
        return num;
    }
    upperLength = card.length[card.length.length - 1];
    num = num.replace(/\D/g, '');
    num = num.slice(0, upperLength);
    if (card.groupingFormat.global) {
        paymentField.value = (_ref = num.match(card.groupingFormat)) != null ? _ref.join(' ') : void 0;
    } else {
        groups = card.groupingFormat.exec(num);
        if (groups == null) {
            return;
        }
        groups.shift();
        groups = groups.filter(function (n) {
            return n;
        });
        paymentField.value = groups.join(' ');
    }
};

const hasTextSelected = (target) => {
    var _ref;
    if ((target.selectionStart != null) && target.selectionStart !== target.selectionEnd) {
        return true;
    }
    return !!(typeof document !== "undefined" && document !== null ? ( _ref = document.selection) != null ? typeof _ref.createRange === "function" ? _ref.createRange().text :
        void 0 :
        void 0 :
        void 0);

};

const formatExpiry = (e) => {
    let expiry = paymentField.value;
    var mon,
        parts,
        sep,
        year;
    parts = expiry.match(/^\D*(\d{1,2})(\D+)?(\d{1,4})?/);
    if (!parts) {
        paymentField.value = '';
        return;
    }
    mon = parts[1] || '';
    sep = parts[2] || '';
    year = parts[3] || '';
    if (year.length > 0 || (sep.length > 0 && !(/\ \/?\ ?/.test(sep)))) {
        sep = ' / ';
    }
    if (mon.length === 1 && (mon !== '0' && mon !== '1')) {
        mon = "0" + mon;
        sep = ' / ';
    }
    //check added for backspace key
    if(e.which<57) digit = e.which;
    if (digit< 57 && mon.length === 2)
    {
         sep = ' / ';
        digit = 60;
    }
    paymentField.value = mon + sep + year;
};

const restrictNumeric = (e) => {
    var input;
    if (e.metaKey || e.ctrlKey) {
        return true;
    }
    if (e.which === 32) {
        return false;
    }
    if (e.which === 0) {
        return true;
    }
    if (e.which < 33) {
        return true;
    }
    input = String.fromCharCode(e.which);
    //e.preventDefault ? e.preventDefault() : (e.returnValue = false);
    if(!/[\d\s]/.test(input)) e.preventDefault();
    //return !!/[\d\s]/.test(input);
};

//to avoid the acceptance of one extra digit in the field,
//and also formats the card number while pasting the number directly inside the field
const reFormatCardNumber = () => {
    return setTimeout(function () {
        formatCardNumber(paymentField.value);
    });
};
//to avoid the acceptance of one extra digit in the field
//and also formats the card number while pasting the number directly inside the field
const reformatExpiry = () => {
    return setTimeout(function () {
        formatExpiry(paymentField.value);
    });
};

// const restrictCVC = (e) => {
//     var digit,
//         keyCode;
//     //$target = $(e.currentTarget);
//     keyCode = e.which || e.keyCode;
//     digit = String.fromCharCode(keyCode);
//     if (!/^\d+$/.test(digit)) {
//         e.preventDefault ? e.preventDefault() : (e.returnValue = false);
//         return;
//     }
//     if (hasTextSelected(paymentField)) {
//         return;
//     }
//     e.preventDefault ? e.preventDefault() : (e.returnValue = false);
//     paymentField.value.length < cvvLen ? paymentField.value = paymentField.value + digit : (e.returnValue = false);
// };

const restrictCardNumber = function(e) {
    let card,
        digit,
        value;
    digit = String.fromCharCode(e.which);
    if (!/^\d+$/.test(digit)) {
        return;
    }
    if (hasTextSelected(paymentField)) {
        return;
    }
    value = (paymentField.value + digit).replace(/\D/g, '');
    card = cardFromNumber(value);
    if (card) {
        if(value.length > card.length[card.length.length - 1]) e.preventDefault();
    } else {
        if(value.length > 16) e.preventDefault();
    }
};

// const formatForwardExpiry = (e) => {
//     var $target,
//         digit,
//         val;
//     digit = String.fromCharCode(e.which);
//     if (!/^\d+$/.test(digit)) {
//         return;
//     }
//     $target = $(e.currentTarget);
//     val = $target.val();
//     if (/^\d\d$/.test(val)) {
//         return $target.val("" + val + " / ");
//     }
// };
//todo: change the value of these two fields
//if the card number does not require cvv or field;
let isExpiryRequired = true;
let isCvvRequired = true;
const validateCard = () => {
    const num = paymentField.value.replace(/\s+/g, '');
    var cardType = getAppData('cardType');
    var hostedField = getAppData('hostedField');
    let validationResult = {fieldType:'number',messageType:'validation',hostedField,cardType};
    if(!num){
        validationResult.cardValidationResult = {"isValidCard": false, "txMsg": 'Card nubmer can not be empty.',isValid:false};
        toggleValidity(false);
        parent.postMessage(validationResult,getParentUrl());
        return;
    }
    const scheme = schemeFromNumber(num);
    //todo : add check for maestro and rupay
    const isValidCard = validateCreditCard(num, scheme);
    let txMsg = "";
    if(!isValidCard) txMsg = "Invalid card number";
    validationResult.cardValidationResult = {"isValidCard": isValidCard, "txMsg": txMsg,isValid:isValidCard};
    parentUrl = getAppData('parentUrl');
    toggleValidity(isValidCard);
    parent.postMessage(validationResult, parentUrl);
};
const validateExpiry = () => {
    var hostedField = getAppData('hostedField');
    var cardType = getAppData('cardType');
    const exp = paymentField.value.replace(/\s+/g, '');
    let validationResult = {fieldType:'expiry',messageType:'validation',hostedField,cardType};
    if(!exp)
    {
        validationResult.cardValidationResult = {"isValidExpiry": false, "txMsg": 'Expiry date can not be empty.',isValid:false};
        toggleValidity(false);
        parent.postMessage(validationResult,getParentUrl());
        return;
    }
    const isValidExpiryDate = validateExpiryDate(exp);
    let txMsg = "";
    if(!isValidExpiryDate) {
        txMsg = "Invalid expiry date";
    }
    validationResult.cardValidationResult={"isValidExpiry" : isValidExpiryDate, "txMsg": txMsg,isValid:isValidExpiryDate};
    parentUrl = getAppData('parentUrl');
    toggleValidity(isValidExpiryDate);
    parent.postMessage(validationResult, parentUrl);
};

const toggleValidity = (isValid)=>{
    let classNameToAdd = ' invalid',classNameToRemove = ' valid';
    if(isValid)
    {
        classNameToAdd=' valid';
        classNameToRemove = ' invalid';
    }
    paymentField.className = paymentField.className.replace(classNameToRemove,'');
    if(paymentField.className.indexOf(classNameToAdd)===-1)
        paymentField.className += classNameToAdd;
}

const validateCvv = () =>{
    var hostedField = getAppData('hostedField');
    var cardType = getAppData('cardType');
    const cvv = paymentField.value.replace(/\s+/g, '');
     let validationResult = {fieldType:'cvv',messageType:'validation',hostedField,cardType};
    if(!cvv)
    {
        validationResult.cardValidationResult = {"isValidCvv": false, "txMsg": 'Cvv can not be empty.',isValid:false};
        toggleValidity(false);
        parent.postMessage(validationResult,getParentUrl());
        return;
    }
    else
    {
        validationResult.cardValidationResult = {"isValidCvv": true, "txMsg": '',isValid:true};
        toggleValidity(true);
        parent.postMessage(validationResult,getParentUrl());
        return;
    }
}

const restrictCVC = (e) => {
    var digit, val;
    digit = String.fromCharCode(e.which);
    if (!/^\d+$/.test(digit)) {
        return;
    }
    if (hasTextSelected(paymentField)) {
        return;
    }
    val = paymentField.value + digit;
    if(val.length > 4)  e.preventDefault();
};

const getParentUrl = ()=>{
  let url =  (window.location != window.parent.location)
            ? document.referrer
            : document.location.protocol+'//'+document.location.host;//getAppData('parentUrl');     
  return url;
}

export {cardFieldHandler, formatExpiry}