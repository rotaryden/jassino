![Alt text](https://rawgit.com/altitudebreath/jassino/raw/master/site/logo.png)

Light, fast, small and well tested OOP in Javascript.

## Features

* Backed by native Javascript prototypes, 
* Most of definitions are processed at class-creation-time, 
* Light wrappers around some constructors
* Single inheritance from base class
* Simple and handy Mixins
* Compact shortcuts for constructors
* Any level of inheritance allowed (up to your stack size :), calls to super class constructor/methods work well
* Compatible with usual prototype-bases pseudo classes - you may inherit Jassino class from mere function

## Compatibility
* Object.create() is used
* Google Apps Script

## At a glance
```javascript
    Jassino.setDefaultNS(window);

    //Namespace. It may contain members as well
    var Bees = {};
    
    //---------------------------------------------------------------
    Mixin('Movable', {        
        total_distance: 0,
        location: {x:0, y:0},  //var members also possible in mixins, 
        move_to: function(loc){
            var t = this;
            t.total_distance = t.total_distance + Math.sqrt( Math.pow(loc.x - t.location.x, 2) 
                + Math.pow(loc.y - t.location.y, 2) );
            t.location = loc
        }
    });

    Mixin(Bees, 'Flyable', [Movable], {     //explicit namespace
        flight_hours: 0,
        fly_to: function(loc){ 
            this.move_to(loc);
            this.flight_hours = this.total_distance * 0.001 // hours per meter
        }
    });

    Mixin('Workable', {   
        work_on: function(place){return "Working on " + place.toString()}
    });

    //---------------------------------------------------------------
    Class('Bee', {             
        _: 'name, lifespan',
        cls: {
            WINGS: {
                oscillating: 1
            }
        }
    });

    Class(Bees, 'FemaleBee', Bee, {
        _: function(_sup, name){         //Explicit constructor
            _sup.call(this,'F');          //super constructor call
            this.name=name;
        }  //constructor
    });

    Class(Bees, 'MaleBee', Bee, [Bees.Flyable], {
        _: 'name, lifespan',
        __: 2
    });

    Class(Bees, 'Queen', Bees.FemaleBee, {               
        _: function(_sup, name){         //Full form of constructor
            _sup.call(this, 'F');          //super constructor call
            this.name=name;
            this.wingType = _sup.WINGS.oscillating;
        }  //constructor
    });
    
    Class(Bees, 'Worker', Bees.FemaleBee, [Workable, Bees.Flyable], {
        //Sort Constructor form, means: 
        // On declaration time, generate constructor accepting 2 parameters,
        // first parameter pass to super constructor
        // second parameter write to this.name 
        _: 'gender, name',
        __:1,
        get_productiveness: function(){ return this.productiveness }
    });
    //----------------------------------------------------------------------------------------------
    var Places = {};

    function Place(visitors_capacity){                //native prototype-based class         
        this.visitors_capacity = visitors_capacity
        this.visitors = []
    }
    Place.prototype.add_visitor = function(vis){
        if (this.visitors.length < this.visitors_capacity){
            this.visitors_capacity.push(vis);
            return true
        }else{
            return false
        }
    };
    Place.prototype.remove_visitor = function(vis){
        if (this.visitors.length < this.visitors_capacity){
            this.visitors_capacity.push(vis);
            return true
        }else{
            return false
        }
    };

    Class(Places, 'Plant', Place, {
        $: 'Place'  //inheriting from native pseudo class requires its explicit name
    });

    Class(Places, 'Flower', Places.Plant, {
        nectar: 5,
        full_amount: 5,
        restore_point: -5,
        get_nectar: function(){ 
            var t = this;
            if (t.nectar < t.restore_point){
                t.nectar = t.full_amount
            }
            this.nectar > 0 ? (this.nectar--, 1) : 0 }
    });


    Class(Places, 'Weed', Places.Plant, {
        nectar: 0,
        get_nectar: function(){ this.nectar ? (this.nectar--, 1) : 0 }
    });

    //----------------------------------------------------------------------------------------------
    Class('BeeKeeper', [Workable], {
        
    });

    //---------------------------------------------------------------

    Class(Places, 'Hive', Place, [Movable], {
        //Constructor shortcut (SuperClass-less form)
        //means: take first argument from constructor and place it into this.bees
        _: 'visitors_capacity, bees',
        __: 1,

        get_most_productive: function(){
            if ( ! this.bees) return null;s
            var most = bees[0];
            for (var bee in this.bees){
                if (bee.get_productiveness() > most.get_productiveness())
                    most = bee;
            }
            return most
        }
    });

    //***************************************************************************
    var hive = new Places.Hive(20, //20 visitors max
                      [new Bees.Queen('')])
    //hive.get_most_productive().gather(place)
    
    var queen = new Bees.Queen('Victoria');
    
 ```
 
## Installation
 
### Browser
Include _jassino.min.js_ into your javascript bundle/project.
  
### Google Apps Script
Install as library, docs [here](https://developers.google.com/apps-script/guide_libraries)

## Documentation

TODO, for now see
[Detailed capabilities of the library may be seen from unit-test examples](https://github.com/altitudebreath/jassino/blob/master/test/test.js)  


## Build
./build.sh

## CHANGELOG

* 2.0.0 - class members syntax changed, 
- there are 2 hierachies: instances and class member objects
- constructor accepts now the class, not superclass,
- and more
* 1.0.0 WIP, many changes
* 0.10.2 - improvements in decorators, multiple decorators, 
cached decorator, more tests
* 0.10.0 - breaking changes for class members
* 0.9.0 - full rewrite - breaking changes
* v0.5.0 - breaking changes, shortcut constructor changes for super case:  
         'super_a, super_b, ... ## c, d,...',
         jassino is now compatible with CoffeeScript 'super' call for ancestor methods, and super constructor
         in case of explicit declaration of constructor in derived class
         Error reporting on parameters improved.
* v0.4 - breaking changes, shortcut constructors ['par1', 'par2', ...] -> 
         'par1, par2,...', for super constructor [['a', 'b',...]['c', 'd',...]] - > ['a, b, ...', 'c, d,...']
* v0.3 - first stable version

