/***
 * CONFIGURATION VARIABLES
 * */
 var userAPIKey = '';        //Your Application User API Key
 var cameraThngId = '';      //Your Camera ID in EVRYTHNG
 var activityZoneName = '';  //The activity zone name to monitor
 var raspberryPiThngId = ''; //The raspberry pi ID in EVRYTHNG


/* EVRYTHNG CONFIGURATION */
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
/* END EVRYTHNG CONFIGURATION */

/* RASPBERRY PI CLOUD DEVICE CONFIGURATION */
var raspberryPi = null;
user.thng(raspberryPiThngId).read().then(function (thng) {
    raspberryPi = thng;
});

var alarmStatus = 'off';

var startAlarm = function () {
    console.log('Alarm status ON updated in the cloud');
    alarmStatus = 'on';
    raspberryPi.property().update({     // Update device status in the cloud
        alarm: alarmStatus
    });
};

var stopAlarm = function () {
    console.log('Alarm status OFF updated in the cloud');
    alarmStatus = 'off';
    raspberryPi.property().update({     // Update device status in the cloud
        alarm: alarmStatus
    });
};

/* RASPBERRY PI CONFIGURE KEYBOARD to stop alarm */
var keypress = require('keypress');

keypress(process.stdin);

process.stdin.on('keypress', function (ch, key) {
    if (key && key.name == 'space') {
        stopAlarm();
    }
    if (key && key.ctrl && key.name == 'c') {
        process.stdin.pause();
        process.exit();
    }
});

process.stdin.setRawMode(true);
process.stdin.resume();
/* END RASPBERRY PI CONFIGURE KEYBOARD to stop alarm */

/* Nest CAMERA CONFIGURATION */
var activityZone = {
    name: activityZoneName,
    id: null
};

//Get the camera information
var nestCamera = null;
user.thng(cameraThngId).read().then(function (thng) {
    console.log('Found Nest Camera!');

    nestCamera = thng;

    //Obtain the activity zone id for the zone we want to monitor
    nestCamera.properties.activity_zones.forEach(function (activity_zone) {
        if (activity_zone.name === activityZone.name) {
            activityZone.id = activity_zone.id;
        }
    });

    console.log('Subscribing to motion events in: ' + activityZone.name);

    //Subscribe to the motion events
    nestCamera.property('last_event').subscribe(function (update) {
        //Filter events with activity zones only
        if (update[0].value.activity_zone_ids) {
            //Filter events on the zone we want to monitor
            if (update[0].value.activity_zone_ids[0] == activityZone.id) {
                console.log('Event detected in ' + activityZone.name);
                startAlarm();
            }
        }
    });
});
/* END Nest CAMERA CONFIGURATION */

/* OPTIONAL: SERVE THE STATUS of the alarm and a SNAPSHOT FROM THE PI */
var express = require("express");
var app = express();

/* serves main page */
app.get("/", function (req, res) {
    res.send( '   <!DOCTYPE html>  '  +
        '   <html lang="en">  '  +
        '   <head>  '  +
        '   				<meta charset="utf-8">  '  +
        '   				<meta http-equiv="refresh" content="10">  '  +
        '   				<meta http-equiv="X-UA-Compatible" content="IE=edge">  '  +
        '   				<meta name="viewport" content="width=device-width, initial-scale=1">  '  +
        '   				<!-- The above 3 meta tags *must* come first in the head; any other head content must come *after* these tags -->  '  +
        '   				<title>Bootstrap 101 Template</title>  '  +
        '     '  +
        '   				<!-- Latest compiled and minified CSS -->  '  +
        '   				<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css" integrity="sha384-1q8mTJOASx8j1Au+a5WDVnPi2lkFfwwEAa8hDDdjZlpLegxhjVME1fgjWPGmkzs7" crossorigin="anonymous">  '  +
        '     '  +
        '   				<!-- Optional theme -->  '  +
        '   				<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap-theme.min.css" integrity="sha384-fLW2N01lMqjakBkx3l/M9EahuwpSfeNvV63J5ezn3uZzapT0u7EYsXMjQV+0En5r" crossorigin="anonymous">  '  +
        '     '  +
        '     '  +
        '   				<!-- HTML5 shim and Respond.js for IE8 support of HTML5 elements and media queries -->  '  +

        '   				<!--[if lt IE 9]>  '  +
        '   				<script src="https://oss.maxcdn.com/html5shiv/3.7.2/html5shiv.min.js"></script>  '  +
        '   				<script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>  '  +
        '   				<![endif]-->  '  +
        '   </head>  '  +
        '   <body>  '  +
        '   <p> Raspeberry pi alarm status:' + alarmStatus + ' </p>  '  +
        '   <img src="'+ nestCamera.properties.snapshot_url +'" class="img-rounded" alt="Snapshot" width="640" height="480">  '  +
        '     '  +
    '   <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script>  '  +
    '   <!-- Latest compiled and minified JavaScript -->  '  +
    '   <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js" integrity="sha384-0mSbJDEHialfmuBBQP6A4Qrprq5OVfW37PRR3j5ELqxss1yVqOtnepnHVP9aJ7xS" crossorigin="anonymous"></script>  '  +
    '     '  +
    '   </body>  '  +
    '  </html>  ');
});

var port = process.env.PORT || 5000;
app.listen(port, function () {
    console.log("Listening on " + port);
});

/**
 * EXIT and release resources
 */
function exit() {
    process.exit();
}

process.on('SIGINT', exit);