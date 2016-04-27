/***
 * CONFIGURATION VARIABLES
 */
var userAPIKey = '';        //Your Application User API Key
var cameraThngId = '';      //Your Camera ID in EVRYTHNG
var activityZoneName = '';  //The activity zone name to monitor
var raspberryPiThngId = ''; //The raspberry pi ID in EVRYTHNG

/**
 * EVRYTHNG CONFIGURATION
 */
var EVT = require('evrythng-extended'); //Load EVRYTHNG library
var mqtt = require('evrythng-mqtt'); //Load MQTT support

//Set up environment if not production
EVT.setup({
    apiUrl: 'http://api-test.evrythng.net'
});
mqtt.setup({
    apiUrl: 'mqtts://mqtt-test.evrythng.net:8883/mqtt',
    reconnectPeriod: 1000,
    keepAlive: 50,
    clientIdPrefix: 'evtjs'
});

//Set up mqtt
EVT.use(mqtt);

//Load EVRYTHNG user with access to the Nest Devices
var user = new EVT.User(userAPIKey);

//Define activity zone helper object
var activityZone = {
    id: '',
    name: activityZoneName
};

/**
 * RASPBERRY PI CLOUD DEVICE CONFIGURATION
 */
var raspberryPi = null;
user.thng(raspberryPiThngId).read().then(function (thng) {
    raspberryPi = thng;
}

/**
 * RASPBERRY PI DEVICE CONFIGURATION
 */
var Gpio = require('onoff').Gpio;
var led = new Gpio(14, 'out');
var button = new Gpio(4, 'in', 'both');
var blinkInterval = null;

//Stop the blinking when the button is pressed
button.watch(function (err, value) {
    if (err) {
        throw err;
    }
    clearInterval(blinkInterval);       // Stop blinking
    led.writeSync(0);                   // Turn LED off.
    raspberryPi.property().update({     // Update device status in the cloud
        alarm: 'off'
    });
});

/**
 * Nest CAMERA CONFIGURATION
 */
//Get the camera information
user.thng(cameraThngId).read().then(function (camera) {

    //Obtain the activity zone id for the zone we want to monitor
    camera.properties.activity_zones.forEach(function (activity_zone) {
        if (activity_zone.name === activityZone.name) {
            activityZone.id = activity_zone.id;
            console.log('Zone Id fetched ' + activityZone.id);
        }
    });

    console.log('Subscribing to last_event in camera');
    camera.property('last_event').subscribe(function (update) {
        //Filter events with activity zones only
        if (update[0].value.activity_zone_ids) {
            //Filter events on the zone we want to monitor
            if (update[0].value.activity_zone_ids[0] == activityZone.id) {
                console.log('Event Detected in ' + activityZone.name);

                raspberryPi.property().update({     // Update device status in the cloud
                    alarm: 'on'
                });

                //start blinking the LED
                clearInterval(blinkInterval);
                blinkInterval = setInterval(function () {
                    led.writeSync(led.readSync() === 0 ? 1 : 0)
                }, 500);
            }
        }
    });
});


/**
 * EXIT
 */
function exit() {
    led.unexport();
    button.unexport();
    process.exit();
}

process.on('SIGINT', exit);