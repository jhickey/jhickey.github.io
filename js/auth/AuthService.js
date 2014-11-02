angular
    .module('CbApp')
    .factory('AuthService', AuthService);

function AuthService ($http, $rootScope, $q, Session, AUTH_URL, AUTH_EVENTS) {
    var authService = {};

    authService.register = function(data){
        var deferred = $q.defer();
        $http.post(AUTH_URL + "/local/register", data).success(function(res){
           deferred.resolve(res);
        }).error(function(data){
            deferred.reject(data.message);
        return deferred.promise;
        });
    };

    authService.login = function (credentials) {

        return $http
            .post(AUTH_URL + '/local/connect', credentials)
            .then(function (res) {
                $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
                //mock data
                res = {
                    id: 1,
                    user:{
                        id: 1,
                        role: 'admin'
                    }
                };
                //*******
                Session.create(res.id, res.user.id, res.user.role);
                return res.user;
            });
    };

    authService.isAuthenticated = function () {
        return !!Session.userId;
    };

    authService.isAuthorized = function (authorizedRoles) {
        if (!angular.isArray(authorizedRoles)) {
            authorizedRoles = [authorizedRoles];
        }
        return (authService.isAuthenticated() &&
            authorizedRoles.indexOf(Session.userRole) !== -1);
    };

    return authService;
 }