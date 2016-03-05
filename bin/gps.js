var devices = require('./devices');
var net = require('net');
var crc = require('crc-itu');


function checkCRC(crcData, errorCheck) {
	var calculatedErrorCheck = getCRC(crcData);
	if (errorCheck[0] != calculatedErrorCheck[0] || errorCheck[1] != calculatedErrorCheck[1]) throw 'error check failed';
}

function checkStopBit(stopBit) {
	if (stopBit[0] != 0x0D || stopBit[1] != 0x0A) throw 'not GT06 protocol, wrong stopBit';
}

function getCRC(crcData) {
    var crcString = crc.crc16(crcData).toString(16);
    if(crcString.length % 2 != 0) crcString = '0' + crcString;
    if(crcString.length == 2) crcString = '00' + crcString;
	return new Buffer(crcString, 'hex');
}

function loginMessage(data) {
	var i = 0;
	var terminalId = new Buffer(data.slice(i, i + 8));

    return {
        terminalId: terminalId.toString('hex')
    };	
}

function getResponse(dataType, serialNumber) {
	var start = new Buffer([0x78, 0x78]);
	var data = new Buffer([0x05, dataType, serialNumber[0], serialNumber[1]]);
	var errorCheck = getCRC(data);
	var end = new Buffer([0x0d, 0x0a]);

	var response = Buffer.concat([start, data, errorCheck, end]);    

    return response;
}

function locationData(data) {
	var i = 0;
	var dateTime = new Buffer(data.slice(i, i + 6));
	i += 6;
	var gpsInfoSat = new Buffer(data.slice(i, i + 1));
	i += 1;
	var lat = new Buffer(data.slice(i, i + 4));
	i += 4;
	var lon = new Buffer(data.slice(i, i + 4));
	i += 4;
	var speed = new Buffer(data.slice(i, i + 1));
	i++;
	var course = new Buffer(data.slice(i, i + 2));
	i += 2;
	i += 8; //skip LBS information
	// var serialNumber = new Buffer(data.slice(i, i + 2));

    var time = new Date(Date.UTC(dateTime[0] + 2000, dateTime[1] - 1, dateTime[2], dateTime[3], dateTime[4], dateTime[5]));
    var lengthOfGPSInformation = (gpsInfoSat[0] & 0xf0) >> 4;
    var gpsSatellites = gpsInfoSat[0] & 0x0f;
    lat = ((lat[0] << 24) | (lat[1] << 16) | (lat[2] << 8) | lat[3]) / 30000.0;
    lat /= 60;
    lon = ((lon[0] << 24) | (lon[1] << 16) | (lon[2] << 8) | lon[3]) / 30000.0;
    lon /= 60;
    var speed = speed;


    console.log('time: ' + time.toString());
    console.log('gps sattelites: ' + gpsSatellites);

    console.log('latitude: ' + lat);
    console.log('longitude: ' + lon);

    console.log('speed: ' + speed[0]);

    return {
        time: time,
        gpsSatellites: gpsSatellites,
        lat: lat,
        lon: lon,
        speed: speed[0]
    };
}

function getStatusInformation(data){
    var i = 0;
    var terminalInformationContent = data.slice(i, ++i);
    var voltageLevel = data.slice(i, ++i);
    var gsmSignalStrength = data.slice(i, ++i);
    var alarmData = new Buffer(data.slice(i, i + 2));

    var oilConnected = !((terminalInformationContent[0] & 0x80) == 0x80);
    var gpsTrackingOn = (terminalInformationContent[0] & 0x40) == 0x40;
    var status = 'normal';
    if((terminalInformationContent[0] & 0x20) == 0x20) status = 'SOS';
    if((terminalInformationContent[0] & 0x18) == 0x18) status = 'Low battery alarm';
    if((terminalInformationContent[0] & 0x10) == 0x10) status = 'Power cut alarm';
    if((terminalInformationContent[0] & 0x08) == 0x08) status = 'Shock alarm';
    var chargeOn = (terminalInformationContent[0] & 0x04) == 0x04;
    var accHigh = (terminalInformationContent[0] & 0x02) == 0x02;
    var activated = (terminalInformationContent[0] & 0x01) == 0x01;

    var alarm = '';
    if((alarmData[0] & 0x10) == 0x10) alarm = 'SOS';
    if((alarmData[0] & 0x20) == 0x20) alarm = 'Power cut alarm';
    if((alarmData[0] & 0x30) == 0x30) alarm = 'Shock alarm';
    if((alarmData[0] & 0x40) == 0x40) alarm = 'Fence in alarm';
    if((alarmData[0] & 0x50) == 0x50) alarm = 'Fence out alarm';
    var alarmLanguage = '';
    if((alarmData[1] & 0x02) == 0x02) alarmLanguage = 'chinese';
    if((alarmData[1] & 0x02) == 0x02) alarmLanguage = 'english';


    console.log('oilConnected: ' + oilConnected);
    console.log('gpsTrackingOn: ' + gpsTrackingOn);
    console.log('status: ' + status);
    console.log('chargeOn: ' + chargeOn);
    console.log('accHigh: ' + accHigh);
    console.log('activated: ' + activated);
    console.log('voltageLevel(0-6): ' + voltageLevel[0]);
    console.log('gsmSignalStrength(0-4): ' + gsmSignalStrength[0]);
    console.log('alarm: ' + alarm);
    console.log('alarmLanguage: ' + alarmLanguage);

    return {
        oilConnected: oilConnected,
        gpsTrackingOn: gpsTrackingOn,
        status: status,
        chargeOn: chargeOn,
        accHigh: accHigh,
        activated: activated        
    };
}

function alarmPacket(data){
    var locationMsg = locationData(data.slice(0, 27));
    var i = 27;
    var statusMsg = getStatusInformation(data.slice(i, i + 5));

    return {
        location: locationMsg,
        status: statusMsg
    };
}

function pingPacket(data){
    return getStatusInformation(data.slice(0, 5));    
}

function sendCommand(command){
    var commandData = new Buffer(command, 'ascii');
    var packetLength = 5 + commandData.length + 4;

    var header = new Buffer([0x78, 0x78]);
    var serialNumber = new Buffer([0xbe, 0xef]);
    var data = Buffer.concat([new Buffer(packetLength, 0x80, commandData.length + 4, 0x00, 0x01, 0x02, 0x03]), commandData, new Buffer([0x00, 0x02]), serialNumber]);
    var errorCheck = getCRC(data);
    var end = new Buffer([0x0d, 0x0a]);

    var command = Buffer.concat([header, data, errorCheck, end]);
}

function gateway(socket, data) {
	if (data[0] != 0x78 || data[1] != 0x78) throw 'not GT06 protocol, wrong startBit';
	var packetDataLength = data[2] - 1 - 2 - 2; //leave out dataType and errorCheck and serialNumber

	var dataType = data[3];

	var i = 4 + packetDataLength;
	var packetData = data.slice(4, i);
    var messageSerialNumber = new Buffer(data.slice(i, i + 2));
    i += 2;
	var errorCheck = new Buffer(data.slice(i, i + 2));
	i += 2;
	var stopBit = new Buffer(data.slice(i, i + 2));
	checkStopBit(stopBit);
	checkCRC(data.slice(2, packetDataLength + 6), errorCheck);

    if(dataType != 0x01 && !socket.device){
        console.log('device not authenticated');
        return;
    }

	switch (dataType) {
		case 0x01:
            console.log('------------login packet------------');
            console.log('device authenticated');
            var loginMsg = loginMessage(packetData);
            socket.device = devices.addDevice(loginMsg.terminalId);

			socket.write(getResponse(dataType, messageSerialNumber));
			return;
		case 0x12:
            console.log('------------location ping------------');
			socket.device.addLocation(locationData(packetData));
            return;
        case 0x13:
            console.log('------------heart beat------------');
            socket.device.status = pingPacket(packetData);
            socket.write(getResponse(dataType, messageSerialNumber));
			return;
        case 0x16:
            console.log('------------status packet------------');
            var statusMsg = alarmPacket(packetData);
            socket.device.addLocation(statusMsg.location);            
            socket.device.status = statusMsg.status;

            socket.write(getResponse(dataType, messageSerialNumber));
            return;
	}

	console.log('packet type not implemented: ' + dataType);
}

exports.startServer = function(port){
    console.log('GPS server started at ' + port);

    var server = net.createServer(function(socket) {
        socket.setEncoding('hex');        

        socket.on('data', function(data) {
            console.log(data);        
            try{
                gateway(socket, new Buffer(data, 'hex'));
            }catch(e){
                console.log(e);
                socket.destroy();                
            }
        });
    });
    
    server.listen(port);
};

exports.gateway = gateway;
