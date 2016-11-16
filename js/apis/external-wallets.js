/**
 * Created by nagamai on 11/9/2016.
 */
import {custFetch} from "../interceptor";
import {validateAndCallbackify, getMerchantAccessKey} from "./../utils";
import {baseSchema} from "./../validation/validation-schema";
import cloneDeep from "lodash/cloneDeep";
import {handlersMap, getConfig} from "../config";
import {singleHopDropOutFunction, singleHopDropInFunction} from "./singleHop";

const extWalletValidationSchema = Object.assign(cloneDeep(baseSchema), {
    paymentDetails: {
        presence: true,
        keysCheck: ['bank', 'code']
    },
    "paymentDetails.bank": {presence: true},
    "paymentDetails.code": {presence: true}
});
extWalletValidationSchema.mainObjectCheck.keysCheck.push('paymentDetails');
/* "type": "netbanking",
 "bank": "Idea Money",
 "code": "BCW009" */
const extWalletApiFunc = (confObj) => {
    const reqConf = Object.assign({}, confObj, {
        amount: {
            currency: confObj.currency || 'INR',
            value: confObj.amount
        },
        paymentToken: {
            type: 'paymentOptionToken',
            paymentMode: {
                type : "wallet",
                bank : confObj.paymentDetails.bank,
                code : confObj.paymentDetails.code
            }
        },
        merchantAccessKey: getMerchantAccessKey(confObj),
        requestOrigin: confObj.requestOrigin || "CJSG"
    });
    reqConf.paymentToken.paymentMode.expiry = confObj.paymentDetails.expiry;
    delete reqConf.paymentDetails;
    delete reqConf.currency;
    const mode = (reqConf.mode) ? reqConf.mode.toLowerCase() : "";
    delete reqConf.mode;
    reqConf.deviceType = getConfig().deviceType;
    if (mode === 'dropout' || getConfig().page === 'ICP') {
    } else {
        if (reqConf.requestOrigin === "CJSG") {
            reqConf.returnUrl = getConfig().dropInReturnUrl;
        }
    }
    if (getConfig().page === 'ICP') {
        return custFetch(`${getConfig().motoApiUrl}/${getConfig().vanityUrl}`, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            body: JSON.stringify(reqConf)
        })
    }
    else {
        return custFetch(`${getConfig().motoApiUrl}/${getConfig().vanityUrl}`, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            body: JSON.stringify(reqConf)
        }).then(function (resp) {
            if (reqConf.requestOrigin === "CJSG") return resp;
            if (getConfig().page !== 'ICP') {
                if (resp.data.redirectUrl) {
                    if (mode === "dropout") {
                        (reqConf.requestOrigin === "SSLV3G" || reqConf.requestOrigin === "SSLV3W")?window.location = resp.data.redirectUrl:singleHopDropOutFunction(resp.data.redirectUrl);
                    }
                    else {
                        if (winRef && winRef.closed) {
                            handlersMap["serverErrorHandler"](cancelApiResp);
                            return;
                        }
                        singleHopDropInFunction(resp.data.redirectUrl).then(function (response) {
                            let el = document.createElement('body');
                            el.innerHTML = response;
                            let form = el.getElementsByTagName('form');
                            try {
                                if (winRef && winRef.closed) {
                                    handlersMap["serverErrorHandler"](cancelApiResp);
                                    return;
                                }
                                let paymentForm = document.createElement('form');
                                paymentForm.setAttribute("action", form[0].action),
                                    paymentForm.setAttribute("method", form[0].method),
                                    paymentForm.setAttribute("target", winRef.name),
                                    paymentForm.innerHTML = form[0].innerHTML,
                                    document.documentElement.appendChild(paymentForm),
                                    paymentForm.submit(),
                                    document.documentElement.removeChild(paymentForm);
                            } catch (e) {
                                console.log(e);
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
            }
        });
    }
};
const makeExtWalletsPayment = validateAndCallbackify(extWalletValidationSchema, extWalletApiFunc);



export {makeExtWalletsPayment};


