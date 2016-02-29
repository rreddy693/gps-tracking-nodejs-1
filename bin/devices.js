var devices = {};

exports.addDevice = function(deviceId) {
	if (devices[deviceId])
		return devices[deviceId];

	var device = {
		deviceId: deviceId
	};
	devices[deviceId] = device;
	return device;
};

exports.getDevice = function(deviceId) {
	return devices[deviceId];
};

exports.devices = devices;