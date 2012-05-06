/********************************************************************************************************************
*******************                                   Jassino                                 ***********************
*******************      Very light, fast and well tested object orientation in Javascript    ***********************
*********************************************************************************************************************
*
*   Copyright (c)  Denis Volokhovski, 2012
*   Copyright (c) 2011 Jie Meng-Gerard, ancestor code from https://github.com/jiem/my-class
*/
    
var jassino = (function() {
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
    var _CONSTRUCTOR       = '_',       //constructor function in body
        _CLASS_MEMBERS     = '_C',      //class (static) members definition in body
        _CLASS             = '_C',      //class self-reference on the class itself
        _CLASS_NAME        = '_N',      //class name on the class itself

        _SUPER_OBJ_SUFFIX  = '$',       //super object suffix
        _SUPER_CLASS       = '$C',      //reference to SuperClass in class 
        _SUPER_CLASS_NAME  = '$N'       // reference to SuperClass name in class -OR- body (in case of inheriting from usual function) 

    //------------------------------------------------------------------------------------------------
    var J = {
        NS: {}, //default namespace

        DuplicationError: function(d){this.d=d;},
        ArgumentsError: function(d){this.d=d;},

        extend: extend,
        is_array: is_array
    }

    //==============================================================================================
    function is_array(a){return a.slice !== undefined;}

    function extend(destination, source, override) {
        if (!destination || !source) return destination;
        for (var field in source)
            if ((destination[field] !== source[field]) &&
                (destination !== source[field]) && //recursion prevention, from JQuery.extend()
                (override === true || ! destination.hasOwnProperty(field)))
                destination[field] = source[field];
        return destination;
    }

    function _mix(base, mixins){
        for (var i = 0; i < mixins.length; i++)
            extend(base, mixins[i], true); //overriding previous members
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
            name_pos = 0
        
        if (args.length < 2) throw new AE(args)
        
        //if first parameter an object => it should be namespace
        if (args[0] !== null && typeof args[0] === 'object'){ //null is object
            name_pos++
            ns = args[0]
        }else if(typeof args[0] === 'string'){
            ns = J.NS
        }else{
            throw new AE(args)
        }
        
        var len = args.length,
            data = {
                body: args[len - 1], //last parameter - always class/trait definition body object
                ns: ns,
                name: args[name_pos]
            },
            //number of parameters between name and body
            var_par_num = len - (name_pos + 1) - 1

        if (! data.name) throw new AE(data)
                
        if (var_par_num > 0){
            var par_after_name = args[name_pos + 1]

            if (var_par_num == 2){ //superclass and traits
                var traits = args[name_pos + 2]
                if (typeof par_after_name == 'function' && is_array(traits) ) {
                    data.sclass = par_after_name
                    data.straits = traits
                }else{
                    throw new AE(data)
                }
            }else{ //super class OR traits
                if (typeof par_after_name === 'function') {
                    data.sclass = par_after_name
                }else if (is_array(par_after_name)){
                    data.straits = par_after_name
                }else{
                    throw new AE(data)
                }
            } //else only body specified
        }
        return data
    }

    function _nsadd(data, obj){
        if (data.ns[data.name] !== undefined)
            throw new J.DuplicationError(data)
        data.ns[data.name] = obj
    }

    //===================================================================================================================
    J.Trait = function(){
        var data = _process_args(arguments),
            trait = {};

        _nsadd(data, trait)

        if (data.straits) _mix(trait, data.straits); //Super Traits
        extend(trait, data.body, true)
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
        delete body[_CONSTRUCTOR]

        //------------------------------------- creating root constructor -------------------------------------
        if (saved_ctor) klass = function(){saved_ctor.apply(this, arguments)}
        else klass = function(){}
        
        _nsadd(data, klass)

        //------------------------------ class self-reference and name ----------------------------------------------
        //class methods will be able to 
        //reference the class (constructor function) as this.CLS, this - constructor function object,
        //which contains class members exactly
        klass[_CLASS] = klass
        klass[_CLASS_NAME] = data.name

        //--------------------------- extending class with class/static members -------------------------------------
        //add "class" members from _CLS variable to constructor(class) object, 
        // so accessing like class.static_member()
        if (body[_CLASS_MEMBERS]) {                      //Class Members specified in body
            extend(klass, body[_CLASS_MEMBERS], true);
            delete body[_CLASS_MEMBERS];
        }

        //------------------------------------- super class handling -----------------------------------------------
        if (SuperClass) {
            var SNAME = body[_SUPER_CLASS_NAME] || SuperClass[_CLASS_NAME]; //superclass name, body variant works for non-jassino superclasses
            delete body[_SUPER_CLASS_NAME]

            //clone SuperClass prototype chain so protecting SuperClass instance object itself 
            // from overriding in childs => this also guarantees of working calls
            //for ancestor methods and data via this.Ancestor$, see below
            var SuperClassEmpty = function(){};
            SuperClassEmpty.prototype = SuperClass.prototype;
            klass.prototype = new SuperClassEmpty();

            klass.prototype.constructor = klass;
            
            //----------------------- class-level super reference -------------
            klass[_SUPER_CLASS] = SuperClass;
            klass[_SUPER_CLASS_NAME] = SNAME

            //----------------------- this.Super$.blabla(): reference to super object ------------- 
            klass.prototype[SNAME + _SUPER_OBJ_SUFFIX] = SuperClass.prototype

            //----------------- instance-level super reference -> super constructor -------------
            //this.Kls(args), this points to instance
            //WARNING!!! name $Kls rather then 'super' or so is essential, because
            //general names like super work incorrectly in prototype chain with several levels of inheritance
            //we need to point exactly to what class super should belong
            //example (from http://myjs.fr/my-class/):
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
            extend(klass, SuperClass, false);   
        }

        //--------------------------- traits handling -----------------------------------------------
        //mix all members from traits
        if (data.straits) {
            _mix(klass.prototype, data.straits)
        }

        //--------------------------- extending prototype with instance members --------------------------------------
        //this call goes last to provide correct overriding order: if any trait has the same method, it will be hidden
        //class methods do not matter here as resist on constructor object rather then instance object
        extend(klass.prototype, body, true) 

        return klass;
    }

    return J
})();
