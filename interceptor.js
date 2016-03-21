//import {fetch} from 'whatwg-fetch';
import {handlersMap, getConfig} from './config';

const custFetch = function () {
    return fetch.apply(null, arguments).then(function checkStatus(response) {
        let promise;

        if (response.status >= 200 && response.status < 300) {
            if (response.headers.get('Content-Type').includes('application/json')) {
                promise = response.json().then(function (val) {
                    response.data = val;
                    return response;
                });
            } else {
                promise = response.text().then(function (val) {
                    response.data = val;
                    return response;
                });
            }
        } else {

            if (response.headers.get('Content-Type').includes('application/json')) {
                promise = response.json().then(function (val) {
                    response.data = val;
                    return Promise.reject(response);
                });
            } else {
                promise = response.text().then(function (val) {
                    response.data = val;
                    return Promise.reject(response);
                });
            }
        }

        return promise;
    }, function (response) {
        if (response.headers && response.text) {
            if (response.headers.get('Content-Type').includes('application/json')) {
                response.json().then(function (val) {
                    response.data = val;
                });
            } else {
                response.text().then(function (val) {
                    response.data = val;
                });
            }
        } else {
            response.data = response.message || response.description;
        }

        return Promise.reject(response);

    }).then(res => {
        return res;
    }, (err) => {
        console.log('Error response from api: ', err);
        handlersMap['serverErrorHandler'](err);
        return Promise.reject(err); // need to throw in order to propogate error
    });
};

export {custFetch}