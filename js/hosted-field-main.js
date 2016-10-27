/**
 * Created by nagamai on 9/9/2016.
 */
import {cardFromNumber,schemeFromNumber,getAppData,addListener,postMessageWrapper,setAppData} from "./utils";
import {getConfigValue,validHostedFieldTypes} from './hosted-field-config';
import {validateExpiryDate, validateCreditCard,isValidCvv,isValidExpiry} from './validation/custom-validations';
import {postMessageToChild} from './apis/payment';

let paymentField;
let field;
let cvvLen = 4;
//todo:change its name later
let digit;
let parentUrl = getAppData('parentUrl');
const addField = () => {
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
    /*let fieldTypesToPostData = validHostedFieldTypes.filter((value,index,arr)=>{
        return value!==field[0];
    });
    for(var i=0;i<fieldTypesToPostData.length;++i)
    postMessageToChild(fieldTypesToPostData[i],field[1],cardData,getConfigValue('hostedFieldDomain'));*/
    for(var i=0;i<parent.window.frames.length;i++)
    {
        postMessageWrapper(parent.window.frames[i], cardData, getConfigValue('hostedFieldDomain'));
        //console.log(parent.window.frames[i].id,'test');
    }
};

const addEventListenersForHostedFields = () => {
    //detect the ios user agent, since ios devices don't listen to blur events. ignore the microsoft user agent which also contains the ios keyword.
    let iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    let eventStr;
    iOS ? eventStr = "input" : eventStr = "blur";
        //add the event listeners for ui validations of those fields.
        addListener(paymentField,eventStr, postPaymentData, false);
        addListener(paymentField,"focus", addFocusAttributes, false);
        addListener(paymentField,"blur", removeFocusAttributes, false);
        addListener(paymentField,'paste', restrictPaste, false);        
        switch (field[0]) {
            case "number" :
                addListener(paymentField,eventStr, validateCardEventListener, false);
                addListener(paymentField,'input',detectScheme);
                addListener(paymentField,'keypress', restrictNumeric, false);
                addListener(paymentField,'keypress', restrictCardNumber, false);
                addListener(paymentField,'keypress', formatCardNumber, false);
                addListener(paymentField,'input', reFormatCardNumber, false);
                break;
            case "expiry" :
                addListener(paymentField,eventStr, validateExpiryEventListener, false);
                addListener(paymentField,'keypress', restrictNumeric, false);
                addListener(paymentField,'keypress', formatExpiry, false);
                addListener(paymentField,'input', reformatExpiry, false);
                break;
            case "cvv"    :
                addListener(paymentField,eventStr, validateCvvEventListener, false);
                paymentField.setAttribute("type", "password");
                addListener(paymentField,'keypress', restrictNumeric, false);
                addListener(paymentField,'keypress', restrictCVC, false);
                break;
        }
};


const detectScheme = ()=>{
    const num = paymentField.value.replace(/\s+/g, '');
    const scheme = schemeFromNumber(num);
    var setupType = getAppData('cardType');
    var hostedField = getAppData('hostedField');
    if(!scheme)
        return;
    var lastDetectedScheme = getAppData(setupType+'scheme');
    let schemeChangeMessage = {messageType:'schemeChange',scheme:scheme,hostedField, cardType:setupType};
    //console.log(lastDetectedScheme,scheme,setupType,'detectScheme');
    if(lastDetectedScheme!==scheme)
    {
        setAppData(setupType+'scheme',scheme);
        postMessageWrapper(parent,schemeChangeMessage,getParentUrl());
    }
}

const addFocusAttributes=()=>{
    var hostedField = getAppData('hostedField');
    let focusReceivedMessage = {messageType:'focusReceived',fieldType:field[0],hostedField};
    postMessageWrapper(parent, focusReceivedMessage, getParentUrl());
};
const removeFocusAttributes =()=>{
     var hostedField = getAppData('hostedField');
    let focusLostMessage = {messageType:'focusLost',fieldType:field[0],hostedField};
    postMessageWrapper(parent, focusLostMessage, getParentUrl());
};
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

//todo: change the value of these two fields
//if the card number does not require cvv or field;
let isExpiryRequired = true;
let isCvvRequired = true;
const validateCardEventListener=()=>{
    validateCard();
}
const validateCard = () => {
    const num = paymentField.value.replace(/\s+/g, '');
    var cardType = getAppData('cardType');
    var hostedField = getAppData('hostedField');
    let validationResult = {fieldType:'number',messageType:'validation',hostedField,cardType};
    if(!num){
        validationResult.cardValidationResult = {"txMsg": 'Card nubmer can not be empty.',isValid:false};
        toggleValidity(false);
        postMessageWrapper(parent, validationResult, getParentUrl());
        return;
    }
    const scheme = schemeFromNumber(num);
    //todo : add check for maestro and rupay
    const isValidCard = validateCreditCard(num, scheme);
    let txMsg = "";
    if(!isValidCard) txMsg = "Invalid card number";
    validationResult.cardValidationResult = {"txMsg": txMsg,isValid:isValidCard,scheme:scheme};
    parentUrl = getAppData('parentUrl');
    toggleValidity(isValidCard);
    postMessageWrapper(parent, validationResult, parentUrl);
};

const validateExpiryEventListener=()=>{
    validateExpiry(false);
}
const validateExpiry = (isCascadeFromNumberField) => {
    var hostedField = getAppData('hostedField');
    var cardType = getAppData('cardType');
    var scheme = getAppData(cardType+'scheme');
    const exp = paymentField.value.replace(/\s+/g, '');
    //console.log(scheme,exp,'test');
    let isEmpty = !exp;
    let isValid;
    var ignoreValidationBroadcast =isCascadeFromNumberField;
    
    let validationResult = {fieldType:'expiry',messageType:'validation',hostedField,cardType,ignoreValidationBroadcast};
     
    if(!scheme&&isEmpty)
    {
        validationResult.cardValidationResult = { "txMsg": 'Expiry date can not be empty.',isValid:false,isEmpty:true};
        isValid = false;
    }
    else if(isValidExpiry(exp,scheme)){
        validationResult.cardValidationResult = {txMsg:"",isValid:true};
        isValid = true;
    }
    else{
        let txMsg = 'Invalid Expiry date.';
        if(!exp){ 
            txMsg = 'Expiry date can not be empty.'
        }
        validationResult.cardValidationResult = {txMsg:txMsg,isValid:false};
        isValid = false;
    
    }
    parentUrl = getAppData('parentUrl');
    if(!isCascadeFromNumberField)
    {
        toggleValidity(isValid);
    }
    postMessageWrapper(parent,validationResult,getParentUrl());
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
};
const validateCvvEventListener = () =>{
    validateCvv(false);
}


const validateCvv = (isCascadeFromNumberField) =>{
    var hostedField = getAppData('hostedField');
    var cardType = getAppData('cardType');
    var scheme = getAppData(cardType+'scheme');
    const cvv = paymentField.value.replace(/\s+/g, '');
    //console.log(scheme,cvv,'inside validateCvv');
    var isValid = true;
     var isEmpty = !cvv;
     var ignoreValidationBroadcast =isCascadeFromNumberField;
     let validationResult = {fieldType:'cvv',messageType:'validation',hostedField,cardType,ignoreValidationBroadcast};
     if(!scheme&&isEmpty)
    {
        validationResult.cardValidationResult = {"txMsg": 'Cvv can not be empty.',isValid:false,isEmpty:true,
            };
        isValid = false;
    }
    else if(isValidCvv(cvv.length,scheme))
    {
        validationResult.cardValidationResult = { "txMsg": '',isValid:true,length:cvv.length};
        isValid = true;
    }
    else{
        let txMsg = 'Cvv can not be empty.'
        if(!isEmpty)
        txMsg = 'Cvv is invalid.'
        validationResult.cardValidationResult = {"isValidCvv": false, "txMsg": txMsg,isValid:false,length:cvv.length};
        isValid = false;
    }
    if(!isCascadeFromNumberField)
    {
        toggleValidity(isValid);
    }
    postMessageWrapper(parent, validationResult, getParentUrl());
    
};

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
};

const restrictPaste = (e) => {
    e.preventDefault();
};

export {addField, formatExpiry,validateCvv,validateExpiry,validateCard}