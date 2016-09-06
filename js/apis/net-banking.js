import {validateAndCallbackify, getMerchantAccessKey} from "./../utils";
import {baseSchema} from "./../validation/validation-schema";
import cloneDeep from "lodash/cloneDeep";
import {handlersMap, getConfig, setConfig} from "../config";
import {custFetch} from "../interceptor";
import {getCancelResponse, refineMotoResponse} from "./response";
import {singleHopDropOutFunction, singleHopDropInFunction} from "./singleHop";
let cancelApiResp;

const NBAPIFunc = (confObj, apiUrl) => {
    const reqConf = Object.assign({}, confObj, {
        amount: {
            currency: 'INR',
            value: confObj.amount
        },
        paymentToken: {
            type: 'paymentOptionToken',
            paymentMode: {
                type: 'netbanking',
                code: confObj.paymentDetails.bankCode
            }
        },
        merchantAccessKey: getMerchantAccessKey(confObj),
        requestOrigin: confObj.requestOrigin || "CJSG"
    });
    reqConf.offerToken = getConfig().dpOfferToken;
    delete reqConf.bankCode;
    delete reqConf.currency;
    delete reqConf.paymentDetails;
    const mode = (reqConf.mode) ? reqConf.mode.toLowerCase() : "";
    delete reqConf.mode;
    cancelApiResp = getCancelResponse(reqConf);
    setConfig({cancelApiResp});
    //var winRef = openPopupWindow("");
    //var winRef = window.open("",'PromoteFirefoxWindowName', 'scrollbars=yes, top= 1000, left= 1000 ,visible=none;');
    if (mode === 'dropout' || getConfig().page === 'ICP') {
    } else {
        reqConf.returnUrl = "http://localhost/return.php";//window.location.protocol + '//' + window.location.host + '/blade/returnUrl';
        winRef = openPopupWindow("");
        //winRef.document.write('<html><head><meta name="viewport" content="width=device-width" /><meta http-equiv="Cache-control" content="public" /><title>Redirecting to Bank</title></head><style>body {background:#fafafa;}#wrapper {position: fixed;position: absolute;top: 20%;left: 0;right:0;margin: 0 auto;font-family: Tahoma, Geneva, sans-serif; color:#000;text-align:center;font-size: 14px;padding: 20px;max-width: 500px;width:70%;}.maintext {font-family: Roboto, Tahoma, Geneva, sans-serif;color:#f6931e;margin-bottom: 0;text-align:center;font-size: 21pt;font-weight: 400;}.textRedirect {color:#675f58;}.subtext{margin : 15px 0 15px;font-family: Roboto, Tahoma, Geneva, sans-serif;color:#929292;text-align:center;font-size: 14pt;}.subtextOne{margin : 35px 0 15px;font-family: Roboto, Tahoma, Geneva, sans-serif;color:#929292;text-align:center;font-size: 14pt;}@media screen and (max-width: 480px) {#wrapper {max-width:100%!important;}}</style><body><div id="wrapper"><div id = "imgtext" style=" margin-left:1%; margin-bottom: 5px;"><img src="https://www.citruspay.com/resources/pg/images/logo_citrus.png"/></div><p class="maintext">Quick <span class="textRedirect">Redirection</span></p><p class="subtext"><span>We are processing your payment..</span></p><p class="subtextOne"><span>IT MIGHT TAKE A WHILE</span></p></div></body></html>');
        winRef.document.write('<html><head> <meta name="viewport" content="width=device-width"/> <meta http-equiv="Cache-control" content="public"/> <title>Redirecting to Bank</title></head><style>body{background: #fafafa;}#wrapper{position: fixed; position: absolute; top: 10%; left: 0; right: 0; margin: 0 auto; font-family: Tahoma, Geneva, sans-serif; color: #000; text-align: center; font-size: 14px; padding: 20px; max-width: 500px; width: 70%;}.maintext{font-family: Roboto, Tahoma, Geneva, sans-serif; color: #f6931e; margin-bottom: 0; text-align: center; font-size: 16pt; font-weight: 400;}.textRedirect{color: #675f58;}.subtext{margin: 15px 0 15px; font-family: Roboto, Tahoma, Geneva, sans-serif; color: #929292; text-align: center; font-size: 10pt;}.subtextOne{margin: 35px 0 15px; font-family: Roboto, Tahoma, Geneva, sans-serif; color: #929292; text-align: center; font-size: 10pt;}@media screen and (max-width: 480px){#wrapper{max-width: 100%!important;}}</style><body> <div id="wrapper"> <div id="imgtext" style="margin-left:1%; margin-bottom: 5px;"><!--<img src="https://context.citruspay.com/static/kiwi/images/logo.png"/>--> </div><div id="imgtext" style="text-align:center;padding: 15% 0 10%;"><!--<img src="https://context.citruspay.com/static/kiwi/images/puff_orange.svg"/>--></div><p class="maintext">Processing <span class="textRedirect">Payment</span> </p><p class="subtext"><span>We are redirecting you to the bank\'s page</span></p><p class="subtextOne"><span>DO NOT CLOSE THIS POP-UP</span> </p></div></body></html>');
    }
    if (getConfig().page === 'ICP') {

        return custFetch(apiUrl, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reqConf)
        });

    }
    else {
        return custFetch(apiUrl, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reqConf)
        }).then(function (resp) {
            handlePayment(resp,mode);
        });
    }
};

let winRef = null;
let transactionCompleted = false;

const openPopupWindow = (url) => {

    if (winRef == null || winRef.closed) {
        var width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
        var height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;
        var w = 800;
        var h = 600;
        var left = ((width - w) / 2);
        var top = height / 10;
        console.log('url to open :', url);
        winRef = window.open(url, 'PromoteFirefoxWindowName', 'scrollbars=yes, width=' + w + ', height=' + h + ', top=' + top + ', left=' + left + 'visible=none;');

    } else {
        winRef.focus();
    }

    return winRef;
};

const isIE = () => {
    const ua = window.navigator.userAgent;
    const ie10orless = ua.indexOf('MSIE ');
    const ie11 = ua.indexOf('Trident/');
    const edge = ua.indexOf('Edge/');
    return !!(ie10orless > -1 || ie11 > -1 || edge > -1);
};

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
                form.append("transactionId", cancelApiResp.TxId);
                return custFetch(`${getConfig().adminUrl}/api/v1/txn/enquiry`, {
                    method: 'post',
                    mode: 'cors',
                    body: form
                }).then(function (resp) {
                    console.log(resp);
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
                form.append("transactionId", cancelApiResp.TxId);
                return custFetch(`${getConfig().adminUrl}/api/v1/txn/enquiry`, {
                    method: 'post',
                    mode: 'cors',
                    body: form
                }).then(function (resp) {
                    console.log(resp);
                    handlersMap['transactionHandler'](resp.data.enquiry);
                });
            }
        }
    }, 500);
};

window.responseHandler = function (response) {
    handlersMap['transactionHandler'](response);
};

const netBankingValidationSchema = Object.assign(cloneDeep(baseSchema), {
    paymentDetails: {
        presence: true,
        keysCheck: ['paymentMode', 'bankCode']
    },
    "paymentDetails.bankCode": {presence: true}
});

netBankingValidationSchema.mainObjectCheck.keysCheck.push('paymentDetails');


const makeNetBankingPayment = validateAndCallbackify(netBankingValidationSchema, (confObj) => {
    const apiUrl = `${getConfig().motoApiUrl}/moto/authorize/struct/${getConfig().vanityUrl}`;
    return NBAPIFunc(confObj, apiUrl);
});
//wrapper function call
const netbanking = validateAndCallbackify(netBankingValidationSchema, (confObj) => {
    const apiUrl = `${getConfig().motoApiUrl}/moto/authorize/struct/${getConfig().vanityUrl}`;
    return NBAPIFunc(confObj, apiUrl);
});

//------------------- makeBlazeNBPayment ----------------//

const makeBlazeNBPayment = validateAndCallbackify(netBankingValidationSchema, (confObj) => {
    const apiUrl = `${getConfig().motoApiUrl}/moto/authorize/struct/${getConfig().vanityUrl}`;
    return NBAPIFunc(confObj, apiUrl);
});

//------------------- makeSavedNBPayment ----------------//

const savedNBValidationSchema = Object.assign(cloneDeep(baseSchema), {
    token: {presence: true}
});

savedNBValidationSchema.mainObjectCheck.keysCheck.push('token');

const savedAPIFunc = (confObj, url) => {
    const reqConf = Object.assign({}, confObj, {
        amount: {
            currency: confObj.currency,
            value: confObj.amount
        },
        paymentToken: {
            type: 'paymentOptionIdToken',
            id: confObj.token
        },
        merchantAccessKey: getMerchantAccessKey(confObj),
        requestOrigin: confObj.requestOrigin || "CJSW"
    });

    confObj.CVV && (reqConf.paymentToken.cvv = confObj.CVV);

    delete reqConf.currency;
    delete reqConf.token;
    delete reqConf.CVV;
    const mode = (reqConf.mode) ? reqConf.mode.toLowerCase() : "";
    delete reqConf.mode;
    if (getConfig().page === 'ICP') {
        return custFetch(url, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reqConf)
        });
    }
    else {
        return custFetch(url, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reqConf)
        }).then(function (resp) {
            if (getConfig().page !== 'ICP') {
                handlePayment(resp,mode);
            }
        });
    }
};

const handlePayment = (resp,mode)=>{
    if (resp.data.redirectUrl) {
        if (mode === "dropout") {
            singleHopDropOutFunction(resp.data.redirectUrl);
                }
                else {
                    singleHopDropInFunction(resp.data.redirectUrl).then(function (response) {
                        let el = document.createElement('body');
                        el.innerHTML = response;
                        console.log(winRef,winRef.closed,'test');
                        let form = el.getElementsByTagName('form');
                        try {
                            if(winRef && winRef.closed)
                            {
                                handlersMap["serverErrorHandler"](cancelApiResp);
                                return;
                            }
                            let paymentForm = document.createElement('form');
                            switch(Object.prototype.toString.call( form )){
                                case "[object NodeList]" :
                                    submitForm(form[0],winRef);
                                    break;
                                case "[object HTMLCollection]" :
                                    submitForm(form.submitForm,winRef);
                                    break;
                            }
                        } catch (e) {
                            console.log(e);
                            //the form was added to body before refactoring
                            submitForm(form.returnForm,winRef);
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
        const response = refineMotoResponse(resp.data);
        handlersMap['serverErrorHandler'](response);
    }
};

const submitForm=(form,winRef)=>{
    let paymentForm = document.createElement('form');
    paymentForm.setAttribute("action", form.action);
    paymentForm.setAttribute("method", form.method);
    paymentForm.setAttribute("target", winRef.name);
    paymentForm.innerHTML = form.innerHTML;
    document.documentElement.appendChild(paymentForm);
    paymentForm.submit();
    document.documentElement.removeChild(paymentForm);
}

const makeSavedNBPayment = validateAndCallbackify(savedNBValidationSchema, (confObj)=> {
    const apiUrl = `${getConfig().motoApiUrl}/moto/authorize/struct/${getConfig().vanityUrl}`;
    return savedAPIFunc(confObj, apiUrl);
});

export {
    makeNetBankingPayment,
    makeSavedNBPayment,
    makeBlazeNBPayment,
    savedAPIFunc,
    savedNBValidationSchema,
    netbanking
}