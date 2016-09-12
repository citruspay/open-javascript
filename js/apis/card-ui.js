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

    if (window.addEventListener) {
        paymentField.addEventListener("blur", focusOutFunction, false)
    } else {
        paymentField.attachEvent("blur", focusOutFunction)
    }
    //element.addEventListener("focusout", focusOutFunction);
};

const focusOutFunction = () => {
    //Send value of the field to the cardnumber iframe
   let cardData = {};
    cardData[field[1]] = paymentField.value;
    parent.window.frames[1].postMessage(cardData, "*");
};

export {cardFieldHandler}