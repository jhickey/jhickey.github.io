(function() {'use strict';

// Declare app level module which depends on filters, and services
angular.module('CbApp',
        ['ui.router', 'ngCookies', 'ngAnimate', 'ngResource', 'waitForAuth', 'routeSecurity','CbConfig' ]
    )

    .run(["loginService", "$rootScope", "FBURL", "AUTH_EVENTS", "AuthService", function (loginService, $rootScope, FBURL, AUTH_EVENTS, AuthService) {

        $rootScope.$on('$stateChangeStart', function (event, next) {
            if(!next.data){
                return;
            }
            var authorizedRoles = next.data.authorizedRoles;
            if (!AuthService.isAuthorized(authorizedRoles)) {
                event.preventDefault();
                if (AuthService.isAuthenticated()) {
                    // user is not allowed
                    $rootScope.$broadcast(AUTH_EVENTS.notAuthorized);
                } else {
                    // user is not logged in
                    $rootScope.$broadcast(AUTH_EVENTS.notAuthenticated);
                }
            }
        });
    }])
    .config(["$stateProvider", "$urlRouterProvider", "$locationProvider", "USER_ROLES", function ($stateProvider, $urlRouterProvider, $locationProvider, USER_ROLES) {

        $urlRouterProvider.otherwise("/signup");
        //
        // Now set up the states
        $stateProvider
            .state('signup', {
                url: "/",
                controller: 'SignupCtrl',
                templateUrl: "../partials/signup.html"
            });
            //.state('home', {
            //    url: "/",
            //    controller: 'HomeCtrl',
            //    templateUrl: "../partials/home.html"
            //})
            //.state('login', {
            //    url: "/login",
            //    controller: 'LoginController',
            //    templateUrl: "../partials/login.html"
            //})
            //.state('register', {
            //    url: "/register",
            //    controller: 'RegisterCtrl',
            //    templateUrl: "../partials/register.html"
            //})
            //.state('account', {
            //    url: "/account",
            //    controller: 'AccountCtrl',
            //    templateUrl: "../partials/account.html",
            //    data: {
            //        authorizedRoles: [USER_ROLES.admin, USER_ROLES.dev, USER_ROLES.user]
            //    }
            //});

        $locationProvider.html5Mode(true);
    }]);


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
 AuthService.$inject = ["$http", "$rootScope", "$q", "Session", "AUTH_URL", "AUTH_EVENTS"];
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
LoginController.$inject = ["$scope", "$location", "AuthService"];
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
loginBox.$inject = ["AUTH_EVENTS"];

//TODO: Local storage?
angular
    .module('CbApp')
    .service('Session', function () {
        this.create = function (sessionId, userId, userRole) {
            this.id = sessionId;
            this.userId = userId;
            this.userRole = userRole;
        };
        this.destroy = function () {
            this.id = null;
            this.userId = null;
            this.userRole = null;
        };
        return this;
    })

angular.module('routeSecurity', [])
    .run( ["$injector", "$location", "$rootScope", "loginRedirectPath", function ($injector, $location, $rootScope, loginRedirectPath) {
        if ($injector.has('$route')) {
            new RouteSecurityManager($location, $rootScope, $injector.get('$route'), loginRedirectPath);
        }
    }]);

function RouteSecurityManager($location, $rootScope, $route, path) {
    this._route = $route;
    this._location = $location;
    this._rootScope = $rootScope;
    this._loginPath = path;
    this._redirectTo = null;
    this._authenticated = !!($rootScope.auth && $rootScope.auth.user);
    this._init();
}

RouteSecurityManager.prototype = {
    _init: function () {
        var self = this;
        this._checkCurrent();

        // Set up a handler for all future route changes, so we can check
        // if authentication is required.
        self._rootScope.$on("$routeChangeStart", function (e, next) {
            self._authRequiredRedirect(next, self._loginPath);
        });

        self._rootScope.$on('$firebaseSimpleLogin:login', angular.bind(this, this._login));
        self._rootScope.$on('$firebaseSimpleLogin:logout', angular.bind(this, this._logout));
        self._rootScope.$on('$firebaseSimpleLogin:error', angular.bind(this, this._error));
    },

    _checkCurrent: function () {
        // Check if the current page requires authentication.
        if (this._route.current) {
            this._authRequiredRedirect(this._route.current, this._loginPath);
        }
    },

    _login: function () {
        this._authenticated = true;
        if (this._redirectTo) {
            this._redirect(this._redirectTo);
            this._redirectTo = null;
        }
        else if (this._location.path() === this._loginPath) {
            this._location.replace();
            this._location.path('/');
        }
    },

    _logout: function () {
        this._authenticated = false;
        this._checkCurrent();
    },

    _error: function () {
        if (!this._rootScope.auth || !this._rootScope.auth.user) {
            this._authenticated = false;
        }
        this._checkCurrent();
    },

    _redirect: function (path) {
        this._location.replace();
        this._location.path(path);
    },

    // A function to check whether the current path requires authentication,
    // and if so, whether a redirect to a login page is needed.
    _authRequiredRedirect: function (route, path) {
        if (route.authRequired && !this._authenticated) {
            if (route.pathTo === undefined) {
                this._redirectTo = this._location.path();
            } else {
                this._redirectTo = route.pathTo === path ? "/" : route.pathTo;
            }
            this._redirect(path);
        }
        else if (this._authenticated && this._location.path() === this._loginPath) {
            this._redirect('/');
        }
    }
};


/**
 * This module monitors angularFire's authentication and performs actions based on authentication state.
 *
 * See usage examples here: https://gist.github.com/katowulf/7328023
 */
angular.module('waitForAuth', [])

/**
 * A service that returns a promise object, which is resolved once $firebaseSimpleLogin
 * is initialized (i.e. it returns login, logout, or error)
 */
   .service('waitForAuth', ["$rootScope", "$q", "$timeout", function($rootScope, $q, $timeout) {
      var def = $q.defer(), subs = [];
      subs.push($rootScope.$on('$firebaseSimpleLogin:login', fn));
      subs.push($rootScope.$on('$firebaseSimpleLogin:logout', fn));
      subs.push($rootScope.$on('$firebaseSimpleLogin:error', fn));
      function fn(err) {
         if( $rootScope.auth ) {
            $rootScope.auth.error = err instanceof Error? err.toString() : null;
         }
         for(var i=0; i < subs.length; i++) { subs[i](); }
         $timeout(function() {
            // force $scope.$apply to be re-run after login resolves
            def.resolve();
         });
      }
      return def.promise;
   }])

/**
 * A directive that hides the element from view until waitForAuth resolves
 */
   .directive('ngCloakAuth', ["waitForAuth", function(waitForAuth) {
      return {
         restrict: 'A',
         compile: function(el) {
            el.addClass('hide');
            waitForAuth.then(function() {
               el.removeClass('hide');
            });
         }
      };
   }])

/**
 * A directive that shows elements only when the given authentication state is in effect
 */
   .directive('ngShowAuth', ["$rootScope", function($rootScope) {
      var loginState;
      $rootScope.$on("$firebaseSimpleLogin:login",  function() { loginState = 'login' });
      $rootScope.$on("$firebaseSimpleLogin:logout", function() { loginState = 'logout' });
      $rootScope.$on("$firebaseSimpleLogin:error",  function() { loginState = 'error' });
      function inList(needle, list) {
         var res = false;
         angular.forEach(list, function(x) {
            if( x === needle ) {
               res = true;
               return true;
            }
            return false;
         });
         return res;
      }
      function assertValidState(state) {
         if( !state ) {
            throw new Error('ng-show-auth directive must be login, logout, or error (you may use a comma-separated list)');
         }
         var states = (state||'').split(',');
         angular.forEach(states, function(s) {
            if( !inList(s, ['login', 'logout', 'error']) ) {
               throw new Error('Invalid state "'+s+'" for ng-show-auth directive, must be one of login, logout, or error');
            }
         });
         return true;
      }
      return {
         restrict: 'A',
         compile: function(el, attr) {
            assertValidState(attr.ngShowAuth);
            var expState = (attr.ngShowAuth||'').split(',');
            function fn(newState) {
               loginState = newState;
               var hide = !inList(newState, expState);
               el.toggleClass('hide', hide );
            }
            fn(loginState);
            $rootScope.$on("$firebaseSimpleLogin:login",  function() { fn('login') });
            $rootScope.$on("$firebaseSimpleLogin:logout", function() { fn('logout') });
            $rootScope.$on("$firebaseSimpleLogin:error",  function() { fn('error') });
         }
      }
   }]);

angular.module('CbApp')

    .factory('loginService', ["$rootScope", "$timeout", function ($rootScope,  $timeout) {
        var auth = null;
        return {

            /**
             * @param {string} email
             * @param {string} pass
             * @param {Function} [callback]
             * @returns {*}
             */
            login: function (credentials, callback) {
                assertAuth();
                auth.$login('password', {
                    email: credentials.username,
                    password: credentials.password,
                    rememberMe: true
                }).then(function (user) {
                    if (callback) {
                        //todo-bug https://github.com/firebase/angularFire/issues/199
                        $timeout(function () {
                            callback(null, user);
                        });
                    }
                }, callback);
            },

            logout: function () {
                assertAuth();
                auth.$logout();
            },

            changePassword: function (opts) {
                assertAuth();
                var cb = opts.callback || function () {
                };
                if (!opts.oldpass || !opts.newpass) {
                    $timeout(function () {
                        cb('Please enter a password');
                    });
                }
                else if (opts.newpass !== opts.confirm) {
                    $timeout(function () {
                        cb('Passwords do not match');
                    });
                }
                else {
                    auth.$changePassword(opts.email, opts.oldpass, opts.newpass).then(function () {
                        cb && cb(null)
                    }, cb);
                }
            },

            createAccount: function (email, pass, callback) {
                assertAuth();
                auth.$createUser(email, pass).then(function (user) {
                    callback && callback(null, user)
                }, callback);
            }
        };

        function assertAuth() {
            if (auth === null) {
                throw new Error('Must call loginService.init() before using its methods');
            }
        }
    }]);

angular.module('CbApp')
    .controller('MainController', MainController);

function MainController($scope,USER_ROLES, AuthService){

}
MainController.$inject = ["$scope", "USER_ROLES", "AuthService"];
// Declare app level module which depends on filters, and services
angular.module('CbConfig', [])


   .constant("API_URL", "http://cocoded.herokuapp.com/api/v1")
   .constant("AUTH_URL", "http://cocoded.dev:1337/auth")
   // version of this seed app is compatible with angularFire 0.6
   // see tags for other versions: https://github.com/firebase/angularFire-seed/tags
   .constant('version', '0.6')

   // where to redirect users if they need to authenticate (see module.routeSecurity)
   .constant('loginRedirectPath', '/login')

   // your Firebase URL goes here
   .constant('FBURL', 'https://fiery-fire-533.firebaseio.com')

   //you can use this one to try out a demo of the seed
//   .constant('FBURL', 'https://angularfire-seed.firebaseio.com');
    .constant('ENDPOINTS'   , {
        signup: "/signup"
    })
    .constant('AUTH_EVENTS', {
        loginSuccess: 'auth-login-success',
        loginFailed: 'auth-login-failed',
        logoutSuccess: 'auth-logout-success',
        sessionTimeout: 'auth-session-timeout',
        notAuthenticated: 'auth-not-authenticated',
        notAuthorized: 'auth-not-authorized'
    })
    .constant('USER_ROLES', {
        all: '*',
        admin: 'admin',
        dev: 'dev',
        user: 'user'
    })

/*********************
 * !!FOR E2E TESTING!!
 *
 * Must enable email/password logins and manually create
 * the test user before the e2e tests will pass
 *
 * user: test@test.com
 * pass: test123
 */


/* Directives */


angular.module('CbApp').
  directive('appVersion', ['version', function(version) {
    return function(scope, elm, attrs) {
      elm.text(version);
    };
  }]);

angular.module('CbApp')
    .controller('SignupCtrl', ["$scope", "$cookieStore", "RestService", "ENDPOINTS", function ($scope, $cookieStore, RestService, ENDPOINTS) {

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
    }]);
/* Controllers */

angular.module('CbApp')
    .controller('HomeCtrl', ["$scope", "syncData", "AppService", function ($scope, syncData, AppService) {
        syncData('syncedValue').$bind($scope, 'syncedValue');
    }])


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

    .controller('RegisterCtrl', ["$scope", "AuthService", "$location", function ($scope, AuthService, $location) {
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
    }])

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

/* Filters */

angular.module('CbApp')
   .filter('interpolate', ['version', function(version) {
      return function(text) {
         return String(text).replace(/\%VERSION\%/mg, version);
      }
   }])

   .filter('reverse', function() {
      function toArray(list) {
         var k, out = [];
         if( list ) {
            if( angular.isArray(list) ) {
               out = list;
            }
            else if( typeof(list) === 'object' ) {
               for (k in list) {
                  if (list.hasOwnProperty(k)) { out.push(list[k]); }
               }
            }
         }
         return out;
      }
      return function(items) {
         return toArray(items).slice().reverse();
      };
   });

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
cbNavbar.$inject = ["AUTH_EVENTS", "AuthService"];

angular.module("CbApp")
    .factory('AppService', ["$resource", "API_URL", function ($resource, API_URL) {
        return $resource(API_URL + '/app', {})
    }]);
angular.module("CbApp")
    .factory('RestService', ["$resource", "API_URL", function ($resource, API_URL) {
        return {
            request: function (endPoint, data, method) {
                data = data || {};
                var resource = $resource(API_URL + endPoint, data, {
                    request: {
                        method: method || 'GET'
                    }
                });

                return resource.request().$promise;
            }
        }
    }]);



   /* Services */

   //angular.module('CbApp.services', ['CbApp.service.login', 'CbApp.service.firebase'])

      // put your services here!
      // .service('serviceName', ['dependency', function(dependency) {}]);


})();