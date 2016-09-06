import {custFetch} from '../interceptor';

const singleHopDropOutFunction = (url) => {

    return custFetch(url, {
        method: 'get',
        mode: 'cors'
    }).then(function (response) {
        let el = document.createElement('body');
        el.innerHTML = response.data;
        let form = el.getElementsByTagName('form');
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