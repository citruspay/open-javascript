/**
 * Created by nagamai on 9/9/2016.
 */
let field;
const cardFieldHandler = () => {
console.log(document.location.href);
    field = document.location.href.split("#");

    paymentField.setAttribute("id", field);

    let element = document.getElementById(field[1]);

    element.addEventListener("focusout", focusOutFunction);
};

const focusOutFunction = () => {
    //Send value of the field to the cardnumber iframe
    parent.window.frames[1].postMessage("some data from iframe ------>" + field + " value ---> " + field.value, "*");
};

export {cardFieldHandler}