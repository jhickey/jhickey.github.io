/* Controllers */

angular.module('CbApp')
    .controller('HomeCtrl', function ($scope, syncData, AppService) {
        syncData('syncedValue').$bind($scope, 'syncedValue');
    })


    .controller('ChatCtrl', ['$scope', 'syncData', function ($scope, syncData) {
        $scope.newMessage = null;

        // constrain number of messages by limit into syncData
        // add the array into $scope.messages
        $scope.messages = syncData('messages', 10);

        // add new messages to the list
        $scope.addMessage = function () {
            if ($scope.newMessage) {
                $scope.messages.$add({text: $scope.newMessage});
                $scope.newMessage = null;
            }
        };
    }])

    .controller('RegisterCtrl', function ($scope, AuthService, $location) {
        $scope.email = null;
        $scope.pass = null;

        $scope.showSignup = true;

        $scope.register = function () {
            $scope.err = null;

            if (assertValidLoginAttempt()) {
                AuthService.register($scope.credentials).then( function (data) {
                    console.log(data);
                    $scope.showSignup = false;
                    $scope.credentials = {};
                },function(err){
                    $scope.err = err;
                });
            }
        };

        function assertValidLoginAttempt() {
            if (!$scope.credentials.username) {
                $scope.err = 'Please enter a username';
            }
            if (!$scope.credentials.email) {
                $scope.err = 'Please enter an email address';
            }
            else if (!$scope.credentials.password) {
                $scope.err = 'Please enter a password';
            }

            return !$scope.err;
        }
    })

    .controller('AccountCtrl', ['$scope', 'loginService', 'syncData', '$location', function ($scope, loginService, syncData, $location) {
        syncData(['users', $scope.auth.user.uid]).$bind($scope, 'user');

        $scope.logout = function () {
            loginService.logout();
        };

        $scope.oldpass = null;
        $scope.newpass = null;
        $scope.confirm = null;

        $scope.reset = function () {
            $scope.err = null;
            $scope.msg = null;
        };

        $scope.updatePassword = function () {
            $scope.reset();
            loginService.changePassword(buildPwdParms());
        };

        function buildPwdParms() {
            return {
                email: $scope.auth.user.email,
                oldpass: $scope.oldpass,
                newpass: $scope.newpass,
                confirm: $scope.confirm,
                callback: function (err) {
                    if (err) {
                        $scope.err = err;
                    }
                    else {
                        $scope.oldpass = null;
                        $scope.newpass = null;
                        $scope.confirm = null;
                        $scope.msg = 'Password updated!';
                    }
                }
            }
        }

    }]);
