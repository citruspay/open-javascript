/**
 * Created by nagamai on 9/9/2016.
 */
import {
    cardFromNumber,
    schemeFromNumber,
    getAppData,
    addListener,
    postMessageWrapper,
    setAppData,
    isIOS
} from "./utils";
import {getConfigValue} from "./hosted-field-config";
import {validateCreditCard, isValidCvv, isValidExpiry} from "./validation/custom-validations";
import {MIN_VALID_CARD_LENGTH} from "./constants";

let _paymentField;
let field;
const BACK_SPACE_KEY_CODE = 8;
const DELETE_KEY_CODE = 46;
//todo:change its name later
let digit;
let parentUrl = getAppData('parentUrl');
const addField = () => {
    let fieldType = document.location.href.split("#");
    if (fieldType.length < 2)
        return;
    field = fieldType[1].split("-");
    _paymentField = document.createElement("input");
    _paymentField.setAttribute("id", field[0] + "citrusInput");
    document.body.appendChild(_paymentField);
    //addEventListenersForHostedFields();
};


const postPaymentData = () => {
    //Send value of the field to the cardnumber iframe
    let message = {messageType: 'cardData'};
    let cardData = {};
    cardData.value = _paymentField.value;
    cardData.key = field[0];
    message.cardType = field[1];
    message.cardData = cardData;
    //todo:IMPORTANT, change * to citrus server url,
    //also if possible use name instead of index as index will be unreliable
    //if there are other iframes on merchant's page

    for (var i = 0; i < parent.window.frames.length; i++) {
        postMessageWrapper(parent.window.frames[i], message, getConfigValue('hostedFieldDomain'));
    }
};

//in android browsers keypress does not fire
//keydown fires but the charCode is not usable
//so the input event is the one which prevent invalid entry in the case of android
//for all input fields.
//keypress does not fire for every key on all browsers, specifically backspace does not fire
//keypress on browsers other then firefox.
const addEventListenersForHostedFields = (cardSetupType) => {
    //detect the ios user agent, since ios devices don't listen to blur events. ignore the microsoft user agent which also contains the ios keyword.
    let iOS = isIOS();
    let eventStr;
    iOS ? eventStr = "input" : eventStr = "blur";
    if (cardSetupType === "credit" || cardSetupType === "debit" || cardSetupType === "card")
        addListener(_paymentField, eventStr, postPaymentData, false);
    //add the event listeners for ui validations of those fields.
    addListener(_paymentField, "focus", addFocusAttributes, false);
    addListener(_paymentField, "blur", removeFocusAttributes, false);
    addListener(_paymentField, 'paste', restrictPaste, false);
    switch (field[0]) {
        case "number" :
            addListener(_paymentField, eventStr, validateCardEventListener, false);
            addListener(_paymentField, 'input', detectScheme);
            addListener(_paymentField, 'keypress', restrictNumeric, false);
            addListener(_paymentField, 'keypress', restrictCardNumber, false);
            addListener(_paymentField, 'keypress', formatCardNumber, false);
            addListener(_paymentField, 'keydown', formatBackCardNumber, false);;
            addListener(_paymentField, 'change', reFormatCardNumber, false);
            addListener(_paymentField, 'input', reFormatCardNumber, false);
            break;
        case "expiry" :
            addListener(_paymentField, eventStr, validateExpiryEventListener, false);
            addListener(_paymentField, 'keypress', restrictNumeric, false);
            addListener(_paymentField, 'keypress', formatExpiry, false);
            addListener(_paymentField, 'input', reformatExpiry, false);
            break;
        case "cvv"    :
            addListener(_paymentField, eventStr, validateCvvEventListener, false);
            _paymentField.setAttribute("type", "password");
            addListener(_paymentField, 'keypress', restrictNumeric, false);
            addListener(_paymentField, 'keypress', restrictCVC, false);
            //this is specifically for android, as keypress does not fire
            //on android
            addListener(_paymentField, 'input', formatCvv, false);
            break;
    }
};
 
 
const detectScheme = ()=> {
    const num = _paymentField.value.replace(/\s+/g, '');
    const scheme = schemeFromNumber(num);
    var setupType = getAppData('cardType');
    var hostedField = getAppData('hostedField');
    if (!scheme)
        return;
    var lastDetectedScheme = getAppData(setupType + 'scheme');
    let schemeChangeMessage = {messageType: 'schemeChange', scheme: scheme, hostedField, cardType: setupType};
    if (lastDetectedScheme !== scheme) {
        setAppData(setupType + 'scheme', scheme);
        postMessageWrapper(parent, schemeChangeMessage, getParentUrl());
    }
};

const addFocusAttributes = ()=> {
    var hostedField = getAppData('hostedField');
    let focusReceivedMessage = {messageType: 'focusReceived', fieldType: field[0], hostedField};
    postMessageWrapper(parent, focusReceivedMessage, getParentUrl());
};

const removeFocusAttributes = ()=> {
    var hostedField = getAppData('hostedField');
    let focusLostMessage = {messageType: 'focusLost', fieldType: field[0], hostedField};
    postMessageWrapper(parent, focusLostMessage, getParentUrl());
};
const formatCardNumberValue = (num) => {
    num = num.replace(/\D/g, '');
    var card, groups, upperLength, _ref;
    card = cardFromNumber(num);
    if (!card) {
        return num;
    }
    upperLength = card.length[card.length.length - 1];
    num = num.slice(0, upperLength);
    if (card.format.global) {
      return (_ref = num.match(card.format)) != null ? _ref.join(' ') : void 0;
    } else {
      groups = card.format.exec(num);
      if (groups == null) {
        return;
      }
      groups.shift();
      groups = groups.filter(function (n) {
            return n;
       });
      return groups.join(' ');
    }
  };

const formatCardNumber = function(e){
    var $target, card, digit, length, re, upperLength, value;
    digit = String.fromCharCode(e.which);
    if (!/^\d+$/.test(digit)) {
      return;
    }
    $target = e.currentTarget;
    value = $target.value;
    card = cardFromNumber(value + digit);
    length = (value.replace(/\D/g, '') + digit).length;
    upperLength = 16;
    if (card) {
      upperLength = card.length[card.length.length - 1];
    }
    if (length >= upperLength) {
      return;
    }
    if (($target.selectionStart != null) && $target.selectionStart !== value.length) {
      return;
    }
    if (card && card.type === 'amex') {
      re = /^(\d{4}|\d{4}\s\d{6})$/;
    } else {
      re = /(?:^|\s)(\d{4})$/;
    }
    if (re.test(value)) {
      e.preventDefault();
      return setTimeout(function() {
        $target.value = value + ' ' + digit;
        return $target;
      });
    } else if (re.test(value + digit)) {
      e.preventDefault();
      return setTimeout(function() {
        $target.value = value + digit + ' ';
        return $target;
      });
    }
    ///
     
}

const hasTextSelected = ($target) => {
     var _ref;
    if ($target.selectionStart!= null && $target.selectionStart !== $target.selectionEnd) {
      return true;
    }
    if ((typeof document !== "undefined" && document !== null ? (_ref = document.selection) != null ? _ref.createRange : void 0 : void 0) != null) {
      if (document.selection.createRange().text) {
        return true;
      }
    }
    return false;

};

const formatExpiry = (e) => {
    var keycode = e.which||e.keyCode;
    if(keycode===BACK_SPACE_KEY_CODE||keycode===DELETE_KEY_CODE)
        return;
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
    if (e.which < 57) digit = e.which;
    if (digit < 57 && mon.length === 2) {
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
        cancelEvent(e);
        return false;
    }
    if (e.which === 0) {
      return true;
    }
    if (e.which < 33) {
      return true;
    }
    input = String.fromCharCode(e.which);
    var isStopEventCancellation = !!/[\d\s]/.test(input);
    if(!isStopEventCancellation)
    {
       cancelEvent(e);
    }
    return isStopEventCancellation;
};

const formatCvv = ()=> {
    let cvv = _paymentField.value;
    cvv = cvv.replace(/\D/g, '');
    let parts = cvv.match(/^\d{1,4}/);
    if (!parts) {
        _paymentField.value = '';

    }
};

const cancelEvent=(event)=>{
    event.preventDefault();
    event.stopPropagation();
}

//to avoid the acceptance of one extra digit in the field,
//and also formats the card number while pasting the number directly inside the field
const reFormatCardNumber = (e) => {
    var $target;
    $target = e.currentTarget;
    return setTimeout(function() {
      var value;
      value = $target.value;
      value = replaceFullWidthChars(value);
      value = formatCardNumberValue(value);
      return safeVal(value, $target);
    });
};
//to avoid the acceptance of one extra digit in the field
//and also formats the card number while pasting the number directly inside the field
const reformatExpiry = () => {
    return setTimeout(function () {
        formatExpiry(_paymentField.value);
    });
};

const restrictCardNumber = function (e) {
    var $target, card, digit, value;
    $target = e.currentTarget;
    digit = String.fromCharCode(e.which);
    if (!/^\d+$/.test(digit)) {
      return;
    }
    if (hasTextSelected($target)) {
      return;
    }
    value = ($target.value + digit).replace(/\D/g, '');
    card = cardFromNumber(value);
    var isStopEventCancellation;
    if (card) {
      isStopEventCancellation = value.length <= card.length[card.length.length - 1];
    } else {
      isStopEventCancellation = value.length <= 16;
    }
    if(!isStopEventCancellation)
    {
        cancelEvent(e);
    }
    return isStopEventCancellation;
};

//todo: change the value of these two fields
//if the card number does not require cvv or field;

const validateCardEventListener = ()=> {
    validateCard();
};
//todo: refactor it later, use validateCard from
//custom-validations.
const validateCard = () => {
    const num = _paymentField.value.replace(/\s+/g, '');
    var cardType = getAppData('cardType');
    var hostedField = getAppData('hostedField');
    let validationResult = {fieldType: 'number', messageType: 'validation', hostedField, cardType};
    if (!num) {
        validationResult.cardValidationResult = {"txMsg": 'Card number can not be empty.', isValid: false};
        toggleValidity(false);
        postMessageWrapper(parent, validationResult, getParentUrl());
        return;
    }
    const scheme = schemeFromNumber(num);
    //todo : add check for maestro and rupay
    const isValidCard = validateCreditCard(num, scheme);
    let txMsg = "";
    if (!isValidCard) txMsg = "Invalid card number";
    validationResult.cardValidationResult = {"txMsg": txMsg, isValid: isValidCard, scheme: scheme};
    parentUrl = getAppData('parentUrl');
    toggleValidity(isValidCard);
    postMessageWrapper(parent, validationResult, parentUrl);
    if (isValidCard && num.length >= MIN_VALID_CARD_LENGTH) {
        let dynamicPricingMessage = {
            fieldType: 'number',
            messageType: 'fetchDynamicPricingToken',
            hostedField,
            cardType
        };
        postMessageWrapper(parent, dynamicPricingMessage, parentUrl);
        //MCP = multiple currency pricing
        let mcpMessage = {
            fieldType: 'number',
            messageType: 'fetchMCPToken',
            hostedField,
            cardType
        };
        postMessageWrapper(parent, mcpMessage, parentUrl);
    }
};

const validateExpiryEventListener = ()=> {
    validateExpiry(false);
};
const validateExpiry = (isCascadeFromNumberField) => {
    var hostedField = getAppData('hostedField');
    var cardType = getAppData('cardType');
    var scheme = getAppData(cardType + 'scheme');
    const exp = _paymentField.value.replace(/\s+/g, '');
    //console.log(scheme,exp,'test');
    let isEmpty = !exp;
    let isValid;
    var ignoreValidationBroadcast = isCascadeFromNumberField;

    let validationResult = {
        fieldType: 'expiry',
        messageType: 'validation',
        hostedField,
        cardType,
        ignoreValidationBroadcast
    };
    if (!scheme && isEmpty) {
        validationResult.cardValidationResult = {
            "txMsg": 'Expiry date can not be empty.',
            isValid: false,
            isEmpty: true
        };
        isValid = false;
    }
    else if (isValidExpiry(exp, scheme)) {
        validationResult.cardValidationResult = {txMsg: "", isValid: true};
        isValid = true;
    }
    else {
        let txMsg = 'Invalid Expiry date.';
        if (!exp) {
            txMsg = 'Expiry date can not be empty.'
        }
        validationResult.cardValidationResult = {txMsg: txMsg, isValid: false};
        isValid = false;

    }
    parentUrl = getAppData('parentUrl');
    if (!isCascadeFromNumberField) {
        toggleValidity(isValid);
    }
    postMessageWrapper(parent, validationResult, getParentUrl());
};

const toggleValidity = (isValid)=> {
    let classNameToAdd = ' invalid', classNameToRemove = ' valid';
    if (isValid) {
        classNameToAdd = ' valid';
        classNameToRemove = ' invalid';
    }
    _paymentField.className = _paymentField.className.replace(classNameToRemove, '');
    if (_paymentField.className.indexOf(classNameToAdd) === -1)
        _paymentField.className += classNameToAdd;
};
const validateCvvEventListener = () => {
    validateCvv(false);
};


const validateCvv = (isCascadeFromNumberField) => {
    var hostedField = getAppData('hostedField');
    var cardType = getAppData('cardType');
    var scheme = getAppData(cardType + 'scheme');
    const cvv = _paymentField.value.replace(/\s+/g, '');
    var isValid = true;
    var isEmpty = !cvv;
    var ignoreValidationBroadcast = isCascadeFromNumberField;
    let validationResult = {
        fieldType: 'cvv',
        messageType: 'validation',
        hostedField,
        cardType,
        ignoreValidationBroadcast
    };
    if (!scheme && isEmpty && cardType !== "savedCard") {
        validationResult.cardValidationResult = {"txMsg": 'Cvv can not be empty.', isValid: false, isEmpty: true};
        isValid = false;
    }
    else if (isValidCvv(cvv.length, scheme)) {
        validationResult.cardValidationResult = {"txMsg": '', isValid: true, length: cvv.length};
        isValid = true;
    }
    else {
        let txMsg = 'Cvv can not be empty.';
        if (!isEmpty)
            txMsg = 'Cvv is invalid.';
        validationResult.cardValidationResult = {"txMsg": txMsg, isValid: false, length: cvv.length};
        isValid = false;
    }
    if (!isCascadeFromNumberField) {
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
    if (val.length > 4)  e.preventDefault();
};

const getParentUrl = ()=> {
    let url = (window.location != window.parent.location)
        ? document.referrer
        : document.location.protocol + '//' + document.location.host;
    return url;
};

const restrictPaste = (e) => {
    e.preventDefault();
};

const formatBackCardNumber = function(e) {
    var $target, value;
    $target = e.currentTarget;
    value = $target.value;
    if (e.which !== BACK_SPACE_KEY_CODE) {
      return;
    }
    if (($target.selectionStart != null) && $target.selectionStart !== value.length) {
      return;
    }
    if (/\d\s$/.test(value)) {
      e.preventDefault();
      return setTimeout(function() {
        $target.value = value.replace(/\d\s$/, '');
        return $target;
      });
    } else if (/\s\d?$/.test(value)) {
      e.preventDefault();
      return setTimeout(function() {
        $target.value = value.replace(/\d$/, '');
        return $target;
      });
  }
};
 
 const getActiveElement = function(){
      try{
        return document.activeElement;
      }
      catch(ex){

      }
  };

 const safeVal = function(value, $target) {
    var currPair, cursor, digit, error, last, prevPair;
    try {
      cursor = $target.selectionStart;
    } catch (_error) {
      error = _error;
      cursor = null;
    }
    last = $target.value;
    $target.value = value;
    if (cursor !== null && $target==getActiveElement() /*$target.is(":focus")*/) {
      if (cursor === last.length) {
        cursor = value.length;
      }
      if (last !== value) {
        prevPair = last.slice(cursor - 1, +cursor + 1 || 9e9);
        currPair = value.slice(cursor - 1, +cursor + 1 || 9e9);
        digit = value[cursor];
        if (/\d/.test(digit) && prevPair === ("" + digit + " ") && currPair === (" " + digit)) {
          cursor = cursor + 1;
        }
      }
      $target.selectionStart= cursor;
      $target.selectionEnd = cursor;
      return $target;
    }
  };

  const replaceFullWidthChars = function(str) {
    var chars, chr, fullWidth, halfWidth, idx, value, _i, _len;
    if (str == null) {
      str = '';
    }
    fullWidth = '\uff10\uff11\uff12\uff13\uff14\uff15\uff16\uff17\uff18\uff19';
    halfWidth = '0123456789';
    value = '';
    chars = str.split('');
    for (_i = 0, _len = chars.length; _i < _len; _i++) {
      chr = chars[_i];
      idx = fullWidth.indexOf(chr);
      if (idx > -1) {
        chr = halfWidth[idx];
      }
      value += chr;
    }
    return value;
  };

export {addField, formatExpiry, validateCvv, validateExpiry, validateCard, addEventListenersForHostedFields}