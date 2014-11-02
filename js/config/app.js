'use strict';

// Declare app level module which depends on filters, and services
angular.module('CbApp',
        ['ui.router', 'ngCookies', 'ngAnimate', 'ngResource', 'waitForAuth', 'routeSecurity','CbConfig' ]
    )

    .run(function (loginService, $rootScope, FBURL, AUTH_EVENTS, AuthService) {

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
    })
    .config(function ($stateProvider, $urlRouterProvider, $locationProvider, USER_ROLES) {

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
    });

