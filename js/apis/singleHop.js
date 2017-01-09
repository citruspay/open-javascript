import {custFetch} from '../interceptor';

const singleHopDropOutFunction = (url) => {

    return custFetch(url, {
        method: 'get',
        mode: 'cors'
    }).then(function (response) {

        /* OL integration logic to be uncommented later*/
        // document.open('text/html');
        // document.write(response);
        // document.close();
        // return;
        /*End of OL integration logic*/
        let el = document.createElement('body');
        el.innerHTML = response.data;
        let form = el.getElementsByTagName('form');
        try{
            let paymentForm = document.createElement('form');
            paymentForm.setAttribute("action", form[0].action);
            paymentForm.setAttribute("method", form[0].method);
            paymentForm.innerHTML = form[0].innerHTML;
            document.documentElement.appendChild(paymentForm);
            paymentForm.submit();
            document.documentElement.removeChild(paymentForm);
        }catch(e){
            console.log(e);
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