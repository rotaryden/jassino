var jassino = (function() {
    var J = {
        NS: {}, //default namespace
        _SUP : '$',
        _CTOR: '_',

        DuplicationError: _errf,
        InvalidNamespaceError: _errf,
        InvalidArgumentsError: _errf,

        extend: extend,
        is_array: is_array
    }

    //==============================================================================================
    function _errf(d){this.d=d;}

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
        * spec:
        * (<namespace>, name, <SuperClass>, <[Traits...]>, body), <> - for optionals
         */
        var name_pos = 0
        
        //if first parameter an object => it should be namespace
        var ns = typeof args[0] === 'object' ? (name_pos++, args[0]) : J.NS
        
        var len = args.length,
            data = {
                body: args[len - 1], //last parameter - always class/trait definition body object
                ns: ns,
                name: args[name_pos]
            }

        //number of parameters between name and body
        var var_par_num = len - (name_pos + 1) - 1
        
        if (var_par_num > 0){
            var par_after_name = args[name_pos + 1]

            if (var_par_num == 2){ //superclass and traits
                var traits = args[name_pos + 2]
                if (typeof par_after_name == 'function' && is_array(traits) ) {
                    data.sclass = par_after_name
                    data.straits = traits
                }else{
                    throw new J.InvalidArgumentsError(data)
                }
            }else{ //super class OR traits
                if (typeof par_after_name === 'function') {
                    data.sclass = par_after_name
                }else if (is_array(par_after_name)){
                    data.straits = par_after_name
                //single trait case - IT IS IMPORTANT TO HAVE 'object' test AFTER is_array() !!!
                }else if (typeof par_after_name === 'object') {
                    data.straits = [par_after_name]
                }else{
                    throw new J.InvalidArgumentsError(data)
                }
            } //else only body specified
        }
        return data
    }

    function _nsadd(data, obj){
        if (typeof data.ns !== "object")
            throw new J.InvalidNamespaceError(data.ns)
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
    J.Class = function() {
        var data = _process_args(arguments),
            body = data.body,
            SuperClass = data.sclass,
            SARG = body[J._SUP]; //super arguments
        delete body[J._SUP]

        var saved_ctor = body[J._CTOR]
        delete body[J._CTOR]
        var klass = function() {
            if (SuperClass && SARG)
                SuperClass.apply(this, SARG)
            if (saved_ctor)
                saved_ctor.apply(this, arguments)
        }

        _nsadd(data, klass)

        if (SuperClass) {
            var SuperClassEmpty = function(){};
            SuperClassEmpty.prototype = SuperClass.prototype; //protect SuperClass from modification
            klass.prototype = new SuperClassEmpty();

            klass.prototype.constructor = klass;
            klass[J._SUP] = SuperClass;
            
            //explicit super call - create only if wasn't called automatically upon super arguments from body
            if ( ! SARG)
                klass.prototype[J._SUP + data.name] = function() {
                    SuperClass.apply(this, arguments)
                }

            extend(klass, SuperClass, false);   //Class Members inherited from SuperClass
        }

        if (data.straits) {
            _mix(klass.prototype, data.straits)
        }

        if (body.CLS) {                      //Class Members specified in body
            extend(klass, body.CLS, true);
            delete body.CLS;
        }

        extend(klass.prototype, body, true) //this should be LAST write into prototype
                                             //to provide right override order !!!
        return klass;
    }

    return J
})();
