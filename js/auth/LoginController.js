angular.module('CbApp')
    .controller('LoginController', LoginController);

function LoginController($scope, $location, AuthService){

    $scope.login = function (credentials) {
        $scope.err = null;
        if (!credentials.username) {
            $scope.err = 'Please enter an email address';
        }
        else if (!credentials.password) {
            $scope.err = 'Please enter a password';
        }
        else {
            AuthService.login(credentials).then(function(data){
                $location.path('/account');
            });
        }
    }
}