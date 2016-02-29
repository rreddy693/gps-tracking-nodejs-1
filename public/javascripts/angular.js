angular.module('app',[])
	.config(function($sceProvider){
		$sceProvider.enabled(false);
	})
	.controller('main', ['$scope','$http', function($scope, $http){
		$http.get('http://ec2.mrostudios.com:3000/devices')
			.then(function(response){
				$scope.devices = response.data;
			});

		$scope.getMapLink = function(device){
			return "https://www.google.com/maps/embed/v1/place?\
						key=AIzaSyBJwFspRfvFCumitTo7RD-2yrjjMUyV4eg\
						&q="+(device.lastLocation.lat/60)+","+(device.lastLocation.lon/60)+"\
						&zoom=18";
		};
	}]);
