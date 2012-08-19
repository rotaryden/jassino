![Alt text](https://github.com/altitudebreath/jassino/raw/master/site/logo.png)

## What is it?

Light, fast, small and well unit-tested OOP in Javascript.

Why yet another one? Because of specific syntax sugar, to make things just handy.

## Features

* Backed by native Javascript prototypes, definitions processing at declaration-time, almost no instantiation-time overhead
* Single inheritance from base class
* Simple and handy Traits with multiple inheritance
* Compact shortcuts for a constructor
* Getters/setters generation for pseudo-properties
* Any level of inheritance allowed (up to your stack size :), calls to super class constructor/methods work well
* Compatible with usual prototype-bases pseudo classes - you may inherit Jassino class from mere function
* "instance constants" in classes and traits
* cross-browser, no dependencies
* less then 4Kb minified !

## Compatibility
* All browsers except Internet Explorer cross-frame
* Google Apps Script

## CHANGELOG

* v0.4 - breaking changes, shortcut constructors ['par1', 'par2', ...] -> 
         'par1, par2,...', for super constructor [['a', 'b',...]['c', 'd',...]] - > ['a, b, ...', 'c, d,...']
* v0.3 - first stable version

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
        field: "dreams about",  //"instance constant" - added to every instance, may be overridden in constructor
        
        old_method: function(){ return "Okay, "}, //overriding
        
        _:function(name, dream){
            this.Dreamer(name, dream)
            this.field = this.field.toUpperCase() //control flow should be reached and field created
        },
        test: function(){ return this.m__Dreamer("old_method") + 
                                 this.old_method() +
                                 this.name + " " + this.field + " " + this.dream}

    })

    var nm = new custom_ns.Nightmarer("Lissa", "Pie")
    
    strictEqual(nm.test(), "Hey!, Okay, Lissa DREAMS ABOUT Pie", "test to not go into infinite recursion!")
 })
 ```
 
## Installation
 
### Browser
Just include _jassino.min.js_ into your javascript bundle/project.
  
### Google Apps Script
Install as library, docs [here](https://developers.google.com/apps-script/guide_libraries)

Remember that you will have to specify your library name, when using in script
like Mylib.Jassino.Class, I'd recommend to make a shortcut

Also in GAS you will not be able to use Jassino.use_global_scope() with global object
and default namespace (Jassino.NS) if Jassino library have no write permissions

## Build
You may rebuild it from source running ./build_min.sh, provided you have nodejs installed.