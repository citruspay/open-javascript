import {baseSchema} from "./../validation/validation-schema";
import cloneDeep from "lodash/cloneDeep";
import {urlReEx} from "../constants";
import {handlersMap, getConfig} from "../config";
import {getAppData, setAppData, isIE} from './../utils';
import {singleHopDropOutFunction, singleHopDropInFunction} from "./singleHop";
import {refineMotoResponse} from "./response";
import {custFetch} from "../interceptor";

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
    "paymentDetails.holder": {presence: true, format: regExMap.name}
});

motoCardValidationSchema.mainObjectCheck.keysCheck.push('paymentDetails');

const makePayment = (paymentObj) => {
    console.log(paymentObj);
    
    
    
    txnId = paymentObj.merchantTxnId;
    const paymentMode = paymentObj.paymentDetails.paymentMode.toLowerCase().replace(/\s+/g, '');
    const win = document.getElementById("citruspay").contentWindow;
    paymentObj.pgSettingsData = getAppData('pgSettingsData');
    paymentObj.config = getConfig();
    //cancelApiResp = getCancelResponse(paymentObj);
    if (paymentObj.mode.toLowerCase() !== "dropout")
        {
            winRef = openPopupWindow("");
            winRef.document.write('<html><head> <meta name="viewport" content="width=device-width"/> <meta http-equiv="Cache-control" content="public"/> <title>Redirecting to Bank</title></head><style>body{background: #fafafa;}#wrapper{position: fixed; position: absolute; top: 10%; left: 0; right: 0; margin: 0 auto; font-family: Tahoma, Geneva, sans-serif; color: #000; text-align: center; font-size: 14px; padding: 20px; max-width: 500px; width: 70%;}.maintext{font-family: Roboto, Tahoma, Geneva, sans-serif; color: #f6931e; margin-bottom: 0; text-align: center; font-size: 16pt; font-weight: 400;}.textRedirect{color: #675f58;}.subtext{margin: 15px 0 15px; font-family: Roboto, Tahoma, Geneva, sans-serif; color: #929292; text-align: center; font-size: 10pt;}.subtextOne{margin: 35px 0 15px; font-family: Roboto, Tahoma, Geneva, sans-serif; color: #929292; text-align: center; font-size: 10pt;}@media screen and (max-width: 480px){#wrapper{max-width: 100%!important;}}</style><body> <div id="wrapper"> <div id="imgtext" style="margin-left:1%; margin-bottom: 5px;"><!--<img src="https://context.citruspay.com/kiwi/images/logo.png"/>--> </div><div id="imgtext" style="text-align:center;padding: 15% 0 10%;"><!---<img src="https://context.citruspay.com/kiwi/images/puff_orange.svg"/>--></div><p class="maintext">Processing <span class="textRedirect">Payment</span> </p><p class="subtext"><span>We are redirecting you to the bank\'s page</span></p><p class="subtextOne"><span>DO NOT CLOSE THIS POP-UP</span> </p></div></body></html>');
        }
            setAppData('paymentObj', paymentObj);
            win.postMessage(paymentObj, "*");

    };

const listener = (event) => {
    const motoResponse = JSON.parse(event.data);
    const paymentObj = getAppData('paymentObj');
    if(event.origin === ("http://localhost") && motoResponse.redirectUrl) { //url check has to configured, currently its hardcoded
        if (paymentObj.mode.toLowerCase() === "dropout") {
            singleHopDropOutFunction(motoResponse.redirectUrl);
        }
        else {
            singleHopDropInFunction(motoResponse.redirectUrl).then(function (response) {
                if (winRef.closed !== true) {
                    let el = document.createElement('body');
                    el.innerHTML = response;
                    let form = el.getElementsByTagName('form');
                    try {
                        let paymentForm = document.createElement('form');
                        switch (Object.prototype.toString.call(form)) {
                            case "[object NodeList]" :
                                paymentForm.setAttribute("action", form[0].action),
                                    paymentForm.setAttribute("method", form[0].method),
                                    paymentForm.setAttribute("target", winRef.name),
                                    paymentForm.innerHTML = form[0].innerHTML,
                                    document.documentElement.appendChild(paymentForm),
                                    paymentForm.submit(),
                                    document.documentElement.removeChild(paymentForm);
                                break;
                            case "[object HTMLCollection]" :
                                paymentForm.setAttribute("action", form.submitForm.action),
                                    paymentForm.setAttribute("method", form.submitForm.method),
                                    paymentForm.setAttribute("target", winRef.name),
                                    paymentForm.innerHTML = form.submitForm.innerHTML,
                                    document.documentElement.appendChild(paymentForm),
                                    paymentForm.submit(),
                                    document.documentElement.removeChild(paymentForm);
                                break;
                        }
                    } catch (e) {
                        console.log(e);
                        let paymentForm = document.createElement('form');
                        paymentForm.setAttribute("action", form.returnForm.action),
                            paymentForm.setAttribute("method", form.returnForm.method),
                            paymentForm.setAttribute("target", winRef.name),
                            paymentForm.innerHTML = form.returnForm.innerHTML,
                            document.body.appendChild(paymentForm),
                            paymentForm.submit(),
                            document.body.removeChild(paymentForm);
                    }
                }
                    if (!isIE()) {
                        workFlowForModernBrowsers(winRef);
                    } else {
                        workFlowForIE(winRef);
                    }
            });
        }
    } else{
            if (winRef) {
                winRef.close();
            }
            const response = refineMotoResponse(motoResponse);
            handlersMap['serverErrorHandler'](response);
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
    var intervalId = setInterval(function () {
        if (transactionCompleted) {
            return clearInterval(intervalId);
        }
        if (winRef) {
            if (winRef.closed === true) {
                clearInterval(intervalId);
                let form = new FormData();
                form.append("merchantAccessKey", `${getConfig().merchantAccessKey}`);
                form.append("transactionId", txnId);
                const url = `${getConfig().adminUrl}/api/v1/txn/enquiry`;
                return custFetch(url, {
                    method: 'post',
                    mode: 'cors',
                    body: form
                }).then(function (resp) {
                    handlersMap['transactionHandler'](resp.data.enquiry);
                });
            }
        } else {
            clearInterval(intervalId);
        }
    }, 500);
};

const workFlowForIE = (winRef) => {
    const intervalId = setInterval(function () {
        if (transactionCompleted) {
            return clearInterval(intervalId);
        }
        if (winRef) {
            if (winRef.closed) {
                clearInterval(intervalId);
                let form = new FormData();
                form.append("merchantAccessKey", `${getConfig().merchantAccessKey}`);
                form.append("transactionId", txnId);
                const url = `${getConfig().adminUrl}/api/v1/txn/enquiry`;
                return custFetch(url, {
                    method: 'post',
                    mode: 'cors',
                    body: form
                }).then(function (resp) {
                    handlersMap['transactionHandler'](resp.data.enquiry);
                });
            }
        }
    }, 500);
};
export {makePayment, listener};