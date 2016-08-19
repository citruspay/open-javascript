import {custFetch} from '../interceptor';

const singleHopDropOutFunction = (url) => {

    return custFetch(url, {
        method: 'get',
        mode: 'cors'
    }).then(function (response) {
         let el = document.createElement('body');
         el.innerHTML = response.data;
         console.log(el);
         let form = el.getElementsByTagName('form');
        console.log(form.innerHTML);
        try{
            let paymentForm = document.createElement('form');
            switch(Object.prototype.toString.call( form )){
                case "[object NodeList]" :
                    paymentForm.setAttribute("action", form[0].action),
                        paymentForm.setAttribute("method", form[0].method),
                        paymentForm.innerHTML = form[0].innerHTML,
                        document.documentElement.appendChild(paymentForm),
                        paymentForm.submit(),
                        document.documentElement.removeChild(paymentForm);
                    break;
                case "[object HTMLCollection]" :
                    paymentForm.setAttribute("action", form.submitForm.action),
                        paymentForm.setAttribute("method", form.submitForm.method),
                        paymentForm.innerHTML = form.submitForm.innerHTML,
                        document.documentElement.appendChild(paymentForm),
                        paymentForm.submit(),
                        document.documentElement.removeChild(paymentForm);
                    break;
            }
        }catch(e){
            console.log(e);
            let paymentForm = document.createElement('form');
            paymentForm.setAttribute("action", form.returnForm.action);
            paymentForm.setAttribute("method", form.returnForm.method);
            paymentForm.innerHTML = form.returnForm.innerHTML;
            document.body.appendChild(paymentForm);
            paymentForm.submit();
            document.body.removeChild(paymentForm);
        }


        // response.data = response.data.replace('BODY { line-height:1; text-align:left; color:#333333; background:#eeeeee; }', "");
        // response.data = response.data.replace('<div id="page-wrapper"><div id="page-client-logo"> </div><div class="h-space">  </div><div version="2.0"><div style="text-align:center;"><br/><br/><br/><br/><br/><br/><img alt="Citrus" height="32" width="81" src="/resources/pg/images/logo_citrus-med.png"/><br/><br/><span style="font-size:18px;">Redirecting to Payment site, please do not refresh this page</span></div>','<style>body{background: #fafafa;}#wrapper{position: fixed; position: absolute; top: 10%; left: 0; right: 0; margin: 0 auto; font-family: Tahoma, Geneva, sans-serif; color: #000; text-align: center; font-size: 14px; padding: 20px; max-width: 500px; width: 70%;}.maintext{font-family: Roboto, Tahoma, Geneva, sans-serif; color: #f6931e; margin-bottom: 0; text-align: center; font-size: 16pt; font-weight: 400;}.textRedirect{color: #675f58;}.subtext{margin: 15px 0 15px; font-family: Roboto, Tahoma, Geneva, sans-serif; color: #929292; text-align: center; font-size: 10pt;}.subtextOne{margin: 35px 0 15px; font-family: Roboto, Tahoma, Geneva, sans-serif; color: #929292; text-align: center; font-size: 10pt;}@media screen and (max-width: 480px){#wrapper{max-width: 100%!important;}}</style><body><div id="wrapper"><div id="imgtext" style="margin-left:1%; margin-bottom: 5px;"><!--<img src="https://context.citruspay.com/kiwi/images/logo.png"/>--> </div> <div id="imgtext" style="text-align:center;padding: 15% 0 10%;"><!---<img src="https://context.citruspay.com/kiwi/images/puff_orange.svg"/>--></div><p class="maintext">Processing <span class="textRedirect">Payment</span> </p><p class="subtext"><span>We are redirecting you to the bank\'s page</span></p><p class="subtextOne"><span>DO NOT CLOSE THIS WINDOW</span> </p></div></body>');
        // var newDoc = document.open("text/html", "replace");
        // newDoc.write(response.data);
        // newDoc.close();
    });
};

const singleHopDropInFunction = (url) => {
    return custFetch(url, {
        method: 'get',
        mode: 'cors'
    }).then(function (response) {
        return response.data;
    });
};
export {singleHopDropOutFunction, singleHopDropInFunction};