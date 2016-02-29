var MAX_LOCATION_LENGTH = 10;
var devices = {};

function Device(deviceId){
	var self = this;
	self.deviceId = deviceId;
	self.locations = [];
	self.status = {};

	self.addLocation = function(locationData){
		//check if location is valid
		if(locationData.lon == 0 && locationData.lat == 0)
			return;
		
		if(self.locations.length >= MAX_LOCATION_LENGTH){
			self.locations.splice(0, 1);
		}
		
		self.locations.push(locationData);
	};
}

exports.addDevice = function(deviceId) {
	if (devices[deviceId])
		return devices[deviceId];

	var device = new Device(deviceId);
	devices[deviceId] = device;
	return device;
};

exports.getDevice = function(deviceId) {
	return devices[deviceId];
};

exports.devices = devices;