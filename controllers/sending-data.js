const Sensor = require('../models/sensor');
const websocket = require('../handlers/WebSocket');
const {
    mqttConnection,
    onConnect,
    onSubscribe,
    onMessage,
} = require('../handlers/MQTT');

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
            password: 'Yousef123',
            reconnectPeriod: 5000,
            keepalive: 60
        };


        const client = mqttConnection(options);

        client.on('connect', async () => {
            onConnect(client, sensor);
            await client.unsubscribe(topic);
            await onSubscribe(client, topic);
            onMessage(client, websocket, userId);
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

        // Reakcja na rozłączenie
        client.on('disconnect', () => {
            console.log('Disconnected from MQTT broker');
            handleConnectionChange();
        });

        // Reakcja na błąd
        client.on('error', (error) => {
            console.error('Error:', error);
            handleConnectionChange();
        });

        client.on('offline', () => {
            console.log('Mqtt client offline');
        });

        client.on('reconnect', () => {
            console.log('Reconnecting to MQTT broker');
            client.removeAllListeners('message');
        });

        const checkConnection = () => {
            if (client.connected) {
                console.log('MQTT client is connected');
            } else {
                console.log('MQTT client is not connected');
                handleConnectionChange();
            }
        };
        
        setInterval(checkConnection, 10000);

        autheventEmitter.on('userLogout', handleConnectionChange);


    
        res.redirect('/ws');

    } catch (err) {
        console.error('Error:', err);
        const error = new Error(err.message || 'Internal Server Error');
        error.httpStatusCode = err.status || 500;
        return next(error);
    }
};
