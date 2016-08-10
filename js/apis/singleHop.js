import {custFetch} from '../interceptor';

const singleHopDropOutFunction = (url) => {

    return custFetch(url, {
        method: 'get',
        mode: 'cors'
    }).then(function (response) {
        let el = document.createElement('html');
        el.innerHTML = response.data;
        var form = el.getElementsByTagName('form');
        console.log(form);
        form.submitForm.submit();
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