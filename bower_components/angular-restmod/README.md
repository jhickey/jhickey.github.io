Angular Restmod  [![Build Status](https://api.travis-ci.org/platanus/angular-restmod.png)](https://travis-ci.org/angular-platanus/restmod)
===============

## Overview

Rails inspired REST-API ORM for Angular

## Getting Started

**Optional** Use bower to retrieve package

```
bower install angular-restmod --save
```

Include angular module

```javascript
angular.module('plRestmod')
```

## Basic usage

A new model type can be created using the `$restmod.model` method, it is recommended to put each model on a separate factory. The first argument for `model` is the resource URL, if not given the resource is considered anonymous, more on this later.

```javascript
angular.module('MyModule').factory('Bike', function($restmod) {
	return $restmod.model('/bikes');
});
```

The generated model type provides basic CRUD operations to interact with the API:

To retrieve an object by ID use `$find`, the returned object will be filled with the response data when the server response is received.

```javascript
var bike = Bike.$find('ID');
```

To reload an object use `$fetch`. **WARNING:** This will overwrite modified properties.

```javascript
bike.$fetch();
```

To retrieve an object collection `$collection` or `$search` can be used.

```javascript
var bikes = Bike.$search({ keyword: 'enduro' });
// same as
var bikes = Bike.$collection({ keyword: 'enduro' }); // server request not yet sent
bikes.$refresh();
```

To reload a collection use `$refresh`. To append more results use `$fetch`.

```javascript
bikes.$refresh({ page: 1 }); // clear collection and load page 1
bikes.$fetch({ page: 2 }); // page 2 is appended to page 1, usefull for infinite scrolls...
bikes.$refresh({ page: 3 }); // collection is reset, page 3 is loaded on response
```

To update an object, just modify the properties and call `$save`.

```javascript
bike.brand = 'Trek';
bike.$save();
```

To create a new object use `$build` and then call `$save` to send a POST request to the server.

```javascript
var newBike = Bike.$build({ brand: 'Comencal' });
newBike.model = 'Meta';
newBike.$save(); // bike is persisted
```

Or use `$create`

```javascript
var newBike = Bike.$create({ brand: 'Comencal', model: 'Meta' });
```

If called on a collection, `$build` and `$create` will return a collection-bound object that will be added when saved successfully.

```javascript
var newBike = bikes.$create({ brand: 'Comencal', model: 'Meta' });
// after server returns 'bikes' will contain 'newBike'.
```

To show a non saved object on the bound collection use `$reveal`

```javascript
var newBike = bikes.$create({ brand: 'Comencal', model: 'Meta' }).$reveal();
// 'newBike' is inmediatelly available at 'bikes'
```

Finally, to destroy an object just call `$destroy`. Destroying an object bound to a collection will remove it from the collection.

```javascript
bike.$destroy();
```

All operations described above will set the `$promise` property. This property is a regular `$q` promise that is resolved when operation succeds or fail. It can be used directly or using the `$then` method.

```javascript
bike.$fetch().$then(function(_bike) {
	doSomething(_bike.brand);
});
// or
bike.$fetch().$promise.then(function(_bike) {
	doSomething(_bike.brand);
});
```

## Relations

Relations are defined in $restmod using the **definition object**. The `$restmod.model` method can take as argument an arbitrary number of definition objects, models and builder functions after the url (first argument), more on this later.


```javascript
var Bike = $restmod.model('api/bikes', {
	// This is the definition object
	parts: { hasMany: 'Part' },
	owner: { belongsTo: 'User' },
	createdAt: { serialize: 'Date' }
});
```

There are three types of relations:

#### HasMany

This is a hirearchical relation between a model instance and another model collection. The child collection url is bound to the parent url. The child collection is created **at the same time** as the parent, so it is available even is the parent is not resolved.

```javascript
var Part = $restmod.model('api/parts');
var Bike = $restmod.model('api/bikes', {
	parts: { hasMany: Part } // use 'Part' string if using factories.
});

var bike = Bike.$new(1); // no request are made to the server here.
var parts = bike.parts.$fetch(); // sends GET /api/bikes/1/parts
// later on, after parts is resolved.
parts[0].$fetch(); // updates part at index 0 context, this will GET /api/parts/X
```
Calling `$create` on the collection will POST to the collection nested url.

```javascript
var part = bike.parts.$create({ serialNo: 'XX123', category: 'wheels' }); // sends POST /api/bikes/1/parts
```

If the child collection model is anonymous (no url given to `model`) then all CRUD routes for the collection items are bound to the parent. The example above would behave like this:

```javascript
// So if parts were to be defined like
var Part = $restmod.model(null); // Anonymous model
// then
bike.parts[0].$fetch(); // sends GET /api/bikes/1/parts/X instead of /api/parts/X
```

#### HasOne

This is a hirearchical relation between a model instance and another model instance. The child instance url is bound to the parent url. The child instance is created **at the same time** as the parent, so its available even if the parent is not resolved.

```javascript
var Owner = $restmod.model('api/users');
var Bike = $restmod.model('api/bikes', {
	owner: { hasOne: User } // use 'User' string if using factories.
});

var owner = Bike.$build(1).owner.$fetch(); // will send GET /api/bikes/1/owner

// ... server answers with { "name": "Steve", "id": 20 } ...

alert(owner.name); // Echoes 'Steve'
owner.name = 'Stevie';
owner.$save(); // will send PUT /api/users/20 with { "name": "Stevie" }
```

If the child object model is anonymous (no url given to `model`) then all CRUD routes are bound to the parent (same as hasMany).

#### belongsTo

This is a reference relation between a model instance and another model instance. The child instance is not bound to the parent and is **generated after** server response to a parent's `$fetch` is received. A key is used by default to bind child to parent. The key property name can be optionally selected using the `key` attribute.

```javascript
var Owner = $restmod.model('api/users');
var Bike = $restmod.model('api/bikes', {
	owner: { belongsTo: User, key: 'userId' } // key would default to *ownerId*
});

var bike = Bike.$find(1); // sends GET to /api/bikes/1
// ... server answers with { "user_id": 20 } ...
alert(bike.owner.$pk); // echoes '20'
alert(bike.owner.name); // echoes 'undefined' since user information has not been fetched.
bike.owner.$fetch(); // sends GET to /api/users/20
// ... server answers with { "name": "Peat" } ...
alert(bike.owner.name); // echoes 'Peat'
```

This relation can be optionally defined as `inline`, this means that it is expected that the child object data comes inlined in the parent object server data. The inline property name can be optionally selected using the `source` attribute.

```javascript
var Owner = $restmod.model('api/users');
var Bike = $restmod.model('api/bikes', {
	owner: { belongsTo: User, inline: true, source: 'user' } // source would default to *owner*
});

var bike = Bike.$find(1);
// ... server answers with { "user": { "name": "Peat" } } ...
alert(bike.owner.name); // echoes 'Peat'
```

# Serialization: Encoding and Decoding

# Hooks and Callbacks

# Extending

# Plugins

TODO....

API Refrence: http://platanus.github.io/angular-restmod

Take a look at https://github.com/platanus/simple-restmod-demo for a VERY basic (and outdated) example.
