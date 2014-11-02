angular.module('CbApp').directive('loginBox', loginBox)

function loginBox(AUTH_EVENTS) {
    return {
        restrict: 'A',
        template: '<div>Login!</div>',
        link: function (scope) {
            var showDialog = function () {
                scope.visible = true;
            };

            scope.visible = false;
            scope.$on(AUTH_EVENTS.notAuthenticated, showDialog);
            scope.$on(AUTH_EVENTS.sessionTimeout, showDialog)
        }
    };
}
