angular.module('app',[])
	.run(function($rootScope){
		$rootScope._ = _;
	})
	.config(function($sceProvider){
		$sceProvider.enabled(false);
	})
	.controller('main', ['$scope','$http', function($scope, $http){
		$http.get('http://ec2.mrostudios.com:3000/devices')
			.then(function(response){
				$scope.devices = response.data;
				for(d in $scope.devices){
					$scope.devices[d].locations.forEach(function(l){
						l.lat /= 60;
						l.lon /= 60;
					});
				}
			});

		$scope.getIFrameLink = function(location){
			return "https://www.google.com/maps/embed/v1/place?\
						key=AIzaSyBJwFspRfvFCumitTo7RD-2yrjjMUyV4eg\
						&q="+location.lat+","+location.lon+"\
						&zoom=18";
		};

		$scope.getMapLink = function(location){
			return "https://maps.google.com/maps/place/\
						"+location.lat+" "+location.lon+"\
						/@"+location.lat+","+location.lon+",18z";
						
		};
	}]);
