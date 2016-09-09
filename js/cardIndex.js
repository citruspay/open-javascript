
/**
 * Created by nagamai on 9/8/2016.
 */
import 'core-js/fn/object/assign';
import {setAppData} from './utils';
import {makePayment} from './apis/payment';
import {cardFieldHandler} from './apis/card-ui';
window.citrus = window.citrus || {};

Object.assign(window.citrus,{
    payment : {
        makePayment,
        setAppData
    },
    UI : {
        cardFieldHandler
    }
});
