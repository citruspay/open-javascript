import {validateAndCallbackify, getMerchantAccessKey, schemeFromNumber} from "./../utils";
import {savedNBValidationSchema, savedAPIFunc} from "./net-banking";
import {baseSchema} from "./../validation/validation-schema";
import cloneDeep from "lodash/cloneDeep";
import {handlersMap, getConfig} from "../config";
import {validateCardType, validateScheme, cardDate, validateCvv} from "../validation/custom-validations";
import {custFetch} from "../interceptor";
import {urlReEx} from "../constants";
import {getCancelResponse, refineMotoResponse} from "./response";
import {singleHopDropOutFunction,singleHopDropInFunction} from "./singleHop";
//import $ from 'jquery';

const regExMap = {
    'cardNumber': /^[0-9]{15,19}$/,
    'name': /^(?!\s*$)[a-zA-Z .]{1,50}$/,
    'CVV': /^[0-9]{3,4}$/, //todo: handle cases for amex
    url: urlReEx
};

let cancelApiResp;

const blazeCardValidationSchema = {

    mainObjectCheck: {
        /* keysCheck: ['cardNo', 'expiry', 'cvv', 'cardHolderName',
         'email', 'phone', 'amount', 'currency', 'returnUrl', 'notifyUrl', 'merchantTransactionId', 'merchantAccessKey',
         'signature', 'cardType','cardScheme'],*/
        blazeCardCheck: true
    },
    expiry: {presence: true, cardDate: true},
    cvv: {presence: true, format: regExMap.CVV},
    //cardHolderName : { presence: true, format: regExMap.name },
    email: {presence: true, email: true},
    phone: {length: {maximum: 10}},
    amount: {presence: true},
    currency: {presence: true},
    cardType: {presence: true},
    returnUrl: {
        presence: true,
        custFormat: {
            pattern: regExMap.url,
            message: 'should be proper URL string'
        }
    },
    notifyUrl: {
        custFormat: {
            pattern: regExMap.url,
            message: 'should be proper URL string'
        }
    },
    merchantAccessKey: {presence: true},
    signature: {presence: true}
};

let makeBlazeCardPaymentConfObj;

const makeBlazeCardPayment = validateAndCallbackify(blazeCardValidationSchema, (confObj) => {
    makeBlazeCardPaymentConfObj = confObj;
    //needed to convert cardType and cardScheme with server expected values
    const paymentDetails = Object.assign({}, confObj, {
        cardType: validateCardType(confObj.cardType),
        cardScheme: confObj.cardScheme//validateScheme(confObj.cardScheme)
    });

    return custFetch(getConfig().blazeCardApiUrl + '/cards-gateway/rest/cardspg/mpi', {
        method: 'post',
        headers: {
            'Content-Type': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify(paymentDetails)
    }).then(function (resp) {
        //to handler back button cancellation scenario

        if (history && history.pushState) {
            let href = window.location.href;
            let appendChar = href.indexOf('?') > -1 ? '&' : '?';
            let newurl = window.location.href + appendChar + 'fromBank=yes';
            window.history.pushState({path: newurl}, '', newurl);
            makeBlazeCardPaymentConfObj.citrusTransactionId = resp.data.citrusTransactionId;
            localStorage.setItem('blazeCardcancelRequestObj', JSON.stringify(makeBlazeCardPaymentConfObj));
        }
        return resp;
    });

});

const merchantCardSchemesSchema = {
    merchantAccessKey: {presence: true}
};

const getmerchantCardSchemes = validateAndCallbackify(merchantCardSchemesSchema, (confObj) => {

    return custFetch(getConfig().blazeCardApiUrl + '/cards-gateway/rest/cardspg/merchantCardSchemes/getEnabledCardScheme', {
        method: 'post',
        headers: {
            'Content-Type': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify(confObj)
    });
});

//moto implementation

const motoCardValidationSchema = Object.assign(cloneDeep(baseSchema), {
    paymentDetails: {
        presence: true,
        cardCheck: true,
        keysCheck: ['type', 'number', 'holder', 'cvv', 'expiry']
    },
    "paymentDetails.holder": {presence: true, format: regExMap.name}
});

motoCardValidationSchema.mainObjectCheck.keysCheck.push('paymentDetails');

const motoCardApiFunc = (confObj) => {
    const cardScheme = schemeFromNumber(confObj.paymentDetails.number);
    let paymentDetails;
    if (cardScheme === 'maestro') {
        paymentDetails = Object.assign({}, confObj.paymentDetails, {
            type: validateCardType(confObj.paymentDetails.type),
            scheme: validateScheme(cardScheme),
            expiry: confObj.paymentDetails.expiry,
            cvv: confObj.paymentDetails.cvv
        });
    } else {
        paymentDetails = Object.assign({}, confObj.paymentDetails, {
            type: validateCardType(confObj.paymentDetails.type),
            scheme: validateScheme(cardScheme),
            expiry: cardDate(confObj.paymentDetails.expiry),
            cvv: validateCvv(confObj.paymentDetails.cvv, cardScheme)
        });
    }

    var d = confObj.paymentDetails.expiry.slice(3);
    if (d.length == 2) {
        var today = new Date();
        var year = today.getFullYear().toString().slice(0, 2);
        confObj.paymentDetails.expiry = confObj.paymentDetails.expiry.toString().slice(0, 3) + year + d;
    }
    const reqConf = Object.assign({}, confObj, {
        amount: {
            currency: confObj.currency || 'INR',
            value: confObj.amount
        },
        paymentToken: {
            type: 'paymentOptionToken',
            paymentMode: paymentDetails
        },
        merchantAccessKey: getMerchantAccessKey(confObj),
        requestOrigin: confObj.requestOrigin || "CJSG"
    });
    reqConf.paymentToken.paymentMode.expiry = confObj.paymentDetails.expiry;
    reqConf.offerToken = getConfig().dpOfferToken;
    delete reqConf.paymentDetails;
    delete reqConf.currency;
    const mode = (reqConf.mode) ? reqConf.mode.toLowerCase() : "";
    delete reqConf.mode;
    cancelApiResp = getCancelResponse(reqConf);
    if (mode === 'dropout' || getConfig().page === 'ICP') {
    } else {
        reqConf.returnUrl = window.location.protocol + '//' + window.location.host + '/blade/returnUrl';
       winRef = openPopupWindow("");
        //winRef.document.write('<form method="post" action="https://dropit.3dsecure.net/PIT/ACS" name="submitForm"><input value="eJxVUttygjAU/BWG95KgeJ1DHG8dnbYWrdXpYwop0oGEJqFqv74JYi+8cDYns3t2T2B0KnLnk0mVCR66voddh/FYJBlPQ/d5e3vTd0cEtgfJ2OyJxZVkBB6YUjRlTpaE7unlKHLcLZL13fPtYXvcLKb3812JB4N56BKIxhv2QaARIIbfawG6QsMk4wPlmgCNPybLFQna7VYvANRAKJhczsibUs6f72aAMW4FHQzo0gdOC0ammZaVciJ6LhjXzpPIK21UlAOo7kMsKq7lmbQ7XUBXAJXMyUHrUg0RUrXDMtVMac+ocqa9WHgZR2V6pGeUUs3snyZJPbr3rkpAlgHQr5eospUyiqcsIUyvHndcFPOoGn+94s/9Mc8i3t+390EIyN6AxNCSFva7uO/7Du4NO71hYFKoz4EWdlSyUSY9Y7mBUFqV8QX4tvH3AIwPaRZ5NXtFwE6l4CYeYtbwUwP6HXm6sMuItYlVbNNV/LYQ+UM3yeV6ORO7iVyHoV1PfcGyZSZDM/qFzgJAlgI1m0fNYzHVv0f0DXN801k=" name="PaReq" type="hidden"/><input value="2815681571962240" name="MD" type="hidden"/><input value="https://sandbox.citruspay.com/nagama2/OTQ0MjU5/hdfc3d_acs_response" name="TermUrl" type="hidden"/><noscript><input id="multipage-continue-button" value="Click here to continue" name="pymntFormSubmitButton" type="submit"/></noscript></form><script>window.onload = function() { document.submitForm.submit()};</script>');
       winRef.document.write('<html><head> <meta name="viewport" content="width=device-width"/> <meta http-equiv="Cache-control" content="public"/> <title>Redirecting to Bank</title></head><style>body{background: #fafafa;}#wrapper{position: fixed; position: absolute; top: 10%; left: 0; right: 0; margin: 0 auto; font-family: Tahoma, Geneva, sans-serif; color: #000; text-align: center; font-size: 14px; padding: 20px; max-width: 500px; width: 70%;}.maintext{font-family: Roboto, Tahoma, Geneva, sans-serif; color: #f6931e; margin-bottom: 0; text-align: center; font-size: 16pt; font-weight: 400;}.textRedirect{color: #675f58;}.subtext{margin: 15px 0 15px; font-family: Roboto, Tahoma, Geneva, sans-serif; color: #929292; text-align: center; font-size: 10pt;}.subtextOne{margin: 35px 0 15px; font-family: Roboto, Tahoma, Geneva, sans-serif; color: #929292; text-align: center; font-size: 10pt;}@media screen and (max-width: 480px){#wrapper{max-width: 100%!important;}}</style><body> <div id="wrapper"> <div id="imgtext" style="margin-left:1%; margin-bottom: 5px;"><!--<img src="https://context.citruspay.com/kiwi/images/logo.png"/>--> </div><div id="imgtext" style="text-align:center;padding: 15% 0 10%;"><!---<img src="https://context.citruspay.com/kiwi/images/puff_orange.svg"/>--></div><p class="maintext">Processing <span class="textRedirect">Payment</span> </p><p class="subtext"><span>We are redirecting you to the bank\'s page</span></p><p class="subtextOne"><span>DO NOT CLOSE THIS POP-UP</span> </p></div></body></html>');
    }
    if (getConfig().page === 'ICP') {
        return custFetch(`${getConfig().motoApiUrl}/moto/authorize/struct/${getConfig().vanityUrl}`, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            body: JSON.stringify(reqConf)
        })
    }
    else {
        return custFetch(`${getConfig().motoApiUrl}/moto/authorize/struct/${getConfig().vanityUrl}`, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            body: JSON.stringify(reqConf)
        }).then(function (resp) {
            if (getConfig().page !== 'ICP') {
                if (resp.data.redirectUrl) {
                    if (mode === "dropout") {
                        singleHopDropOutFunction(resp.data.redirectUrl);
                    }
                    else {
                        singleHopDropInFunction(resp.data.redirectUrl).then(function(response){
                        setTimeout(function () {

                            //arindam logic
                             /*var newDoc = winRef.document.open("text/html", "replace");
                             newDoc.write(response);
                             newDoc.close();*/
                            //arindam logic end
                            response = response.replace('BODY { line-height:1; text-align:left; color:#333333; background:#eeeeee; }', "");
                            response = response.replace('<div id="page-wrapper"><div id="page-client-logo"> </div><div class="h-space">  </div><div version="2.0"><div style="text-align:center;"><br/><br/><br/><br/><br/><br/><img alt="Citrus" height="32" width="81" src="/resources/pg/images/logo_citrus-med.png"/><br/><br/><span style="font-size:18px;">Redirecting to Payment site, please do not refresh this page</span></div>','<style>body{background: #fafafa;}#wrapper{position: fixed; position: absolute; top: 10%; left: 0; right: 0; margin: 0 auto; font-family: Tahoma, Geneva, sans-serif; color: #000; text-align: center; font-size: 14px; padding: 20px; max-width: 500px; width: 70%;}.maintext{font-family: Roboto, Tahoma, Geneva, sans-serif; color: #f6931e; margin-bottom: 0; text-align: center; font-size: 16pt; font-weight: 400;}.textRedirect{color: #675f58;}.subtext{margin: 15px 0 15px; font-family: Roboto, Tahoma, Geneva, sans-serif; color: #929292; text-align: center; font-size: 10pt;}.subtextOne{margin: 35px 0 15px; font-family: Roboto, Tahoma, Geneva, sans-serif; color: #929292; text-align: center; font-size: 10pt;}@media screen and (max-width: 480px){#wrapper{max-width: 100%!important;}}</style><body><div id="wrapper"><div id="imgtext" style="margin-left:1%; margin-bottom: 5px;"><!--<img src="https://context.citruspay.com/kiwi/images/logo.png"/>--> </div> <div id="imgtext" style="text-align:center;padding: 15% 0 10%;"><!---<img src="https://context.citruspay.com/kiwi/images/puff_orange.svg"/>--></div><p class="maintext">Processing <span class="textRedirect">Payment</span> </p><p class="subtext"><span>We are redirecting you to the bank\'s page</span></p><p class="subtextOne"><span>DO NOT CLOSE THIS POP-UP</span> </p></div></body>');
                            console.log(response);
                           // response = response.replace(/<\/?img[^>]*>/g,"");
                            var newDoc = winRef.document.open("text/html", "replace");
                            newDoc.write(response);
                            newDoc.close();
                            //winRef.documentElement.style.display = "none";
                            //newDoc.close();
                           /* let el = winRef.document.createElement('html');
                             console.log("before innerhtml", el);
                            el.innerHTML = response;
                             console.log("after innerhtml", el);*/
                           //  //winRef = openPopupWindow(resp.data.redirectUrl);
                           //  //winRef.document.write(response);
                           /*var form = el.getElementsByTagName('form');
                           console.log(form);*/
                           //  //winRef.onload();
                           // // form.submitForm.setAttribute("target", "CitrusOverlay");
                            //winRef.document.body.appendChild(form.submitForm);
                            //console.log(winRef.document);
                           //winRef.document.close();
                            /*newDoc.write('<form>'+form.innerHTML+'</form>');
                            newDoc.write('<script type="text/javascript">if(submitPaymentForm) {window.onload = function() { insertHistoryRecordIfRequired(); document.submitForm.submit()};}</script>');
                            */
                            

                            if (!isIE()) {
                                workFlowForModernBrowsers(winRef);
                            } else {
                                workFlowForIE(winRef);
                            }
                        }, 1000);
                        });
                    }
                } else {
                    winRef.close();
                    const response = refineMotoResponse(resp.data);
                    handlersMap['serverErrorHandler'](response);
                }
            }
        });
    }
};

const makeMotoCardPayment = validateAndCallbackify(motoCardValidationSchema, motoCardApiFunc);

let winRef = null;
let transactionCompleted = false;

const openPopupWindow = (url) => {
    if(winRef == null || winRef.closed) {
        var width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
        var height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;
        var w = 800;
        var h = 600;
        var left = ((width - w) / 2);
        var top = height/10;
        winRef = window.open(url,'CitrusOverlay', 'scrollbars=yes, width=' + w + ', height=' + h + ', top=' + top + ', left=' + left + 'visible=none;');
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
                const url = `${getConfig().adminUrl}/api/v1/txn/enquiry`;
                return  custFetch(url, {
                    method: 'post',
                    mode: 'cors',
                    body: form
                }).then(function(resp){
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
                const url = `${getConfig().adminUrl}/api/v1/txn/enquiry`;
                return  custFetch(url, {
                    method: 'post',
                    mode: 'cors',
                    body: form
                }).then(function(resp){
                    handlersMap['transactionHandler'](resp.data.enquiry);
                });
            }
        }
    }, 500);
};

const savedCardValidationSchema = Object.assign({}, savedNBValidationSchema, {CVV: {presence: true}});
savedCardValidationSchema.mainObjectCheck.keysCheck.push('CVV');

const makeSavedCardPayment = validateAndCallbackify(savedCardValidationSchema, (confObj)=> {
    const apiUrl = `${getConfig().motoApiUrl}/moto/authorize/struct/${getConfig().vanityUrl}`;
    return savedAPIFunc(confObj, apiUrl);
});

export {
    makeBlazeCardPayment, getmerchantCardSchemes, motoCardValidationSchema, motoCardApiFunc,
    makeMotoCardPayment, makeSavedCardPayment
};