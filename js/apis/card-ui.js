/**
 * Created by nagamai on 9/9/2016.
 */
import {cardFromNumber,schemeFromNumber,setAppData} from "./../utils";
import {validateExpiryDate, validateScheme, validateCreditCard} from './../validation/custom-validations';

let paymentField;
let field;
let cvvLen = 4;
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
        fontSize: '13px'
    };
    paymentField.setAttribute('placeholder', placeHolder);
    Object.assign(paymentField.style, defaultStyle);
    eventListenerAdder();

};

const postPaymentData = () => {
    //Send value of the field to the cardnumber iframe
    let cardData = {};
    console.log("here in post payment data");
    cardData[field[0]] = paymentField.value;
    cardData.cardType = field[1];
    //todo:IMPORTANT, change * to citrus server url,
    //also if possible use name instead of index as index will be unreliable
    //if there are other iframes on merchant's page
    for(var i=0;i<parent.window.frames.length;i++)
    {parent.window.frames[i].postMessage(cardData, "http://localhost");}
    // parent.window.frames[1].postMessage(cardData, "*");
    // parent.window.frames[2].postMessage(cardData, "*");
};

const eventListenerAdder = () => {
    if (window.addEventListener) {
        //add the event listeners for ui validations of those fields.
        paymentField.addEventListener("blur", postPaymentData, false);
        //paymentField.formatCardNumber();
        //paymentField.addEventListener('keypress', formatCardNumber, false);
        switch (field[0]) {
            case "number" :
                paymentField.addEventListener("blur", validateCard, false);
                paymentField.addEventListener('keypress', restrictNumeric, false);
                paymentField.addEventListener('keypress', restrictCardNumber, false);
                paymentField.addEventListener('keypress', formatCardNumber, false);
                // paymentField.addEventListener('keydown', formatBackCardNumber, false);
                // paymentField.addEventListener('keyup', setCardType, false);
                // paymentField.addEventListener('paste', reFormatCardNumber, false);
                // paymentField.addEventListener('change', reFormatCardNumber, false);
                paymentField.addEventListener('input', reFormatCardNumber, false);
                // paymentField.addEventListener('input', setCardType, false);
                break;
            case "expiry" :
                paymentField.addEventListener('keypress',restrictNumeric, false);
                // paymentField.addEventListener('keypress', restrictExpiry, false);
                paymentField.addEventListener('keypress', formatExpiry, false);
                // paymentField.addEventListener('keypress', formatForwardSlashAndSpace, false);
                // paymentField.addEventListener('keypress', formatForwardExpiry, false);
                // paymentField.addEventListener('keydown', formatBackExpiry, false);
                // paymentField.addEventListener('change', reFormatExpiry, false);
                paymentField.addEventListener('input', reformatExpiry, false);
                break;
            case "cvv"    :
                paymentField.setAttribute("type", "password");
                paymentField.addEventListener('keypress', restrictNumeric, false);
                paymentField.addEventListener('keypress', restrictCVC, false);
                break;
        }
    } else {
        paymentField.attachEvent("blur", postPaymentData);
        // paymentField.attachEvent('onkeypress', formatCardNumber);
        switch (field[0]) {
            case "number" :
                paymentField.attachEvent("blur", validateCard);
                paymentField.attachEvent('onkeypress', restrictNumeric);
                paymentField.attachEvent('onkeypress', restrictCardNumber);
                paymentField.attachEvent('onkeypress', formatCardNumber);
                // paymentField.attachEvent('onkeydown', formatBackCardNumber);
                // paymentField.attachEvent('onkeyup', setCardType);
                // paymentField.attachEvent('onpaste', reFormatCardNumber);
                // paymentField.attachEvent('onchange', reFormatCardNumber);
                paymentField.attachEvent('oninput', reFormatCardNumber);
                // paymentField.attachEvent('oninput', setCardType);
                break;
            case "expiry" :
                paymentField.attachEvent('onkeypress',restrictNumeric);
                // paymentField.attachEvent('onkeypress', restrictExpiry);
                paymentField.attachEvent('onkeypress', formatExpiry);
                // paymentField.attachEvent('onkeypress', formatForwardSlashAndSpace);
                // paymentField.attachEvent('onkeypress', formatForwardExpiry);
                // paymentField.attachEvent('onkeydown', formatBackExpiry);
                // paymentField.attachEvent('onchange', reFormatExpiry);
                paymentField.attachEvent('oninput', reformatExpiry);
                break;
            case "cvv" :
                paymentField.attachEvent('onkeypress', restrictNumeric);
                paymentField.attachEvent('onkeypress', restrictCVC);
                break;
        }
    }
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
        //return;
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
        return;
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

const formatExpiry = () => {
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
    paymentField.value = mon + sep + year;
    //return;
};


const restrictNumeric = (e) => {
    console.log("here in restrict numeric");
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

const restrictCVC = (e) => {
    var digit,
        keyCode;
    //$target = $(e.currentTarget);
    keyCode = e.which || e.keyCode;
    digit = String.fromCharCode(keyCode);
    if (!/^\d+$/.test(digit)) {
        e.preventDefault ? e.preventDefault() : (e.returnValue = false);
        return;
    }
    if (hasTextSelected(paymentField)) {
        return;
    }
    e.preventDefault ? e.preventDefault() : (e.returnValue = false);
    paymentField.value.length < cvvLen ? paymentField.value = paymentField.value + digit : (e.returnValue = false);
};

const setCvvLength = () => {
    let scheme = schemeFromNumber(paymentField.value);
    (scheme !== 'amex') ? cvvLen = 3 : cvvLen = 4 ;
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

const validateCard = () => {
    const num = paymentField.value.replace(/\s+/g, '');
    const scheme = schemeFromNumber(num);
    //todo : add check for maestro and rupay
    const isValidCard = validateCreditCard(num,scheme);
    parent.postMessage({"isValidCard" : isValidCard});
};

export {cardFieldHandler, formatExpiry}