var jassino = {
    NS: {}, //default namespace
    _SUP : '$',
    _CTOR: '_',


    DuplicationError: function(d){this.d=d;},
    InvalidNamespaceError: function(d){this.d = d;},
    InvalidArgumentsError: function(d){this.d = d;},

    extend: function(destination, source, override) {
        if (!destination || !source) return destination;
        for (var field in source)
            if ((destination[field] !== source[field]) &&
                (destination !== source[field]) && //recursion prevention, from JQuery.extend()
                (override === true || ! destination.hasOwnProperty(field)))
                destination[field] = source[field];
        return destination;
    },

    slice: function(arr, begin, end){
        return Array.prototype.slice.call(arr, begin, end)
    },

    is_array: function(a){return a['slice'] !== undefined;}
};

(function() {
    var _extend = jassino.extend;

    function _mix(base, mixins){
        for (var i = 0; i < mixins.length; i++)
            _extend(base, mixins[i], true); //overriding previous members
    }

    function _process_args(args){
        var shift = 0,
            ns = jassino.NS;
        if (typeof args[0] !== 'string'){
            shift = 1
            ns = args[0]
        }
        var len = args.length,
            data = {
                body: args[len - 1],
                ns: ns,
                name: args[shift]
            }

        var a = args[shift + 1], b = args[shift + 2]

        if (shift + 2 < len - 1){ //(..., SuperClass, [Traits...], body)
            if (typeof a == 'function' && jassino.is_array(b) ) {
                data.sclass = a
                data.straits = b
            }else{
                throw new jassino.InvalidArgumentsError(data)
            }
        }else if(shift + 1 < len - 1){ //(...,SuperClass||[Traits], body
            if (typeof a == 'function') {
                data.sclass = a
            }else if (jassino.is_array(a)){
                data.straits = a
            //single trait case - IT IS IMPORTANT TO HAVE 'object' test AFTER is_array() !!!
            }else if (typeof a == 'object') {
                data.straits = [a]
            }else{
                throw new jassino.InvalidArgumentsError(data)
            }
        } //else only body specified
        return data
    }

    function _nsadd(data, obj){
        if (! data.ns)
            throw new jassino.InvalidNamespaceError(data.ns)
        if (data.ns[data.name] != undefined)
            throw new jassino.DuplicationError(data)
        data.ns[data.name] = obj
    }

    //===================================================================================================================
    jassino.Trait = function(){
        var data = _process_args(arguments),
            trait = {};

        _nsadd(data, trait)

        if (data.straits) _mix(trait, data.straits); //Super Traits
        _extend(trait, data.body, true)
        return trait;
    }

    //===================================================================================================================
    jassino.Class = function() {
        var data = _process_args(arguments),
            body = data.body,
            SuperClass = data.sclass,
            SARG = body[jassino._SUP]; //super arguments
        delete body[jassino._SUP]

        var saved_ctor = body[jassino._CTOR]
        delete body[jassino._CTOR]
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
            klass[jassino._SUP] = SuperClass;
            
            //explicit super call - create only if wasn't called automatically upon super arguments from body
            if ( ! SARG)
                klass.prototype[jassino._SUP + data.name] = function() {
                    SuperClass.apply(this, arguments)
                }

            _extend(klass, SuperClass, false);   //Class Members inherited from SuperClass
        }

        if (data.straits) {
            _mix(klass.prototype, data.straits)
        }

        if (body.CLS) {                      //Class Members specified in body
            _extend(klass, body.CLS, true);
            delete body.CLS;
        }

        _extend(klass.prototype, body, true) //this should be LAST write into prototype
                                             //to provide right override order !!!

        return klass;
    }

})();
