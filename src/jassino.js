var jassino = {
    NS: {}, //default namespace
    super_prefix : '$',

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
        var len = args.length
        return {
            body: args[len - 1],
            heritage: jassino.slice(args, shift + 1, len - 1), //Super class or Super traits set
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
            ARG = data.body.A_,   //constructor arguments
            SARG = data.body.A$, //super arguments
            klass;

        delete body.A_
        delete body.A$

        function _init() {
            if (ARG){
                for (var i =0; i < ARG.length; i += 2)
                    this[ARG[i]] = ARG[i + 1]
            }
            if (SuperClass && SARG)
                SuperClass.apply(this, SARG)
        }

        if (body._) {
            var saved = body._
            klass = function() {
                _init.call(this)
                saved.apply(this, arguments)
            }
        } else {
            klass = _init
        }
        delete body._

        _nsadd(data, klass)

        if (SuperClass) {

            var SuperClassEmpty = function(){};
            SuperClassEmpty.prototype = SuperClass.prototype;
            klass.prototype = new SuperClassEmpty();

            klass.prototype.constructor = klass;
            klass.$ = SuperClass;
            if ( ! SARG) //manual super() call - create only if wasn't automatic one
                klass.prototype[jassino.super_prefix + data.name] = function() {
                    SuperClass.apply(this, arguments)
                }

            _extend(klass, SuperClass, false);
        }

        if (body.MIX) _mix(klass.prototype, body.MIX)
        delete body.MIX
        jassino.Class.extendClass(klass, body);

        return klass;
    }

    jassino.Class.extendClass = function(cls, body) {
        if (body.CLS) {
            _extend(cls, body.CLS, true);
            delete body.CLS;
        }
        _extend(cls.prototype, body, true)
    }

})();
