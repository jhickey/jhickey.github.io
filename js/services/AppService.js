angular.module("CbApp")
    .factory('AppService', function ($resource, API_URL) {
        return $resource(API_URL + '/app', {})
    });