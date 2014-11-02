angular.module('CbApp').directive('cbNavbar', cbNavbar);

function cbNavbar(AUTH_EVENTS, AuthService) {
    return {
        restrict: 'EA',
        templateUrl: '../partials/navbar.html',
        link: function (scope) {
            scope.$on(AUTH_EVENTS.loginSuccess, function(){
                scope.isAuthenticated = true;
            });
        },
        scope: {}
    };
}
