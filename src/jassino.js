/********************************************************************************************************************
 *******************                                   Jassino2                                 ***********************
 *******************      Very light, fast and well tested object orientation in Javascript    ***********************
 *********************************************************************************************************************
 *   version: 0.9.0
 *
 *   Copyright (c)  Denis Volokhovski, 2015
 *
 *   Inspired by My-class library from Jie Meng-Gerard: https://github.com/jiem/my-class
 */
"use strict";

var Jassino = (function (Jassino) {
    /*
     * Terminology:
     * class - constructor function F
     * instance/object (of class) - new F() in rough view
     * Super Class for F - constructor function G such that in rough F.prototype = new G()
     * super constructor - constructor function G used as functionS
     * body - definition body object provided for Class or Mixin
     * super object - Super class prototype
     */
    //---------------- Change these parameters to meet your own preferences / compatibility ----------------------------
    var
    //------------ body definitions
        _CONSTRUCTOR = '_',        //constructor function in body
        _SUPER_ARGS = '__',

        _CLASS_MEMBER_PREFIX = 'c_',
    //------------ variables available on the class
        _CLASS_NAME = '__name__',    //class name on the class itself
        _SUPER_CLASS = '__super__', //reference to SuperClass in class, compatible with CoffeeScript super call 

    //----------------- instance definitions
        _SUPER_METHOD_CALL = 'super', //super method call, e.g. this.supercall(_cls, "method_name", args,... )

    //----------------- meta data
        _VALID_INSTANCE_MARKER = "__jassino__";

    //--------------------------------------------------------------------------------------------------------------
    Jassino.DuplicationError = _make_exc("Duplication");
    Jassino.ArgumentsError = _make_exc("Arguments");
    Jassino.ConstructorError = _make_exc("Constructor");
    Jassino.InstantiationError = _make_exc("Instantiation");
    Jassino.MembersError = _make_exc("Members");

    Jassino.useGlobalScope = function (global_obj) {
        var g = global_obj || window;
        g.Class = Jassino.Class;
        g.Mixin = Jassino.Mixin;
        g.$$ = Jassino.$$;
        g.Jassino = Jassino;
    };
    
    Jassino.setDefaultNS = function(ns){
        return this.NS = ns;
    };


    var UNDEF = "undefined",

        T_FUN = "function",
        T_STR = "string";

    //==============================================================================================
    function dump(obj) {
        if (isObject(obj)) {
            var res = '';
            for (var p in obj) {
                res += p + '::' + dump(obj[p]) + '\n';
            }
            return res;
        } else return String(obj);
    }

    function trace(err) {
        console.log(err);
        var errInfo = "\n";
        for (var prop in err) {
            errInfo += prop + ": " + String(err[prop]) + "\n";
        }
        return errInfo;
    }
    
    function _make_exc(msg) {
        function Exc(data, message, prevExc) {
            this.message = 
                (msg ? (msg + ": ") : "\n") + 
                (message || "DATA:") + " ==> \n" + dump(data) + "\n" +
                (prevExc ? trace(prevExc) : "");
        }

        Exc.prototype = new Error();
        Exc.prototype.constructor = Exc;
        return Exc;
    }


    function slice(arr, begin, end) {
        return Array.prototype.slice.call(arr, begin, end);
    }
    
    
    //only to check arrays and objects
    function isObject(a) {
        return Object.prototype.toString.call(a) === '[object Object]' && a;
    } //ECMAScript recommendation

    function isArray(a) {
        return Object.prototype.toString.call(a) === '[object Array]';
    } //ECMAScript recommendation

    function comma_split(s) {
        return s ? s.split(/\s*,\s*/) : [];
    }

    function _assign(destination, value, field_name) {
        if (destination !== value) {
            destination[field_name] = value;
        } else {
            throw Error("Recursive assignment destination[fieldName] = destination! \n" + 
                JSON.stringify(destination) + "\n   fieldName: " + field_name);
        }
    }


    function _extend(destination, source) {
        for (var field_name in source) {
            if(source.hasOwnProperty(field_name)) {
                var value = source[field_name];
                //recursion prevention
                if (destination !== value) {
                    destination[field_name] = value;
                } else {
                    throw Error("Recursive assignment destination[fieldName] = destination! \n" +
                        JSON.stringify(destination) + "\n   fieldName: " + field_name);
                }
            }
        }
        return destination;
    }


    function _mix(base, mixins) {
        for (var i = 0; i < mixins.length; i++) {
            _extend(base, mixins[i]); //overriding previous members
        }
    }

    function _methodPrependWrapper(klass, method){
        return function(){
            var args = slice(arguments);
            args.unshift(klass);
            return method.apply(this, args);
        }
    }
    
    function _check_suffixes_and_extend(mixin_or_proto, body, klass) {
        //wrapper to bypass one-time closure creation inside a cycle
        for (var field_name in body) {
            if (body.hasOwnProperty(field_name)) {
                if (field_name === _CONSTRUCTOR || field_name === _SUPER_ARGS) continue;
                
                //assign to what context - instance proto or constructor function (class members)
                var assignTo = mixin_or_proto;
                
                if (field_name.indexOf(_CLASS_MEMBER_PREFIX) === 0){
                    if (typeof klass !== T_FUN) {
                        throw new Jassino.MembersError(body, "Mixin cannot have class (static) members");
                    }
                    assignTo = klass;
                }

                var def = body[field_name];

                if (isArray(def) && (def[0] in Jassino.$$)) {
                    if (def[0] === Jassino.$$.cls) {
                        //only for methods
                        _assign(assignTo,
                            //prepend with the constructor function (klass)
                            _methodPrependWrapper(klass, def[1]),
                            field_name
                        );
                    } else {
                        _assign(assignTo, def[1], field_name);
                    }
                } else {
                    _assign(assignTo, def, field_name);
                }
            }
        }

    }

    //---------------------------------------------------------------------------------------------
    function _process_args(args) {
        /*
         * SPEC:
         * (<namespace>, name, 
         *  < SuperClass | [Mixins...] | SuperClass, [Mixins...] >,
         * body), 
         * <> - for optionals
         * mixins must be always wrapped into array[] - 
         * it makes clear whether single mixin or super class is in declaration,
         * plus removes extra checks in parameters parser
         */
        var ns,
            AE = Jassino.ArgumentsError,
            name_pos = 0,
            len = args.length;

        if (len < 2) throw new AE(args, "Specify at least name and body");

        //if first parameter an object => it should be namespace
        if (isObject(args[0])) {
            name_pos++;
            ns = args[0]
        } else if (args[0] && typeof args[0] === T_STR) {
            //if default namespace was set explicitly by setDefaultNS - use it, 
            // otherwise do not add to any nammespace
            ns = Jassino.NS || null; 
        } else {
            throw new AE(args, "First argument should be namespace or name")
        }

        var data = {
                body: args[len - 1], //last parameter - always class/mixin definition body object
                ns: ns,
                name: args[name_pos],
                sclass: null,
                smixins: null
            },
        //number of parameters between name and body
            var_par_num = len - (name_pos + 1) - 1;

        if (!data.name || typeof data.name !== T_STR) throw new AE(data, "Invalid name");

        if (var_par_num > 0) {
            var errmsg = " -> Parameters SHOULD BE: " +
                "([namespace,] name, [class,] [mixins_array,] body)";
            var par_after_name = args[name_pos + 1];

            if (var_par_num == 2) { //superclass and mixins
                var mixins = args[name_pos + 2];
                if ((typeof par_after_name === T_FUN) && isArray(mixins)) {
                    data.sclass = par_after_name;
                    data.smixins = mixins
                } else {
                    throw new AE(data, "Super mixins and/or super class are invalid:" +
                        par_after_name + ',' + mixins + errmsg)
                }
            } else if (var_par_num == 1) { //super class OR mixins
                if (typeof par_after_name === T_FUN) {
                    data.sclass = par_after_name
                } else if (isArray(par_after_name)) {
                    data.smixins = par_after_name
                } else {
                    throw new AE(data, "Class or mixins array is invalid: " 
                        + par_after_name + errmsg)
                }
            } else
                throw new AE(data, "too many parameters")
        }//else only body specified
        return data
    }

    function _nsadd(data, obj) {
        if(data.ns) {
            if (typeof data.ns[data.name] !== UNDEF)
                throw new Jassino.DuplicationError(data);
            data.ns[data.name] = obj
        }
    }

    //===================================================================================================================
    /* USAGE:
     * 
     *  var Mixin = //optional
     *  Mixin( optionalNamespace, "MixinName", [Mixin1, Mixin2], {
     *     member1: 1,
     *     member2: function(){}
     *  }
     */
    Jassino.Mixin = function () {
        var data = _process_args(arguments),
            mixin = {};

        _nsadd(data, mixin);

        if (data.smixins) _mix(mixin, data.smixins); //Super Mixins

        if (data.body[_CONSTRUCTOR]) throw new AE(data, 
            "Mixin should not contain the constructor!");
        
        _check_suffixes_and_extend(mixin, data.body);

        return mixin;
    };

    //===================================================================================================================
    /*
     * USAGE:
     * 
     * var ClassName = //optional
     * Class( optionalNamespace, "ClassName", SuperClass, [Mixin1, Mixin2], {
     *    _: function(_sup, a, b, c, d){ 
     *        this.super(_sup, a, b);
     *        ....
     *    },
     *    //-------------- OR equivalent ---------------
     *    _: 'a,b,c, d',
     *    __: 2,
     *    //-----------
     *    
     *    methodWithClassInst__c: function(a, b){
     *        this.supercall(_cls, "methodName", c, d);
     *    }
     *    prop: 5,
     *    method: function(){}
     *    
     *    
     *    staticVar__s: 1, 
     *    staticMethod__s: function(){}
     *    },
     *    staticMethodWithClassInst__cs: function(_cls, a, b){
     *        _cls.anotherStaticMethod(c, d);
     *    }
     *    
     * }
     * ...
     * optionalNamespace.ClassName.staticMethod(a, b);
     * ClassName.staticMethodWithClassInst(a, b);
     */
    Jassino.Class = function () {
        var data = _process_args(arguments),
            body = data.body,
            SuperClass = data.sclass;

        var saved_ctor = body[_CONSTRUCTOR], //user's custom constructor (optional)
            savedSuperArgsNumber = body[_SUPER_ARGS],
            klass,
        //instantiation: new ClassA(), otherwise exception. 
        //It would be more complicated and slow wrapper to allow 'new' omission
            _inst_err = function () {
                throw new Jassino.InstantiationError({}, 'use "new": new ClassA()')
            };

        //------------------constructor omitted, automatic constructor with super calls if needed ------------------
        if (!saved_ctor || saved_ctor === 'auto') {
            //"default (implicit) constructor", handles also _:[], _:null, _:false, undefined etc
            //it is subject to discussion if default constructor should do super calls
            klass = SuperClass ?
                function () {
                    //condition shifted out of helper function for performance
                    if (!this[_VALID_INSTANCE_MARKER]) _inst_err();          
                    SuperClass.apply(this, arguments)
                }
                :
                function () {
                    if (!this[_VALID_INSTANCE_MARKER]) _inst_err()
                };
            
        //------------------------------------- a function specified for the constructor -------------------------------
        } else if (typeof saved_ctor === T_FUN) {
            //---- full explicit constructor
            // super constructor call (if needed) must be done as super.call(this, ...)
            // super constructor is a wrapper as well, so it will populate the inner-constructor 
            // with leading Super-SuperClass automatically
            klass = function () {
                if (!this[_VALID_INSTANCE_MARKER]) _inst_err();
                try {
                    var args = slice(arguments);
                    args.unshift(SuperClass);
                    saved_ctor.apply(this, args);
                } catch (e) {
                    throw new Jassino.ConstructorError(e.message,
                        '\n[Hint1: Recursive call by constructor to itself ??]\n' +
                        '[Hint2: Need Super call ??]\n', e)
                } finally {
                    
                }
            };

        //------------------------------------- string shortcuts for constructor arguments---------------------------------
        } else if (typeof saved_ctor === T_STR) {
            var ctorParams = comma_split(saved_ctor);

            if (! savedSuperArgsNumber) {
                //SPEC: _:'arg1, arg2, ...'
                if (SuperClass && typeof savedSuperArgsNumber === UNDEF) {
                    //it's okay if super class shortcut is just __:0 or __:false -- then anyway 
                    //we know that users explicitly denoted there should be no super call
                    //and the only purpose of the message below - is to ensure user knows what he is doing
                    throw new Jassino.ConstructorError(saved_ctor,
                        "_: '" + saved_ctor + "' -- Class and SuperClass shortcut notations must be present both!");
                }
                klass = function () {
                    if (!this[_VALID_INSTANCE_MARKER]) _inst_err();
                    for (var i = 0; i < ctorParams.length; i++)
                        this[ctorParams[i]] = arguments[i]
                }
            } else if (savedSuperArgsNumber > 0){
                //SPEC: __: 'super_arg1, super_arg2, ...'
                if (!SuperClass) throw new Jassino.ConstructorError(saved_ctor,
                    "__: '" + savedSuperArgsNumber + "'" + " assumes SuperClass presence");

                klass = function () {
                    if (!this[_VALID_INSTANCE_MARKER]) _inst_err();
                    
                    SuperClass.apply(this, slice(arguments, 0, savedSuperArgsNumber));

                    for (var i=savedSuperArgsNumber; i<ctorParams.length; i++) {
                        this[ctorParams[i]] = arguments[i];
                    }
                }
            } else
                throw new Jassino.ConstructorError(savedSuperArgsNumber, 
                    "Invalid number of the Super constructor arguments");
        } else
            throw new Jassino.ConstructorError(saved_ctor, "Invalid constructor");
        
        //------------------------------------- add to namespace if present -----------------------------------------
        _nsadd(data, klass);

        //------------------------------------- super class handling -----------------------------------------------
        if (SuperClass) {
            //superclass name, body variant works for non-jassino superclasses
            var SNAME = SuperClass[_CLASS_NAME]; 

            klass.prototype = Object.create(SuperClass.prototype);

            klass.prototype.constructor = klass;

            //----------------- instance-level super reference -> super constructor -------------
            //this.SuperClassName(args), this points to instance
            //WARNING!!! picking name         $SuperClassName        rather then 'super' or so is essential,
            //general names work incorrectly in prototype chain with several levels of inheritance
            //we need to point exactly to the class super should belong to

            //Counter-example (from http://myjs.fr/my-class/):
            //function Person(name) {
            //    this.name = name;
            //};
            //function Dreamer(name, dream) {
            //    //accessing superclass with this.superclass: DANGEROUS
            //    this.superclass.constructor.call(this, name);
            //    this.dream = dream;
            //}
            //Dreamer.prototype.superclass = Person.prototype;
            //function Nightmarer(name, dream) {
            //    this.superclass.constructor.call(this, name, dream); //infinite loop
            //    this.field = "will never be accessed";
            //}
            //Nightmarer.prototype.superclass = Dreamer.prototype;
            //new Nightmarer("name", "dream")
            //RangeError: Maximum call stack size exceeded

            //-------------- Class Members inherited from SuperClass --------------------------------------
            _extend(klass, SuperClass);

            //------------------ super method call: use like this.SuperClass_call(method_name, arg1,...) ------------- 
            klass.prototype[_SUPER_METHOD_CALL] = function (_cls, method) {
                return _cls[_SUPER_CLASS].prototype[method].apply(this, slice(arguments, 2))
            };

            //----------------------- class-level super reference -------------
            //WARNING! this should go AFTER _extend() with SuperClass
            klass[_SUPER_CLASS] = SuperClass;

        }

        //--------------------------- mixins handling -----------------------------------------------
        //mix all members from mixins
        if (data.smixins) {
            _mix(klass.prototype, data.smixins)
        }

        //------------------------------ 1) extending class with class/static members, ------------------------------
        //add "class" members from _CLS variable to constructor(class) object, 
        // so accessing like ClassA.static_member()
        //will override Super Class class members with the same name
        //--------------------------- 2) extending prototype with instance members --------------------------------------
        //this goes last to provide correct overriding order: if any mixin has the same method, it will be hidden
        //class methods do not matter here as resist on constructor object rather then instance object
        _check_suffixes_and_extend(klass.prototype, body, klass);

        
        //------------------------------ class name ----------------------------------------------
        //WARNING!     do this AFTER extending with SuperClass, otherwise class variables are overriden
        //class methods will be able to 
        //reference the class (constructor function) as this.CLS, this - constructor function object,
        //which contains class members exactly
        klass[_CLASS_NAME] = data.name;
        
        //This always contain LAST class name in the prototype chain!!!
        klass.prototype[_CLASS_NAME] = data.name;
        
        //--------------------static marker, pointing that object is in the jassino chain----------------------
        klass.prototype[_VALID_INSTANCE_MARKER] = true;

        return klass;
    };

    //------------------ Annotations ------------------------------------
    Jassino.$$ = {
        cls: "cls", //prepend method arguments with _cls === constructor function
    };
    
    return Jassino;
})({});

if (module){
    module.exports = Jassino;
}