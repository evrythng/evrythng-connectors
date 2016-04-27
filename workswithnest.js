//ADD YOUR VALUES HERE
var userAPIKey = '';
var cameraThngId = '';
var activityZoneName = '';

//Load evrythng library for mqtt
var EVT = require('evrythng-extended'),
    mqtt = require('evrythng-mqtt');

//Set up environment
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

//Create EVRYTHNG user
var user = new EVT.User(userAPIKey);

//Define activity zone object
var activityZone = {
    id: '',
    name: activityZoneName
};

//Configure alarm LED and button
var Gpio = require('onoff').Gpio;
var led = new Gpio(14, 'out');
var button = new Gpio(4, 'in', 'both');
var iv = null; //Blinking interval

//Stop the blinking when the button is pressed
button.watch(function (err, value) {
  console.log('Button clicked');
  if (err) {
    throw err;
  }
  clearInterval(iv); // Stop blinking
  led.writeSync(0);  // Turn LED off.
});

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
        if (update[0].value.activity_zone_ids)
        {
            //Filter events on the zone we want to monitor
            if( update[0].value.activity_zone_ids[0] == activityZone.id)
            {
                console.log('Event Detected in ' + activityZone.name);
		
		//start blinking the LED
		clearInterval(iv);
		iv = setInterval(function(){
			led.writeSync(led.readSync() === 0 ? 1 : 0)
		}, 500);
            }
        }
    });
});

function exit() {
  led.unexport();
  button.unexport();
  process.exit();
}

process.on('SIGINT', exit);