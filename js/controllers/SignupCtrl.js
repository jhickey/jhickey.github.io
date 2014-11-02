angular.module('CbApp')
    .controller('SignupCtrl', function ($scope, $cookieStore, RestService, ENDPOINTS) {

        $scope.showSignup = true;
        if ($cookieStore.get('signedup')){
            $scope.showSignup = false;
        }

        $scope.register = function () {
            $scope.err = null;

            if (assertValidLoginAttempt()) {
                $cookieStore.put('signedup', true);
                RestService.request(ENDPOINTS.signup, $scope.signupdata, 'POST').then( function (data) {
                    console.log(data);
                    $scope.showSignup = false;
                    $scope.signupdata = {};
                },function(err){
                    $scope.err = err;
                });
            }
        };

        function assertValidLoginAttempt() {
            if (!$scope.signupdata.email) {
                $scope.err = 'Please enter an email address';
            }
            return !$scope.err;
        }
    });