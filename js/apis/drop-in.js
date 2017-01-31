import {singleHopDropInFunction} from "./singleHop";
import {handlersMap, getConfig} from "../config";
import {getAppData} from "../utils";
import {custFetch} from "../interceptor";


const dropInHtml = '<html><head> <meta name="viewport" content="width=device-width"/> <meta http-equiv="Cache-control" content="public"/> <title>Redirecting to Bank</title></head><style>body{background: #fafafa;}#wrapper{position: fixed; position: absolute; top: 10%; left: 0; right: 0; margin: 0 auto; font-family: Tahoma, Geneva, sans-serif; color: #000; text-align: center; font-size: 14px; padding: 20px; max-width: 500px; width: 70%;}.maintext{font-family: Roboto, Tahoma, Geneva, sans-serif; color: #f6931e; margin-bottom: 0; text-align: center; font-size: 16pt; font-weight: 400;}.textRedirect{color: #675f58;}.subtext{margin: 15px 0 15px; font-family: Roboto, Tahoma, Geneva, sans-serif; color: #929292; text-align: center; font-size: 10pt;}.subtextOne{margin: 35px 0 15px; font-family: Roboto, Tahoma, Geneva, sans-serif; color: #929292; text-align: center; font-size: 10pt;}@media screen and (max-width: 480px){#wrapper{max-width: 100%!important;}}</style><body> <div id="wrapper"> <div id="imgtext" style="margin-left:1%; margin-bottom: 5px;"><img src="https://mocha.citruspay.com/static/images/logo.png"/></div><div id="imgtext" style="text-align:center;padding: 15% 0 10%;"><img src="https://mocha.citruspay.com/static/images/puff_orange.svg"/></div><p class="maintext">Processing <span class="textRedirect">Payment</span> </p><p class="subtext"><span>We are redirecting you to the bank\'s page</span></p><p class="subtextOne"><span>DO NOT CLOSE THIS POP-UP</span> </p></div></body></html>';

const openPopupWindow = (url,winRef) => {
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

//todo:not the best code, can we do something
//else
const openPopupWindowForDropIn = (winRef)=>{
    winRef = openPopupWindow("",winRef);
    winRef.document.write(dropInHtml);
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
                let paymentObj = getAppData('paymentObj');
                let param = `accessKey=${getConfig().merchantAccessKey}&txnId=${paymentObj.merchantTxnId}&amount=${paymentObj.amount}&signature=${paymentObj.requestSignature}`;
                const url = `${getConfig().adminUrl}/service/v0/redis/api/getTxnModel`;
                return custFetch(url, {
                    method: 'post',
                    mode: 'cors',
                    body: param,
                    headers: {
                        "content-type": "application/x-www-form-urlencoded"
                    }
                }).then(function (resp) {
                    handlersMap['transactionHandler'](resp.data);
                });
            }
        } else {
            clearInterval(intervalId);
        }
    }, 500);
};


const handleDropIn = (motoResponse,winRef)=>{
singleHopDropInFunction(motoResponse.redirectUrl).then(function(response) {
                    if (winRef && winRef.closed !== true) {
                        response = response.replace('<img alt="Citrus" height="32" width="81" src="/resources/pg/images/logo_citrus-med.png"/>', '');
                        let el = document.createElement('body');
                        el.innerHTML = response;
                        let form = el.getElementsByTagName('form');
                        try {
                            let paymentForm = document.createElement('form');
                            paymentForm.setAttribute("action", form[0].action);
                            paymentForm.setAttribute("method", form[0].method);
                            paymentForm.setAttribute("target", winRef.name);
                            paymentForm.innerHTML = form[0].innerHTML;
                            document.documentElement.appendChild(paymentForm);
                            paymentForm.submit();
                            document.documentElement.removeChild(paymentForm);
                        } catch (e) {
                            console.log(e);
                        }
                    }
                    workFlowForModernBrowsers(winRef);
                    
                });
};

const handleOlResponse = (htmlStr) => {
    let el = document.createElement('body');
    el.innerHTML = htmlStr;
    let form = el.getElementsByTagName('form');
    try {
        let paymentForm = document.createElement('form');
        paymentForm.setAttribute("action", form[0].action),
            paymentForm.setAttribute("method", form[0].method),
            paymentForm.innerHTML = form[0].innerHTML,
            document.documentElement.appendChild(paymentForm),
            paymentForm.submit(),
            document.documentElement.removeChild(paymentForm);
    } catch (e) {
        console.log(e);
    }
};

export {
    handleDropIn,
    openPopupWindowForDropIn,
    handleOlResponse
}
