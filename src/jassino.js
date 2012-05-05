var jassino = (function() {
    var J = {
        //--------------------- you may change these parameters to your own symbols ----------------------
        _SUP : '$',
        _CTOR: '_',
        _CLS: 'CLS',
        //------------------------------------------------------------------------------------------------
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
    *    $: [arg1, arg2],
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
            SuperClass = data.sclass,
            SARG = body[J._SUP]; //user's custom super arguments (optional)
        delete body[J._SUP]

        var saved_ctor = body[J._CTOR], //user's custom constructor (optional)
            klass;
        delete body[J._CTOR]

        //------------------------------------- creating root constructor -------------------------------------
        if (SuperClass && SARG){ //functions population for speed
            if (saved_ctor) klass = function(){
                SuperClass.apply(this, SARG)
                saved_ctor.apply(this, arguments)
            }
            //all functions in wrappers to prevent hard find overriding and collisions
            else klass = function(){
                SuperClass.apply(this, SARG)
            }
        }else{
            if (saved_ctor) klass = function(){saved_ctor.apply(this, arguments)}
            else klass = function(){}
        }
        
        _nsadd(data, klass)

        //------------------------------ class self-referemce ----------------------------------------------
        //class methods will be able to 
        //reference the class (constructor function) as this.CLS, this - constructor function object,
        //which contains class members exactly
        klass[J._CLS] = klass

        //--------------------------- extending class with class/static members -------------------------------------
        //add "class" members from _CLS variable to constructor(class) object, 
        // so accessing like class.static_member()
        if (body[J._CLS]) {                      //Class Members specified in body
            extend(klass, body[J._CLS], true);
            delete body[J._CLS];
        }

        //------------------------------------- super class handling -----------------------------------------------
        if (SuperClass) {
            //clone SuperClass chain so protecting SuperClass itself from overriding
            var SuperClassEmpty = function(){};
            SuperClassEmpty.prototype = SuperClass.prototype;
            klass.prototype = new SuperClassEmpty();

            klass.prototype.constructor = klass;
            //----------------------- class-level super reference -------------
            klass[J._SUP] = SuperClass;
            
            //explicit super call - create only if wasn't called automatically upon super arguments from body
            if ( ! SARG){
                //----------------- instance-level super reference -> super constructor -------------
                //this.$Kls(args), this - instantiated object
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

                klass.prototype[J._SUP + data.name] = function() {
                    SuperClass.apply(this, arguments)
                }
            }
            //Class Members inherited from SuperClass
            extend(klass, SuperClass, false);   
        }

        //--------------------------- traits handling -----------------------------------------------
        //mix all members from traits
        if (data.straits) {
            _mix(klass.prototype, data.straits)
        }

        //--------------------------- extending prototype with instance members --------------------------------------
        //this call goes last to provide correct overriding order: if any trait has the same method, it will be hidden
        //class methods do not cludge here as resist on constructor object rather then instance object
        extend(klass.prototype, body, true) 

        return klass;
    }

    return J
})();
