const Sensor = require('../models/sensor');
const websocket = require('../handlers/WebSocket');
const mqtt = require('mqtt');
const autheventEmitter = require('./auth').getEventEmitter();

exports.getConnect = async (req, res, next) => {
    try {
        const senId = req.params.sensorId;
        const sensor = await Sensor.findById(senId);
        if (!sensor) {
            throw new Error('Sensor not found.');
        }
        if (sensor.userId.toString() !== req.user._id.toString()) {
            return res.status(403).send('Unauthorized');
        }

        const userId = sensor.userId.toString();
        const { addresIp, port, name } = sensor;
        const topic = name;

        const options = {
            host: addresIp,
            port: port,
            protocol: 'mqtts',
            //username: 'user1',
            username: 'Yousef',
            //password: 'qwerty123456',
            password: 'Yousef123'
        };

        const client = mqtt.connect(options);

        client.on('connect', async () => {
            console.log('Connected to MQTT broker');
            sensor.connected = true;
            await sensor.save();
            client.subscribe(topic, (err) => {
                if (err) {
                    console.error('Error subscribing to topic:', err);
                } else {
                    console.log('Subscribed to topic:', topic);
                }
            });
        }); 
        // Flaga śledząca czy zapis jest w trakcie
        let isSaving = false;

        // Funkcja obsługująca błąd i rozłączenie
        function handleConnectionChange() {
            if (!isSaving) {
                isSaving = true;
                sensor.connected = false;
                sensor.save()
                    .then(() => {
                        isSaving = false;
                        client.end();
                    })
                    .catch((saveError) => {
                        isSaving = false;
                        console.error('Error while saving sensor:', saveError);
                        client.end();
                    });
            }
        }
        ['disconnect', 'error', 'close', 'reconnect'].forEach((event) => {
            client.on(event, handleConnectionChange);
        });

        client.on('message', (receivedTopic, message) => {
            console.log('Received message:', JSON.parse(message.toString()));
            websocket.sendData(userId, JSON.parse(message.toString()));
        });

        autheventEmitter.on('userLogout', handleConnectionChange);


    
        res.redirect('/ws');

    } catch (err) {
        console.error('Error:', err);
        const error = new Error(err.message || 'Internal Server Error');
        error.httpStatusCode = err.status || 500;
        return next(error);
    }
};