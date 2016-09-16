/**
 * Created by nagamai on 9/9/2016.
 */
let paymentField;
let field;
const cardFieldHandler = () => {
console.log(document.location.href);
    field = document.location.href.split("#");
    paymentField = document.createElement("input");
    paymentField.setAttribute("id", field[1]+"citrusInput");
    document.body.appendChild(paymentField);
    var placeHolder = "";
    switch(field[1]){
        case "cvv":
            placeHolder="cvv";
            break;
        case "number":
            placeHolder="card number";
            break;
        case "expiry":
            placeHolder = "expiry(mm/yy)"
            break;
    }
    var defaultStyle ={
        background: 0,
        display: 'inline-block',
        width: '78%',
        padding: "10px 0",
        fontSize: '13px'
    };
    paymentField.setAttribute('placeholder',placeHolder);
    Object.assign(paymentField.style,defaultStyle);
    if (window.addEventListener) {
        paymentField.addEventListener("blur", postPaymentData, false);
    } else {
        paymentField.attachEvent("blur", postPaymentData);
    }
};

const postPaymentData = () => {
    //Send value of the field to the cardnumber iframe
   let cardData = {};
    cardData[field[1]] = paymentField.value;
    //todo:IMPORTANT, change * to citrus server url,
    //also if possible use name instead of index as index will be unreliable
    //if there are other iframes on merchant's page
    parent.window.frames[0].postMessage(cardData, "*");
    parent.window.frames[1].postMessage(cardData, "*");
    parent.window.frames[2].postMessage(cardData, "*");
};

export {cardFieldHandler}