import {isV3Request, isUrl} from "./../utils";
import {PAGE_TYPES} from "../constants";
import {singleHopDropOutFunction} from "./singleHop";
import {handleDropIn, openPopupWindowForDropIn, handleOlResponse} from "./drop-in";
import {handlersMap, getConfig} from "../config";
import {custFetch} from "../interceptor";
import {refineMotoResponse} from "./response";

let winRef;
const handlePayment = (reqConf,mode,url) => {
    url = url||getBaseUrlForPayment(reqConf);
    delete reqConf.bankCode;
    if (mode === 'dropin' && getConfig().page !== PAGE_TYPES.ICP ) {
        reqConf.returnUrl = getConfig().dropInReturnUrl;
        if(getConfig().page!== PAGE_TYPES.HOSTED_FIELD)
            winRef = openPopupWindowForDropIn(winRef);
    }
    if (getConfig().page === PAGE_TYPES.ICP) {
        return custFetch(url, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            body: JSON.stringify(reqConf)
        });
    } else {
        return custFetch(url, {
            //     return custFetch(`${getConfig().motoApiUrl}/struct/${getConfig().vanityUrl}`, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            body: JSON.stringify(reqConf)
        }).then(function(resp) {
            if (getConfig().page === PAGE_TYPES.HOSTED_FIELD) return resp;
            if (getConfig().page !== PAGE_TYPES.ICP) {
                if (resp.data.redirectUrl) {
                    if (mode === "dropout") {
                        //logic for OL
                        if (isV3Request(reqConf.requestOrigin)) {
                            let htmlStr = resp.data.redirectUrl.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
                            if (isUrl(htmlStr) && !(getConfig().isSingleHop)) {
                                window.top.location = resp.data.redirectUrl;
                                return;
                            }
                            isUrl(htmlStr) ? singleHopDropOutFunction(htmlStr) : handleOlResponse(htmlStr);
                        } else {
                            singleHopDropOutFunction(resp.data.redirectUrl);
                        }
                    } else { //the code will never reach this point for the time being (or at least should not reach)
                        handleDropIn(resp.data, winRef, reqConf);
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

const getBaseUrlForPayment = (reqConf)=>{
    let nb = (reqConf.paymentToken.paymentMode && reqConf.paymentToken.paymentMode.type==="netbanking");
    let savedNb = !!reqConf.bankCode;
    //change for hdfc netbanking and kotak mahindra netbanking, issuer code = CID010 makes the ol flag false.
    let isOl = ((getConfig().isOlEnabled === 'true') || (getConfig().isOlEnabled===true));
    let isNonOlBanks = (nb && (reqConf.paymentToken.paymentMode.code === 'CID010' || reqConf.paymentToken.paymentMode.code === 'CID033'));
    let isNonOlSavedBanks = (savedNb && (reqConf.bankCode === 'CID010' || reqConf.bankCode === 'CID033'));
    if(isNonOlBanks||isNonOlSavedBanks)
        isOl = false;
    let url;
    isOl ? url = `${getConfig().olUrl}/${getConfig().vanityUrl}` : url = `${getConfig().motoApiUrl}/${getConfig().vanityUrl}`;
    return url;
};

export {handlePayment}