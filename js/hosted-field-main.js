/**
 * Created by nagamai on 9/9/2016.
 */
import {cardFromNumber,schemeFromNumber,getAppData,addListener,postMessageWrapper,setAppData,isIOS} from "./utils";
import {getConfigValue} from './hosted-field-config';
import { validateCreditCard,isValidCvv,isValidExpiry} from './validation/custom-validations';
import {MIN_VALID_CARD_LENGTH} from './constants';

let _paymentField;
let field;
//todo:change its name later
let digit;
let parentUrl = getAppData('parentUrl');
const addField = () => {
    let fieldType = document.location.href.split("#");
    if(fieldType.length<2)
        return;
    field = fieldType[1].split("-");
    _paymentField = document.createElement("input");
    _paymentField.setAttribute("id", field[0] + "citrusInput");
    document.body.appendChild(_paymentField);
    //addEventListenersForHostedFields();
};


const postPaymentData = () => {
    //Send value of the field to the cardnumber iframe
    let message = {messageType:'cardData'};
    let cardData = {};
    cardData.value = _paymentField.value;
    cardData.key = field[0];
    message.cardType = field[1];
    message.cardData = cardData;
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
        postMessageWrapper(parent.window.frames[i], message, getConfigValue('hostedFieldDomain'));
        //console.log(parent.window.frames[i].id,'test');
    }
};

//in android browsers keypress does not fire
//keydown fires but the charCode is not usable
//so the input event is the one which prevent invalid entry in the case of android
//for all input fields.
const addEventListenersForHostedFields = (cardSetupType) => {
    //detect the ios user agent, since ios devices don't listen to blur events. ignore the microsoft user agent which also contains the ios keyword.
    let iOS = isIOS();
    let eventStr;
    iOS ? eventStr = "input" : eventStr = "blur";
        if(cardSetupType==="credit"||cardSetupType==="debit"||cardSetupType==="card")
            addListener(_paymentField,eventStr, postPaymentData, false);
         //add the event listeners for ui validations of those fields.    
        addListener(_paymentField,"focus", addFocusAttributes, false);
        addListener(_paymentField,"blur", removeFocusAttributes, false);
        addListener(_paymentField,'paste', restrictPaste, false);        
        switch (field[0]) {
            case "number" :
                addListener(_paymentField,eventStr, validateCardEventListener, false);
                addListener(_paymentField,'input',detectScheme);
                addListener(_paymentField,'keypress', restrictNumeric, false);
                addListener(_paymentField,'keypress', restrictCardNumber, false);
                addListener(_paymentField,'keypress', formatCardNumber, false);
                addListener(_paymentField,'input', reFormatCardNumber, false);
                break;
            case "expiry" :
                addListener(_paymentField,eventStr, validateExpiryEventListener, false);
                addListener(_paymentField,'keypress', restrictNumeric, false);
                addListener(_paymentField,'keypress', formatExpiry, false);
                addListener(_paymentField,'input', reformatExpiry, false);
                break;
            case "cvv"    :
                addListener(_paymentField,eventStr, validateCvvEventListener, false);
                _paymentField.setAttribute("type", "password");
                addListener(_paymentField,'keypress', restrictNumeric, false);
                addListener(_paymentField,'keypress', restrictCVC, false);
                //this is specifically for android, as keypress does not fire
                //on android
                addListener(_paymentField,'input',formatCvv,false);
                break;
        }
};


const detectScheme = ()=>{
    const num = _paymentField.value.replace(/\s+/g, '');
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
};

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
    let num = _paymentField.value;
    num = num.replace(/\D/g, '');
     var parts = num.match(/^\d{1,19}/);
    if (!parts) {
        _paymentField.value = '';
        return;
    }
    var card, groups, upperLength, _ref;
    card = cardFromNumber(num);
    if (!card) {
        return num;
    }
    upperLength = card.length[card.length.length - 1];
    num = num.replace(/\D/g, '');
    num = num.slice(0, upperLength);
    if (card.groupingFormat.global) {
        _paymentField.value = (_ref = num.match(card.groupingFormat)) != null ? _ref.join(' ') : void 0;
    } else {
        groups = card.groupingFormat.exec(num);
        if (groups == null) {
            return;
        }
        groups.shift();
        groups = groups.filter(function (n) {
            return n;
        });
        _paymentField.value = groups.join(' ');
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
    let expiry = _paymentField.value;
    var mon,
        parts,
        sep,
        year;
    parts = expiry.match(/^\D*(\d{1,2})(\D+)?(\d{1,4})?/);
    if (!parts) {
        _paymentField.value = '';
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
    _paymentField.value = mon + sep + year;
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

const formatCvv = ()=>{
   let cvv = _paymentField.value;
   cvv = cvv.replace(/\D/g, '');
    let parts = cvv.match(/^\d{1,4}/);
    if (!parts) {
        _paymentField.value = '';
        return;
    } 
}

//to avoid the acceptance of one extra digit in the field,
//and also formats the card number while pasting the number directly inside the field
const reFormatCardNumber = () => {
    return setTimeout(function () {
        formatCardNumber(_paymentField.value);
    });
};
//to avoid the acceptance of one extra digit in the field
//and also formats the card number while pasting the number directly inside the field
const reformatExpiry = () => {
    return setTimeout(function () {
        formatExpiry(_paymentField.value);
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
    if (hasTextSelected(_paymentField)) {
        return;
    }
    value = (_paymentField.value + digit).replace(/\D/g, '');
    card = cardFromNumber(value);
    if (card) {
        if(value.length > card.length[card.length.length - 1]) e.preventDefault();
    } else {
        if(value.length > 16) e.preventDefault();
    }
};

//todo: change the value of these two fields
//if the card number does not require cvv or field;

const validateCardEventListener=()=>{
    validateCard();
};
const validateCard = () => {
    const num = _paymentField.value.replace(/\s+/g, '');
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
    if(isValidCard&&num.length>=MIN_VALID_CARD_LENGTH){
        let dynamicPricingMessage = {fieldType:'number',messageType:'fetchDynamicPricingToken',hostedField,cardType };
        postMessageWrapper(parent,dynamicPricingMessage,parentUrl);
    }
};

const validateExpiryEventListener=()=>{
    validateExpiry(false);
};
const validateExpiry = (isCascadeFromNumberField) => {
    var hostedField = getAppData('hostedField');
    var cardType = getAppData('cardType');
    var scheme = getAppData(cardType+'scheme');
    const exp = _paymentField.value.replace(/\s+/g, '');
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
    _paymentField.className = _paymentField.className.replace(classNameToRemove,'');
    if(_paymentField.className.indexOf(classNameToAdd)===-1)
        _paymentField.className += classNameToAdd;
};
const validateCvvEventListener = () =>{
    validateCvv(false);
};


const validateCvv = (isCascadeFromNumberField) =>{
    var hostedField = getAppData('hostedField');
    var cardType = getAppData('cardType');
    var scheme = getAppData(cardType+'scheme');
    const cvv = _paymentField.value.replace(/\s+/g, '');
    //console.log(scheme,cvv,'inside validateCvv');
    var isValid = true;
     var isEmpty = !cvv;
     var ignoreValidationBroadcast =isCascadeFromNumberField;
     //console.log('cardType',cardType);
     let validationResult = {fieldType:'cvv',messageType:'validation',hostedField,cardType,ignoreValidationBroadcast};
     if(!scheme&&isEmpty&& cardType!=="savedCard")
    {
        validationResult.cardValidationResult = {"txMsg": 'Cvv can not be empty.',isValid:false,isEmpty:true};
        isValid = false;
    }
    else if(isValidCvv(cvv.length,scheme))
    {
        validationResult.cardValidationResult = { "txMsg": '',isValid:true,length:cvv.length};
        isValid = true;
    }
    else{
         let txMsg = 'Cvv can not be empty.';
        if(!isEmpty)
            txMsg = 'Cvv is invalid.';
        validationResult.cardValidationResult = {"txMsg": txMsg,isValid:false,length:cvv.length};
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
    if (hasTextSelected(_paymentField)) {
        return;
    }
    val = _paymentField.value + digit;
    if(val.length > 4)  e.preventDefault();
};

const getParentUrl = ()=>{
  let url =  (window.location != window.parent.location)
            ? document.referrer
      : document.location.protocol + '//' + document.location.host;     
  return url;
};

const restrictPaste = (e) => {
    e.preventDefault();
};

export {addField, formatExpiry,validateCvv,validateExpiry,validateCard,addEventListenersForHostedFields}