# Jassino ![Alt text](http://bost.ocks.org/mike/uberdata.png)
Very light, fast and well unit-tested object orientation in Javascript

Gives the nearly prototype-native performance on instantiation.

## Features

* Classes converted to native Javascript prototypes without dynamic overhead, only declaration time is facilitating but instantiation is fast
* Compatible with prototype-bases pseudo classes - you may inherit Jassino class from native one
* Very simple and handy Traits implementation
* Single inheritance from base class
* Multiple inheritance from __Traits__
* Calls to __super class constructor__ and members is done properly in multi-level inheritance, no dead loops :)
* Any level of inheritance allowed (up to your stack size :), tested up to 2000 ancestors
* will work on oldest browsers, no dependencies
* less then 2Kb minified !

[Detailed capabilities of the library may be seen from unit-test examples](https://github.com/altitudebreath/jassino/blob/master/test/test.js)  

## At a glance
```javascript
 test("Fine super handling", 1, function() {
    var N = jassino.NS
    
    Class('Person', {
        old_method: function(){ return "Hey!, "},
        _: function(name){this.name=name}  //constructor
    })

    Class('Dreamer', N.Person, {
        _:function(name, dream){    //constructor
                this.Person(name)
                this.dream = dream
        }
    })

    var custom_ns = {}
    Class(custom_ns, 'Nightmarer', N.Dreamer, {
        field: "dreams about",  //another way to specify instance members 
        
        old_method: function(){ return "Okay, "}, //overriding
        
        _:function(name, dream){
            this.Dreamer(name, dream)
            this.field = this.field.toUpperCase() //control flow should be reached and field created
        },
        test: function(){ return this.Dreamer$.old_method() + 
                                 this.old_method() +
                                 this.name + " " + this.field + " " + this.dream}

    })

    var nm = new custom_ns.Nightmarer("Lissa", "Pie")
    
    ste(nm.test(), "Hey!, Okay, Lissa DREAMS ABOUT Pie", "test to not go into infinite recursion!")
 })
 ```