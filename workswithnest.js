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

//Define activity zone
var activityZone = {
    id: '',
    name: activityZoneName
};

//Get the camera information
user.thng(cameraThngId).read().then(function (camera) {

    //Obatin the activity zone id for the zone we want to monitor
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
            }
        }
    });
});
