/********************************************************************************************************************
*******************                                   Jassino                                 ***********************
*******************      Very light, fast and well tested object orientation in Javascript    ***********************
*********************************************************************************************************************
*   version: 0.2
*   
*   Copyright (c)  Denis Volokhovski, 2012
*   
*   Inspired by My-class library from Jie Meng-Gerard: https://github.com/jiem/my-class
*/
    
var Jassino = (function() {
    /*
    * Terminology:
    * class - constructor function F
    * instance/object (of class) - new F() in rough view
    * Super Class for F - constructor function G such that in rough F.prototype = new G()
    * super constructor - constructor function G used as functionS
    * body - definition body object provided for Class or Trait
    * super object - Super class prototype
    */
    //--------------------- you may change these parameters to your own symbols ----------------------
    var _CONSTRUCTOR       = '_',        //constructor function in body
        _CLASS_NAME        = '_NAME',    //class name on the class itself

        _SUPER_OBJ_SUFFIX  = '$',        //super object suffix
        
        _SUPER_CLASS       = '$C',       //reference to SuperClass in class 
        _SUPER_CLASS_NAME  = '$NAME',    // reference to SuperClass name in class -OR- body 
                                         // (in case of inheriting from usual function)

        _PREFIX_LENGTH     = 3,
        _CLASS_MEMBER_PREF = "c__",
        _PROPERTY_PREF     = "p__",
        
        _PROP_FIELD_GET_PREF = 'get_',   //prefix attached to internal property field, so prop() <-get/set-> _PROP_prop
        _PROP_FIELD_SET_PREF = 'set_',   //prefix attached to internal property field, so prop() <-get/set-> _PROP_prop

        UNDEF = "undefined",
        FUN = "function",
        STR = "string",
        OBJ = 'object'
    
    //------------------------------------------------------------------------------------------------
    var J = {
        NS: {}, //default namespace

        DuplicationError: _make_exc("Duplication"),
        ArgumentsError: _make_exc("Arguments"),
        ConstructorError: _make_exc("Constructor"),
        MembersError: _make_exc("Members"),

        is_array: is_array
    }

    //==============================================================================================
    function dump(obj){
        var res = obj.toString()
        if (res == "[object Object]")
        {
            res = ''
            for (var p in obj) {
                res += p + '::' + obj[p] + '\n';
            }
        }
        return res;
    }
    
    
    function _make_exc(msg){ return function(data, message){this.message = (msg ? msg + ": " : "") + (message || "DATA:") + " ==> " +  dump(data)} }

    
    function slice(arr, begin, end){return Array.prototype.slice.call(arr, begin, end)}
    
    
    function is_array(a){return Object.prototype.toString.call(a) === '[object Array]';} //ECMAScript recommendation

    
    function _inner_extend(destination, source_field_val, field_name){
        if ((destination[field_name] !== source_field_val) &&
            (destination !== source_field_val) //recursion prevention, from JQuery.extend()
        )
            destination[field_name] = source_field_val;
    }
    
    
    function _extend(destination, source) {
        for (var field_name in source)
            _inner_extend(destination, source[field_name], field_name)
        return destination;
    }

    
    function _mix(base, mixins){
        for (var i = 0; i < mixins.length; i++)
            _extend(base, mixins[i]); //overriding previous members
    }

    
    function _check_prefixes_and_extend(trait_or_proto, body, class_obj){
        //wrapper to bypass one-time closure creation inside a cycle
        var make_it = function(field_name){
            _inner_extend(trait_or_proto, function(){ return this[field_name] }, _PROP_FIELD_GET_PREF + field_name)
            _inner_extend(trait_or_proto,  function(val){ this[field_name] = val }, _PROP_FIELD_SET_PREF + field_name)
        }
        for (var field_name in body) {                      //Class Members specified in body
            var prefix = field_name.slice(0, _PREFIX_LENGTH)
            
            if (prefix.toLowerCase() === _CLASS_MEMBER_PREF){
                if ( ! class_obj)
                    throw new J.MembersError(body, "Trait cannot have class (static) members")
                _inner_extend(class_obj, body[field_name], field_name.slice(_PREFIX_LENGTH));
                
            }else if (prefix.toLowerCase() === _PROPERTY_PREF){
                var pure_name = field_name.slice(_PREFIX_LENGTH)
                
                //put initial value into instance prototype/trait
                _inner_extend(trait_or_proto, body[field_name], pure_name)
                
                //put getter/setter into prototype/trait
                make_it(pure_name)
            
            }else if (field_name !== _CONSTRUCTOR && field_name !== _SUPER_CLASS_NAME){
                _inner_extend(trait_or_proto, body[field_name], field_name)
            }
        }
        
    }
    
    //---------------------------------------------------------------------------------------------
    function _process_args(args){
        /*
        * SPEC:
        * (<namespace>, name, 
        *  < SuperClass | [Traits...] | SuperClass, [Traits...] >,
         * body), 
         * <> - for optionals
         * traits must be always wrapped into array[] - 
         * it makes clear whether single trait or super class is in declaration,
         * plus removes extra checks in parameters parser
         */
        var ns,
            AE = J.ArgumentsError,
            name_pos = 0,
            len = args.length
        
        if (len < 2) throw new AE(args, "Specify at least name and body")
        
        //if first parameter an object => it should be namespace
        if (args[0] !== null && //null is object
            typeof args[0] === OBJ && ! is_array(args[0])
        ){ 
            name_pos++
            ns = args[0]
        }else if(args[0] && typeof args[0] === STR){
            ns = J.NS
        }else{
            throw new AE(args, "First argument should be namespace or name")
        }
        
        var data = {
                body: args[len - 1], //last parameter - always class/trait definition body object
                ns: ns,
                name: args[name_pos]
            },
            //number of parameters between name and body
            var_par_num = len - (name_pos + 1) - 1

        if (! data.name || typeof data.name !== STR) throw new AE(data, "Invalid name")
                
        if (var_par_num > 0){
            var errmsg = "Parameters between name and body: 1st - class, 2nd - traits array 1..n || one of them"
            var par_after_name = args[name_pos + 1]

            if (var_par_num == 2){ //superclass and traits
                var traits = args[name_pos + 2]
                if (typeof par_after_name == FUN && is_array(traits) ) {
                    data.sclass = par_after_name
                    data.straits = traits
                }else{
                    throw new AE(data, errmsg)
                }
            }else if(var_par_num == 1){ //super class OR traits
                if (typeof par_after_name === FUN) {
                    data.sclass = par_after_name
                }else if (is_array(par_after_name)){
                    data.straits = par_after_name
                }else{
                    throw new AE(data, errmsg)
                }
            }else
                throw new AE(data, "too many parameters")
        }//else only body specified
        return data
    }

    function _nsadd(data, obj){
        if (typeof data.ns[data.name] !== UNDEF)
            throw new J.DuplicationError(data)
        data.ns[data.name] = obj
    }

    //===================================================================================================================
    J.Trait = function(){
        var data = _process_args(arguments),
            trait = {};

        _nsadd(data, trait)

        if (data.straits) _mix(trait, data.straits); //Super Traits

        _check_prefixes_and_extend(trait, data.body)
        
        return trait;
    }

    //===================================================================================================================
    /*
    * SPEC:
    * Class( "Kls", SuperCls, [Trait1, Trait2], {
    *    _: function(){ do_custom_construction();},
    *    CLS:{
    *    class_var:1, 
    *    class_method: function(){}
    *    },
    *    instance_var: 5,
    *    instance_method: function(){}
    * }
     */
    J.Class = function() {
        var data = _process_args(arguments),
            body = data.body,
            SuperClass = data.sclass

        var saved_ctor = body[_CONSTRUCTOR], //user's custom constructor (optional)
            klass;

        //------------------------------ creating constructor at declaration time -------------------------------------
        if ( ! saved_ctor)
            //"default (implicit) constructor", handles also _:[], _:null etc
            //it is subject to discussion if default constructor should do super calls
            klass = SuperClass ? function(){SuperClass.apply(this, arguments)} : function(){}
            
        else if (typeof saved_ctor === FUN)
            //---- full explicit constructor
            // super constructor call (if needed) must be done as this.SuperClassName()
            klass = function(){
                try{
                    saved_ctor.apply(this, arguments)
                }catch(e){
                    throw new J.ConstructorError(e.message, 'Probably recursive call from inside of constructor to itself (Did you meant super call?)')
                }
            }
        
        else if (is_array(saved_ctor)){
            //---- Shortcut form SPEC: <[[<'$super_arg', ....>],> ['constructor_arg', ....]<]>
            //saved_ctor non-empty here due to very first condition

            //saved_ctor[0] - super agrs, [1] - constructor args
            if (! is_array(saved_ctor[0])){
                if (SuperClass) throw new J.ConstructorError(saved_ctor, 
                    "_: [arg,...] assumes NO SuperClass")
                klass = function(){
                    for (var i=0; i < saved_ctor.length; i++) 
                        this[saved_ctor[i]] = arguments[i]
                }
            }else{
                //works also for [[],[]] that is equivalent for default constructor
                if ( ! SuperClass) throw new J.ConstructorError(saved_ctor,
                        "_: [[super_arg1,...], [arg1,...]] assumes SuperClass")
                var base_of_ctor_args = saved_ctor[0].length,
                    ctor_args = saved_ctor[1]
                klass = function(){
                    SuperClass.apply(this, slice(arguments, 0, base_of_ctor_args))
                    for (var i=0; i < ctor_args.length; i++)
                        this[ctor_args[i]] = arguments[base_of_ctor_args + i]
                }
            }
        }else
            throw new J.ConstructorError(saved_ctor, "Invalid constructor")
        
        _nsadd(data, klass)

        //------------------------------------- super class handling -----------------------------------------------
        if (SuperClass) {
            var SNAME = body[_SUPER_CLASS_NAME] || SuperClass[_CLASS_NAME]; //superclass name, body variant works for non-jassino superclasses

            //clone SuperClass prototype chain so protecting SuperClass instance object itself 
            // from overriding in childs => this also guarantees of working calls
            //for ancestor methods and data via this.Ancestor$, see below
            var SuperClassEmpty = function(){};
            SuperClassEmpty.prototype = SuperClass.prototype;
            klass.prototype = new SuperClassEmpty();

            klass.prototype.constructor = klass;
            
            //----------------------- this.Super$.blabla(): reference to super object ------------- 
            klass.prototype[SNAME + _SUPER_OBJ_SUFFIX] = SuperClass.prototype

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

            klass.prototype[SNAME] = function() {
                SuperClass.apply(this, arguments)
            }

            //-------------- Class Members inherited from SuperClass --------------------------------------
            _extend(klass, SuperClass);

            //----------------------- class-level super reference -------------
            //WARNING! this should go AFTER _extend() with SuperClass
            klass[_SUPER_CLASS] = SuperClass;
            klass[_SUPER_CLASS_NAME] = SNAME

        }

        //--------------------------- traits handling -----------------------------------------------
        //mix all members from traits
        if (data.straits) {
            _mix(klass.prototype, data.straits)
        }

        //------------------------------ 1) extending class with class/static members, ------------------------------
        //add "class" members from _CLS variable to constructor(class) object, 
        // so accessing like ClassA.static_member()
        //will override Super Class class members with the same name
        //--------------------------- 2) making up properties --------------------------------------
        //--------------------------- 3) extending prototype with instance members --------------------------------------
        //this goes last to provide correct overriding order: if any trait has the same method, it will be hidden
        //class methods do not matter here as resist on constructor object rather then instance object
        _check_prefixes_and_extend(klass.prototype, body, klass)

        //------------------------------ class name ----------------------------------------------
        //WARNING!     do this AFTER extending with SuperClass, otherwise class variables are overriden
        //class methods will be able to 
        //reference the class (constructor function) as this.CLS, this - constructor function object,
        //which contains class members exactly
        klass[_CLASS_NAME] = data.name

        return klass;
    }

    return J
})();
