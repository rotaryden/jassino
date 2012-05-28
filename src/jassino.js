/********************************************************************************************************************
*******************                                   Jassino                                 ***********************
*******************      Very light, fast and well tested object orientation in Javascript    ***********************
*********************************************************************************************************************
*   version: 0.3
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
    //---------------- Change these parameters to meet your own preferences / compatibility ----------------------------
    var 
        //------------ body definitions
        _CONSTRUCTOR       = '_',        //constructor function in body
        _SUPER_CLASS_NAME  = '$',        //SuperClass name. ONLY in case of inheriting from mere function.

        _PREFIX_LENGTH     = 3,
        _CLASS_MEMBER_PREF = "c__",
        _PROPERTY_PREF     = "p__",

        //------------ variables available on the class
        _CLASS_NAME        = '__name',    //class name on the class itself
        _SUPER_CLASS       = '__super',   //reference to SuperClass in class 

        //----------------- instance definitions
        _SUPER_METHOD_CALL_PREF    = 'm__', //super method prefix, use like this.callSuperClass("method_name", args,... )

        _PROP_FIELD_GET_PREF = 'get_',    //prefixes for getters/setters of a property
        _PROP_FIELD_SET_PREF = 'set_',

        //----------------- meta data
        _VALID_INSTANCE_MARKER = "__jassino__"
        
    //--------------------------------------------------------------------------------------------------------------
    var J = {
        NS: {}, //default namespace

        DuplicationError: _make_exc("Duplication"),
        ArgumentsError: _make_exc("Arguments"),
        ConstructorError: _make_exc("Constructor"),
        InstantiationError: _make_exc("Instantiation"),
        MembersError: _make_exc("Members"),

        use_global_scope: function(global_obj){
                var g = global_obj || window
                this.NS = g
                g.Class = this.Class
                g.Trait = this.Trait
            }
            
        },
        
        UNDEF = "undefined",
        
        T_FUN = "Function",
        T_STR = "String",
        T_ARRAY = 'Array'


    //==============================================================================================
    function dump(obj){
        if (is_object(obj))
        {
            var res = ''
            for (var p in obj) {
                res += p + '::' + dump(obj[p]) + '\n';
            }
            return res;
        }else return obj.toString()
    }
    
    
    function _make_exc(msg){ return function(data, message){this.message = (msg ? msg + ": " : "") + (message || "DATA:") + " ==> " +  dump(data)} }

    
    function slice(arr, begin, end){return Array.prototype.slice.call(arr, begin, end)}
    
    
    function is(tp, a){return Object.prototype.toString.call(a) === '[object ' + tp + ']';} //ECMAScript recommendation
    //this function needs for Google Apps Script compatibility
    function is_object(a){return is('Object', a) && a /*not null and not undefined which treated as objects on GAS*/}
    
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
        if (is_object(args[0])){ 
            name_pos++
            ns = args[0]
        }else if(args[0] && is(T_STR, args[0])){
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

        if (! data.name || ! is(T_STR, data.name)) throw new AE(data, "Invalid name")
                
        if (var_par_num > 0){
            var errmsg = "Parameters SHOULD BE: ([namespace,] name, [class,] [traits_array,] body)"
            var par_after_name = args[name_pos + 1]

            if (var_par_num == 2){ //superclass and traits
                var traits = args[name_pos + 2]
                if (is(T_FUN, par_after_name) && is(T_ARRAY, traits) ) {
                    data.sclass = par_after_name
                    data.straits = traits
                }else{
                    throw new AE(data, errmsg)
                }
            }else if(var_par_num == 1){ //super class OR traits
                if (is(T_FUN, par_after_name)) {
                    data.sclass = par_after_name
                }else if (is(T_ARRAY, par_after_name)){
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
            klass,
            //instantiation: new ClassA(), otherwise exception. 
            //It would be more complicated and slow wrapper to allow 'new' omission
            _inst_err = function(){throw new J.InstantiationError({}, 'use "new": new ClassA()')}

        //------------------------------ creating constructor at declaration time -------------------------------------
        if ( ! saved_ctor)
            //"default (implicit) constructor", handles also _:[], _:null etc
            //it is subject to discussion if default constructor should do super calls
            klass = SuperClass ? 
                function(){
                    if (! this[_VALID_INSTANCE_MARKER]) _inst_err()          //condition shifted out of helper function for performance
                    SuperClass.apply(this, arguments)
                } 
                : 
                function(){if (! this[_VALID_INSTANCE_MARKER]) _inst_err()}
            
        else if (is(T_FUN, saved_ctor))
            //---- full explicit constructor
            // super constructor call (if needed) must be done as this.SuperClassName()
            klass = function(){
                if (! this[_VALID_INSTANCE_MARKER]) _inst_err()
                try{
                    saved_ctor.apply(this, arguments)
                }catch(e){
                    throw new J.ConstructorError(e.message, 'Probably recursive call from inside of constructor to itself (Did you meant super call?)')
                }
            }
        
        else if (is(T_ARRAY, saved_ctor)){
            //---- Shortcut form SPEC: <[[<'$super_arg', ....>],> ['constructor_arg', ....]<]>
            //saved_ctor non-empty here due to very first condition

            //saved_ctor[0] - super agrs, [1] - constructor args
            if (! is(T_ARRAY, saved_ctor[0])){
                if (SuperClass) throw new J.ConstructorError(saved_ctor, 
                    "_: [arg,...] assumes NO SuperClass")
                klass = function(){
                    if (! this[_VALID_INSTANCE_MARKER]) _inst_err()
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
                    if (! this[_VALID_INSTANCE_MARKER]) _inst_err()
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

            //------------------ super method call: use like this.m__SuperClass(method_name, arg1,...) ------------- 
            klass.prototype[_SUPER_METHOD_CALL_PREF + SNAME] = function(method){
                return SuperClass.prototype[method].apply(this, slice(arguments, 1))
            }
            //-------------- Class Members inherited from SuperClass --------------------------------------
            _extend(klass, SuperClass);

            //----------------------- class-level super reference -------------
            //WARNING! this should go AFTER _extend() with SuperClass
            klass[_SUPER_CLASS] = SuperClass;

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

        //--------------------static marker, pointing that object is in the jassino chain----------------------
        klass.prototype[_VALID_INSTANCE_MARKER] = true   
        
        return klass;
    }

    return J
})();
