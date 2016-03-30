
const netBankingConfig = {
    "merchantTxnId": "nosdfjlkeuwjffasdf1354",
    "amount": 1.00,
    "userDetails": {
        "email": "nikhil.yeole1@gmail.com",
        "firstName": "nikhil",
        "lastName": "yeole",
        "address": {
            "street1": "abcstree1",
            "street2": "abcstree2",
            "city": "Pune",
            "state": "MS",
            "country": "IND",
            "zip": "411038"
        },
        "mobileNo": "99349494944"
    },
    //"bankName" : 'AXIS Bank',
    "bankCode": "CID002",
    "returnUrl": "http://locahost:3000/returnUrl",
    //"notifyUrl": "<%= notifyUrl>",
    "merchantAccessKey": "66PT1PDZ38A5OB1PTF01",
    "requestSignature": "e87dd86b0a888e7c2f90b8c6754d1369da4b2b88"
};

const creditCardConfig = {
    "merchantTxnId": "nosdfjlkeuwjffasdf2508",
    "amount": "1.00",
    //currency" : '$',
    "userDetails": {
        "email": "nikhil.yeole1@gmail.com",
        "firstName": "nikhil",
        "lastName": "yeole",
        "address": {
            "street1": "abcstree1",
            "street2": "abcstree2",
            "city": "Pune",
            "state": "MS",
            "country": "IND",
            "zip": "411038"
        },
        "mobileNo": "99349494944"
    },

    "paymentDetails": {
        "type": "CREDITCARD",//credit
        "scheme": "visa", //VISA
        "number": "4111111111111111",
        "holder": "nikhil",
        "expiry": "11/2016",
        "cvv": "234",
    },

    "returnUrl": "www.abc.com",
    //"notifyUrl": "<%= notifyUrl %>",
    //"merchantAccessKey": "66PT1PDZ38A5OB1PTF01",
    "requestSignature": "96fca257de67f8f8726a8efd8888ff42bc919284",
};

const test1 = () => {
    citrus.setConfig({
        merchantAccessKey: '66PT1PDZ38A5OB1PTF01',
        vanityUrl: 'rr5dhnsvew'
    });
    //citrus.netbanking.makeNetBankingPayment(netBankingConfig)
    let p = citrus.cards.makeCardPayment(creditCardConfig /*function(err, data){
        console.log('Callback error: ', err);
        console.log('Callback data: ', data);
    }*/);
    console.log('Promise or undefined: ', p);
    if(p){
        p.then(function(resp){
            console.log('From makeCardPayment promise success handler- resp:', resp);
        },function(errResp){
            console.log('From makeCardPayment promise err handler- resp:', errResp);
        });
    }
};

export {test1};