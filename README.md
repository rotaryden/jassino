![Alt text](https://github.com/altitudebreath/jassino/raw/master/site/logo.png)

## What is it?

Light, fast, small and well unit-tested OOP in Javascript.

Why yet another one? Because of specific syntax sugar, to make things just handy.

## Features

* Classes converted to native Javascript prototypes without dynamic overhead, only declaration time is facilitating but instantiation is fast
* Very simple and handy Traits implementation
* Single inheritance from base class
* Compact shortcuts for automatic constructor call 
* Multiple inheritance from __Traits__
* Calls to __super class constructor__ and members is done properly in multi-level inheritance, no dead loops :)
* Any level of inheritance allowed (up to your stack size :), tested up to 2000 ancestors
* Compatible with prototype-bases pseudo classes - you may inherit Jassino class from native one
* will work on oldest browsers, no dependencies
* less then 3Kb minified !

[Detailed capabilities of the library may be seen from unit-test examples](https://github.com/altitudebreath/jassino/blob/master/test/test.js)  

## At a glance
```javascript
test("Fine super handling", 1, function() {
    var N = Jassino.NS
    
    Class('Person', {
        old_method: function(){ return "Hey!, "},
        _: function(name){this.name=name}  //constructor
    })

    Class('Dreamer', N.Person, {
        _:[['name'], ['dream']]  //constructor shortcut: name -> super call, dream -> this.dream
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
    
    strictEqual(nm.test(), "Hey!, Okay, Lissa DREAMS ABOUT Pie", "test to not go into infinite recursion!")
 })
 ```
 
## Installation
 
Just include _jassino.min.js_ into your javascript bundle/project.
  
You may rebuild it from source running ./build_min.sh, provided you have nodejs installed.