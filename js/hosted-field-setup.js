import {
    getConfigValue,
    validHostedFieldTypes,
    validCardSetupTypes,
    supportedStyleKeys,
    specialStyleKeys
} from "./hosted-field-config";
import {setAppData, getElement} from "./utils";
import {postMessageToChild, getCitrusFrameId} from "./apis/payment";

const create = (setUpConfig) => {
    "use strict";
    let {
        hostedFields,
        setupType,
        style
    } = setUpConfig;
    if (validCardSetupTypes.indexOf(setupType) === -1)
        throw new Error(`invalid setupType "${setupType}", setupType should have one of these values ` + validCardSetupTypes);
    setAppData('hostedFields' + '-' + setupType, hostedFields);
    for (var i = 0, length = hostedFields.length; i < length; ++i) {
        let {
            fieldType,
            selector
        } = hostedFields[i];
        if (validHostedFieldTypes.indexOf(fieldType) !== -1) {
            addIframe(hostedFields[i], setupType.toLowerCase(), style);
        } else {
            throw new Error(`invalid fieldType "${fieldType}", fieldType should have one of these values ` + validHostedFieldTypes);
        }
    }
    //setStyle(style,hostedFields,cardType);
};


const addIframe = (hostedField, cardType, style) => {
    "use strict";
    let {selector, fieldType} = hostedField;
    const invalidSelectorMessage = `invalid selector for field type "${fieldType}", it should be of the form of #id or .cssClass`;
    const iframe = document.createElement('iframe');
    var defaultStyle = {
        width: '100%',
        float: 'left',
        height: '100%',
        /*'marginBottom': '1em',
         'display': 'block',
         backgroundColor: 'transparent',*/
        border: 'none',
        /*outline: '0',
         fontSize: '16px',
         padding: 0,
         boxShadow: 'none',
         borderRadius: 0,
         position: 'relative'*/
    };
    //frameborder="0" allowtransparency="true" scrolling="no"
    iframe.setAttribute('frameborder', 0);
    iframe.setAttribute('allowtransparency', true);
    iframe.setAttribute('scrolling', 'no');
    //iframe.setAttribute('tabindex', '-1');
    Object.assign(iframe.style, defaultStyle);
    //todo: url needs to be configured
    iframe.src = getConfigValue('hostedFieldUrl') + '#' + fieldType + '-' + cardType;
    iframe.id = getCitrusFrameId(fieldType, cardType);
    iframe.onload = () => {
        //console.log('inside iframe onload');
        passAttributesToHostedField(style, hostedField, cardType);
    };
    //todo:check is it really doing anything otherwise remove it.
    iframe.onfocus = ()=> {
        //console.log('inside iframe onfocus');
        var inputElements = document.getElementsByTagName('input');
        if (inputElements && inputElements.length > 0)
            inputElements[0].focus();
    };
    let element = getElement(selector);
    if (element) {
        element.appendChild(iframe);
        element.className += ' citrus-hosted-field';
    }
   
}
//todo:rename to setStyle and other attributes
const passAttributesToHostedField = (attributes, hostedField, cardType) => {

    let hostedFrameAttributes = {
        messageType: 'style'
    };
    let {selector, fieldType} = hostedField;
    if (attributes) {
        if (attributes[selector]) {
            hostedFrameAttributes.specificStyle = attributes[selector];
        }
        if (attributes['input']) {
            hostedFrameAttributes.commonStyle = attributes['input'];
        }
        for (var i = 0; i < specialStyleKeys.length; ++i) {
            var specialStyleKey = specialStyleKeys[i];
            hostedFrameAttributes['input' + specialStyleKey] = attributes[specialStyleKey] || attributes['input' + specialStyleKey];
            hostedFrameAttributes[selector + specialStyleKey] = attributes[specialStyleKey] || attributes[selector + specialStyleKey];
        }
    }
    hostedFrameAttributes.hostedField = hostedField;
    hostedFrameAttributes.cardType = cardType;
    //Object.assign(hostedFrameAttributes,attributes);
    postMessageToChild(fieldType, cardType, hostedFrameAttributes, true);

}

const applyAttributes = (attributes) => {
    if (!attributes)
        return;
    let applicableStyle = {};

    function createSytleObject(styleParam) {
        if (!styleParam)
            return;
        let keys = Object.keys(styleParam);
        for (var i = 0; i < keys.length; ++i) {
            let key = keys[i];
            if (supportedStyleKeys.indexOf(key) !== -1) {
                applicableStyle[convertHyphenFormatToCamelCase(key)] = styleParam[key];
            } else if (specialStyleKeys.indexOf(key) !== -1) {
                //todo:handle :focus,.valid,.invalid here

            } else {
                console.warn(`${key} is not supported`);
            }
        }
    }

    setAppData('hostedField', attributes.hostedField);
    setAppData('cardType', attributes.cardType);
    createSytleObject(attributes.commonStyle);
    createSytleObject(attributes.specificStyle);
    var inputElement = document.getElementsByTagName('input')[0];
    if (attributes.hostedField && attributes.hostedField.placeholder) {
        inputElement.setAttribute('placeholder', attributes.hostedField.placeholder);
    }
    Object.assign(inputElement.style, applicableStyle);
    var cssText = '';
    for (var i = 0; i < specialStyleKeys.length; ++i) {
        var specialStyleKey = specialStyleKeys[i];
        if (attributes['input' + specialStyleKey]) {
            cssText += convertStyleToCssString('input' + specialStyleKey, attributes['input' + specialStyleKey]);
        }
        
        //if(attributes[])
    }
    addStyleTag(cssText);
}

const isValidSelector = (selector, hostedField)=> {


}
const convertCustomSytleObjectToCssString = (style, selector)=> {

}

const convertStyleToCssString = (selector, style)=> {
    if (!style)
        return;
    //console.log(style);
    var keys = Object.keys(style);
    var cssText = selector + ' {';
    var specialStyles = [];
    for (var i = 0; i < keys.length; ++i) {
        let key = keys[i];
        if (supportedStyleKeys.indexOf(key) !== -1) {
            cssText += key + ':' + style[key] + ';'
            //applicableStyle[convertHyphenFormatToCamelCase(key)] = styleParam[key];
        } else {
            console.warn(`${key} is not supported`);
        }
    }
    cssText += '}';
    return cssText;
}

function addCSSRule(selector, rules, sheet, index) {
    if (!sheet && document.styleSheets.length > 0)
        sheet = document.styleSheets[document.styleSheets.length - 1];
    else
        addStyleTag()
    if ("insertRule" in sheet) {
        sheet.insertRule(selector + "{" + rules + "}", index);
    }
    else if ("addRule" in sheet) {
        sheet.addRule(selector, rules, index);
    }
}
const addStyleTag = (css)=> {
    //var css = 'h1 { background: red; }',
    var head = document.head || document.getElementsByTagName('head')[0],
        style = document.createElement('style');

    style.type = 'text/css';
    if (style.styleSheet) {
        style.styleSheet.cssText = css;
    } else {
        style.appendChild(document.createTextNode(css));
    }

    head.appendChild(style);


}

/*function styleHyphenFormat(propertyName) {
 function upperToHyphenLower(match) {
 return '-' + match.toLowerCase();
 }
 return propertyName.replace(/[A-Z]/g, upperToHyphenLower);
 }*/
function convertHyphenFormatToCamelCase(propertyName) {
    function hyphenLowerToUpper(match) {
        return match[1].toUpperCase();
    }

    return propertyName.replace(/-[a-z]/g, hyphenLowerToUpper);
}


export {
    create,
    applyAttributes
};