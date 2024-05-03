const mqtt = require('mqtt');

function mqttConnection(options) {
    return mqtt.connect(options);
}

//on 'connect'
function onConnect(client, sensor){
    console.log('Connected to MQTT broker');
    sensor.connected = true;
    sensor.save();
    return client;
}

//on 'subscribe'
function onSubscribe(client, topic) {
    return new Promise((resolve, reject) => {
        client.subscribe(topic, (err) => {
            if (err) {
                console.error('Error subscribing to topic:', err);
                reject(err);
            } else {
                console.log('Subscribed to topic:', topic);
                resolve();
            }
        });
    });
}
//on 'message'
function onMessage(client, websocket, userId){
    client.on('message', (receivedTopic, message) => {
        console.log('Received message:', JSON.parse(message.toString()));
        websocket.sendData(userId, JSON.parse(message.toString()));
    });
}

module.exports = {
    mqttConnection,
    onConnect,
    onSubscribe,
    onMessage,
};