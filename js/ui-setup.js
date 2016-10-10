import {
    getConfigValue,
    validHostedFieldTypes,
    validCardSetupTypes,
    supportedStyleKeys
} from './ui-config'
const citrusSelectorPrefix = 'citrus';
const uiSetup = (setUpConfig) => {
    "use strict";
    let {
        hostedFields,
        cardType,
        style
    } = setUpConfig;
    if (validCardSetupTypes.indexOf(cardType) === -1)
        throw new Error(`invalid cardType "${cardType}", cardType should have one of these values ` + validCardSetupTypes);
    for (var i = 0, length = hostedFields.length; i < length; ++i) {
        let {
            fieldType,
            identifier
        } = hostedFields[i];
        if (validHostedFieldTypes.indexOf(fieldType) !== -1) {
            appendIframe(identifier, fieldType, cardType.toLowerCase(), style);
        } else {
            throw new Error(`invalid fieldType "${fieldType}", fieldType should have one of these values ` + validHostedFieldTypes);
        }
    }
    //setStyle(style,hostedFields,cardType);
};


const appendIframe = (identifier, fieldType, cardType, style) => {
    "use strict";
    const invalidIdentifierMessage = `invalid identifier for field type "${fieldType}", it should be of the form of #id or .cssClass`;
    const iframe = document.createElement('iframe');
    var defaultStyle = {
        width: '100%',
        float: 'left',
        height: '52px',
        'marginBottom': '1em',
        'display': 'block',
        backgroundColor: 'transparent',
        border: 'none',
        outline: '0',
        fontSize: '16px',
        padding: 0,
        boxShadow: 'none',
        borderRadius: 0,
        position: 'relative'
    };
    //frameborder="0" allowtransparency="true" scrolling="no"
    iframe.setAttribute('frameborder', 0);
    iframe.setAttribute('allowtransparency', true);
    iframe.setAttribute('scrolling', 'no');
    Object.assign(iframe.style, defaultStyle);
    //todo: url needs to be configured
    iframe.src = getConfigValue('hostedFieldUrl') + '#' + fieldType + '-' + cardType;
    iframe.id = getCitrusFrameId(fieldType, cardType);
    iframe.onload = () => {
        setStyle(style, identifier, fieldType, cardType);
    }
    if (!identifier || identifier.length <= 1)
        throw new Error(invalidIdentifierMessage);
    const identifierName = identifier.slice(1);
    if (identifier.indexOf('#') === 0)
        document.getElementById(identifierName).appendChild(iframe);
    else if (identifier.indexOf('.') == 0)
        document.getElementsByClassName(identifierName)[0].appendChild(iframe);
    else throw new Error(invalidIdentifierMessage);
}

const setStyle = (style, identifier, fieldType, cardType) => {
    if (!style)
        return;
    let hostedFrames = [];
    //for(var i=0;i<hostedFields.length;++i)
    //{
    let hostedFrameStyle = {
        messageType: 'style'
    };
    //let {identifier,fieldType} = hostedField;
    if (style[identifier]) {
        hostedFrameStyle.specificStyle = style[identifier];
    }
    if (style['input']) {
        hostedFrameStyle.commonStyle = style['input'];
    }
    postMessageToChild(fieldType, cardType, hostedFrameStyle, true);
    //}
}

const applyStyle = (style) => {
    if (!style)
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
            } else {
                console.warn(`${key} is not supported`);
            }
        }
    }
    createSytleObject(style.commonStyle);
    createSytleObject(style.specificStyle);
    var inputElement = document.getElementsByTagName('input')[0];
    Object.assign(inputElement.style, applicableStyle);

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

const postMessageToChild = (fieldType, cardType, message, isSetTimeoutRequired) => {
    let frameId = getCitrusFrameId(fieldType, cardType);
    if (isSetTimeoutRequired) {
        setTimeout(() => {
            postMessage(frameId, message);
        }, 0);
    } else {
        postMessage(frameId, message);
    }
}

const postMessage = (frameId, message) => {
    let childFrameDomain = getConfigValue('hostedFieldDomain');
    let win = document.getElementById(frameId).contentWindow;
    win.postMessage(message, childFrameDomain);
}

const getCitrusFrameId = (fieldType, cardType) => {
    return citrusSelectorPrefix + fieldType + '-' + cardType;
}

export {
    uiSetup,
    applyStyle
};