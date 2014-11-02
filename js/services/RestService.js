angular.module("CbApp")
    .factory('RestService', function ($resource, API_URL) {
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
    });