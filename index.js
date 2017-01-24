"use strict";

var Alexa = require('alexa-sdk');

var spreadModel = JSON.parse('{"Issuers":[{"Issuer": "APPLE","Ticker": "AAPL","Tenors":[{"Year": 1, "Spread": 27, "Yield": 0.92},{"Year": 2, "Spread": 23, "Yield": 1.09},{"Year": 3, "Spread": 27, "Yield": 1.3},{"Year": 4, "Spread": 31, "Yield": 1.51},{"Year": 5, "Spread": 35, "Yield": 1.72},{"Year": 6, "Spread": 40, "Yield": 1.92},{"Year": 7, "Spread": 46, "Yield": 2.11},{"Year": 8, "Spread": 53, "Yield": 2.28},{"Year": 9, "Spread": 59, "Yield": 2.44},{"Year": 10, "Spread": 65, "Yield": 2.59},{"Year": 11, "Spread": 70, "Yield": 2.72},{"Year": 12, "Spread": 74, "Yield": 2.84},{"Year": 13, "Spread": 77, "Yield": 2.95},{"Year": 14, "Spread": 78, "Yield": 3.04},{"Year": 15, "Spread": 77, "Yield": 3.13},{"Year": 16, "Spread": 76, "Yield": 3.21},{"Year": 17, "Spread": 72, "Yield": 3.28},{"Year": 18, "Spread": 68, "Yield": 3.35},{"Year": 19, "Spread": 62, "Yield": 3.4},{"Year": 20, "Spread": 56, "Yield": 3.46},{"Year": 21, "Spread": 49, "Yield": 3.51},{"Year": 22, "Spread": 42, "Yield": 3.55},{"Year": 23, "Spread": 35, "Yield": 3.59},{"Year": 24, "Spread": 27, "Yield": 3.63},{"Year": 25, "Spread": 20, "Yield": 3.67},{"Year": 26, "Spread": 13, "Yield": 3.7},{"Year": 27, "Spread": 7, "Yield": 3.73},{"Year": 28, "Spread": 2, "Yield": 3.76},{"Year": 29, "Spread": -2, "Yield": 3.78},{"Year": 30, "Spread": -6, "Yield": 3.81}]}]}');
var APP_ID = 'APP-ID-HERE';

var skillName = 'Market Teller';

exports.handler = function (event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    alexa.registerHandlers(sessionHandlers, dataHandlers, missingTenorHandler, missingDataPointHandler, startHandler); //remember to register all handlers, important!
    alexa.execute();
};

var states = {
    DATAMODE: { //User needs to provide additional parameters for an answer
        Tenor: '_Tenor', 
        DataPoint: '_DataPoint',
        Issuer: '_Issuer',
        Ticker: '_Ticker'
    } //had StartMode as well to signal a new session but haven't had a use for it yet. should use at some point to ensure that attributes are erased everytime
};

var sessionHandlers = {

    'NewSession': function() {
        if(Object.keys(this.attributes).length === 0) { // Check if it's the first time the skill has been invoked
            var speechText = '';
            speechText += 'Welcome to Market Teller.';
            speechText += 'You can ask for information on holdings, issuer spreads or trade levels.';
            var repromptText = 'Please ask me anything, ' +
            'like what is the spread for Verizon 10 year?';

            this.emit(':ask', speechText, repromptText);
        }
    },

    'LaunchRequest': function () {
        this.emit('NewSession');
    },

    'AMAZON.StopIntent': function () {
        var speechOutput = 'Goodbye';
        this.emit(':tell', speechOutput);
    },
 
    'AMAZON.CancelIntent': function () {
        this.emit('AMAZON.StopIntent');
    },

    'SessionEndedRequest': function () {
        this.emit('AMAZON.StopIntent');
    },

    'Unhandled': function () {
        var speechOutput = 'I\'m not sure what issuer or tenor you were looking for. Please try again.';
        this.emit(":ask", speechOutput, speechOutput);
    }

};

var missingTenorHandler = Alexa.CreateStateHandler(states.DATAMODE.Tenor, {  //when the handler state is equal to states.DATAMODE.Tenor then this handles the next response

    'NewSession': function () {
        this.handler.state = '';
        this.emitWithState('NewSession'); // Equivalent to the sessionHandler NewSession handler
    },

    'MatchTenor': function() {

        console.log("match tenor")
        this.handler.state = '';
        console.log(this.attributes);
        console.log(this.handler.state);

        var DataPoint = this.attributes.DataPoint.toString();
        var Issuer = this.attributes.Issuer.toString();
        var IssuerType = this.attributes.IssuerType;
        var speechOutput = '';
        var repromptText = '';
        var Tenor = this.event.request.intent.slots.Tenor.value.toString();
        var issuerObj = {};
        var tenorObj = {};

        if (IssuerType == "ISSUER"){
                issuerObj = getObjects(spreadModel, 'Issuer', `${Issuer}`.toUpperCase()); // Returns the matching issuer
        }
        else {
                issuerObj = getObjects(spreadModel, 'Ticker', `${Issuer}`.toUpperCase()); // Returns the matching issuer
        }
        Tenor = Tenor.replace(' years','').replace(' years','').replace('s','').replace(' year', '');

        if (Tenor >= 1 && Tenor <= 30) {              
            tenorObj = getObjects(issuerObj, 'Year', `${Tenor}`); // Returns the matching tenor
            var currentSpread = tenorObj[0].Spread;
            var currentYield = tenorObj[0].Yield;
            if (DataPoint.toUpperCase() == 'SPREAD'){
                speechOutput = `The spread for ${Issuer} ${Tenor} year is ${currentSpread}`;
                this.emit(":tell", speechOutput, skillName, speechOutput);
            }
            else if (DataPoint.toUpperCase() == 'YIELD'){
                speechOutput = `The yield for ${Issuer} ${Tenor} year is ${currentYield}.`;
                this.emit(":tell", speechOutput, skillName, speechOutput);
            }
            else{
                speechOutput = 'I\'m not sure what data point you were looking for.  Please try again.';
                repromptText = 'Please say spread or yield.';
                this.emit(":ask", speechOutput, repromptText);
            }
        }
    },

    'Unhandled': function() {
        console.log("unhandled!");
        console.log(this.attributes);
        console.log(this.handler.state);
        var speechOutput = 'I\'m not sure what tenor you were looking for. Please try again.';
        var repromptText = 'You can say any value from 1 year to 30 years.';
        this.emit(":ask", speechOutput, repromptText);
    },

    'SessionEndedRequest': function () {
        console.log('session ended!');
    }

});

var missingDataPointHandler = Alexa.CreateStateHandler(states.DATAMODE.DataPoint, {  

    'NewSession': function () {
        this.handler.state = '';
        this.emitWithState('NewSession'); // Equivalent to the sessionHandler NewSession handler
    },

    'MatchDataPoint': function() {
        console.log("matchdatapoint");
        this.handler.state = '';
        console.log(this.attributes);
        console.log(this.handler.state);

        var DataPoint = this.event.request.intent.slots.DataPoint.value.toUpperCase();
        var Issuer = this.attributes.Issuer;
        var Tenor = this.attributes.Tenor;
        var Spread = this.attributes.Spread;
        var Yield = this.attributes.Yield;
        var speechOutput = '';

        if (DataPoint.toUpperCase() == 'SPREAD'){
            speechOutput = `The spread for ${Issuer} ${Tenor} year is ${Spread}.`;
        }
        else if (DataPoint.toUpperCase() == 'YIELD'){
            speechOutput = `The yield for ${Issuer} ${Tenor} year is ${Yield}.`;
        }
        this.emit(":tell", speechOutput, skillName, speechOutput);
    },

    'Unhandled': function() {
        console.log("unhandled!");
        console.log(this.attributes);
        console.log(this.handler.state);
        var speechOutput = 'I\'m not sure what data point you were looking for. Please try again.';
        var repromptText = 'You can ask for spread or yield';
        this.emit(":ask", speechOutput, repromptText);
    },

    'SessionEndedRequest': function () {
        console.log('session ended!');
    }

});

var startHandler = {

    'GetDataForIssuer': function () {

        console.log('getdataforissuer');
        const cardTitle = this.event.request.intent.name;
        var currentIssuer = this.event.request.intent.slots.Issuer.value;
        var currentTenor = this.event.request.intent.slots.Tenor.value;
        var currentTicker = this.event.request.intent.slots.Ticker.value;
        var currentDataPoint = this.event.request.intent.slots.DataPoint.value;

        var currentIssuerType = '';
        var currentSpread = null;
        var currentYield = null;

        var speechOutput = '';
        var repromptText = '';

        var sessionAttributes = {};
        
        let issuerObj = {};
        let tenorObj = {};

        //check issuer 
        if (currentIssuer) {    
            this.attributes.Issuer = currentIssuer; //save session attributes

            if (currentIssuer.toUpperCase().startsWith("TICKER")){
                currentIssuer = currentIssuer.toUpperCase().replace("TICKER ","");
                currentIssuerType = "TICKER";
            }
            else {
                currentIssuerType = "ISSUER"; 
            }

            this.attributes.IssuerType = currentIssuerType;
            console.log(currentIssuer);

            if (currentIssuerType == "ISSUER"){
                issuerObj = getObjects(spreadModel, 'Issuer', `${currentIssuer}`.toUpperCase()); // Returns the matching issuer
            }
            else {
                issuerObj = getObjects(spreadModel, 'Ticker', `${currentIssuer}`.toUpperCase()); // Returns the matching issuer
            }

            console.log(issuerObj);

            //check tenor
            if (currentTenor) {  //should add something to make sure that tenor is between 1 and 30 and give an error message if it isnt
                currentTenor = currentTenor.replace(' years','').replace(' years','').replace('s','').replace(' year', '');
                this.attributes.Tenor = currentTenor;
                console.log(`${currentTenor}`);
                if (currentTenor >= 1 && currentTenor <= 30) {              
                            tenorObj = getObjects(issuerObj, 'Year', `${currentTenor}`); // Returns the matching tenor
                            currentSpread = tenorObj[0].Spread;
                            currentYield = tenorObj[0].Yield;
                            this.attributes.Spread = currentSpread;
                            this.attributes.Yield = currentYield;
                }
                if (currentDataPoint) {
                    this.attributes.DataPoint = currentDataPoint;
                    console.log('testing1');
                    console.log(this.attributes);
                    if (currentDataPoint.toUpperCase() == 'SPREAD') {
                        speechOutput = `The spread for ${currentIssuer} ${currentTenor} year is ${currentSpread} basis points.`;
                        this.emit(':tell', speechOutput, skillName, speechOutput); //tell ends the session request along with its session attributes
                    }
                    else if (currentDataPoint.toUpperCase() == 'YIELD') {
                        speechOutput = `The yield for ${currentIssuer} ${currentTenor} year is ${currentYield} percent.`;
                        this.emit(':tell', speechOutput, skillName, speechOutput);        
                    }
                    else  {
                        speechOutput = 'I\'m not sure what issuer or tenor you were looking for. Please try again.';
                        this.emit(':ask', speechOutput, skillName, speechOutput);   
                    }        
                }
                else {
                    console.log('testing7');
                    console.log(this.attributes);
                    speechOutput = `What data point are you looking to find for ${currentIssuer} ${currentTenor} year?`;
                    repromptText = 'You can ask for spread or yield.';
                    this.emit('GetDataPoint', () => { //callback, but first emit GetDataPoint
                        this.emit(':ask', speechOutput, repromptText); //ask does not end the session request so session attributes persist
                    });
                }

            }
            else {
                if (currentTenor === undefined || currentTenor === null || currentTenor === '') {
                    if (currentDataPoint) { //only missing Tenor
                        this.attributes.DataPoint = currentDataPoint;
                        console.log('testing2');
                        console.log(this.attributes);
                        speechOutput = 'For what tenor are you looking to find the spread for?';
                        repromptText = 'You can say any value from 1 year to 30 years.';
                        this.emit('GetTenor', () => { //callback, but first emit GetTenor 
                            this.emit(':ask', speechOutput, repromptText); //ask does not end the session request so session attributes persist
                        });
                    }
                    else { //missing DataPoint and Tenor
                        speechOutput = 'Please specify a tenor to load.  For example, you can say load apple ten year.';
                        this.emit(':ask', speechOutput, skillName, speechOutput);   
                    }
                }               
            }
        } 
        else {
            //  
            speechOutput = 'I\'m not sure what issuer you were looking for. Please try again.';
            this.emit(':ask', speechOutput, skillName, speechOutput);   
        }
    }
};

var dataHandlers = {

   'GetTenor': function(callback){
       this.handler.state = states.DATAMODE.Tenor; //signals that the tenor is missing. this allows us to route the next response to the appropriate handler
       console.log(this.handler.state);
       callback();
    },

    'GetDataPoint': function(callback){
        this.handler.state = states.DATAMODE.DataPoint;
        console.log(this.handler.state);
        callback();
    }

};

//======== HELPER FUNCTIONS ==============

//check object contents
function getObjects(obj, key, val) {
    console.log('getobjects');
    var objects = [];
    for (var i in obj) {
        if (!obj.hasOwnProperty(i)) continue;
            if (typeof obj[i] == 'object') {
                objects = objects.concat(getObjects(obj[i], key, val));
            } 
            else if (i == key && obj[key] == val) {
                objects.push(obj);
            }
    }
    return objects;
}