var jassino = {
    NS: {}, //default namespace
    _SUP : '$',
    _CTOR: '_',


    DuplicationError: function(d){this.d=d;},
    InvalidNamespaceError: function(d){this.d = d;},

    extend: function(destination, source, override) {
        if (!destination || !source) return destination;
        for (var field in source)
            if ((destination[field] !== source[field]) &&
                (destination !== source[field]) && //recursion prevention, from JQuery.extend()
                (override === true || ! destination.hasOwnProperty(field)))
                destination[field] = source[field];
        return destination;
    },

    foreach: function(obj, func){
        for (var pname in obj)
            if (obj.hasOwnProperty(pname)){
                func(pname);
            }
    },

    slice: function(arr, begin, end){
        return Array.prototype.slice.call(arr, begin, end)
    }
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
            h = args[shift + 1]
        return {
            body: args[len - 1],
            heritage: h instanceof Array? h : [h], //Super class or Super traits set
            ns: ns,
            name: args[shift]
        }
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

        if (data.heritage) _mix(trait, data.heritage); //Super Traits
        _extend(trait, data.body, true)
        return trait;
    }

    //===================================================================================================================
    jassino.Class = function() {
        var data = _process_args(arguments),
            body = data.body,
            SuperClass = data.heritage ? data.heritage[0] : null,
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

        if (body.MIX) {
            _mix(klass.prototype, body.MIX)
            delete body.MIX
        }

        _extend(klass.prototype, body, true) //this should be LAST write into prototype
                                             //to provide right override order !!!
        
        if (body.CLS) {                     //Class Members specified in body
            _extend(klass, body.CLS, true);
            delete body.CLS;
        }

        return klass;
    }

})();
