import {isUrl, isV3Request} from "./../utils";
import {PAGE_TYPES} from "../constants";
import {singleHopDropOutFunction} from "./singleHop";
import {doubleHopDropOutFunction} from "./doubleHop";
import {handleDropIn, handleOlResponse, openPopupWindowForDropIn} from "./drop-in";
import {getConfig, handlersMap} from "../config";
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
            //double hop for rupay cards
            if (getConfig().page === PAGE_TYPES.HOSTED_FIELD) {
                resp.doubleHop = false;
                if (reqConf.paymentToken.paymentMode.scheme === 'RPAY') {
                    resp.doubleHop = true;
                }
                return resp;
            }
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
                            //double hop for rupay cards
                            if (reqConf.paymentToken.paymentMode.scheme === 'RPAY') {
                                doubleHopDropOutFunction(resp.data.redirectUrl);
                            }
                            singleHopDropOutFunction(resp.data.redirectUrl);
                        }
                    } else {
                        //double hop for rupay cards
                        if (reqConf.paymentToken.paymentMode.scheme === 'RPAY') {
                            resp.data.doubleHop = true;
                        }
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
    let isNonOlBanks = (nb && isMotoBank(reqConf.paymentToken.paymentMode.code));
    let isNonOlSavedBanks = (savedNb && isMotoBank(reqConf.bankCode));
    if(isNonOlBanks||isNonOlSavedBanks)
        isOl = false;
    let url;
    isOl ? url = `${getConfig().olUrl}/${getConfig().vanityUrl}` : url = `${getConfig().motoApiUrl}/${getConfig().vanityUrl}`;
    return url;
};

const isMotoBank = (bankCode) => {
    var motoBanks = getConfig().motoBanks;
    return (motoBanks) ? motoBanks.indexOf(bankCode) !== -1 : true;
};


export {handlePayment}