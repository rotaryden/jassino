(function() {
    var _extend = Jascuti.extend,
        _slice = Jascuti.slice,
        _nsadd = Jascuti.ns.add,
        _super_prefix = '$',
        _nsprefix = 'jassino.',
        _ns = {};

    function _mix(base, mixins){
        for (var i = 0; i < mixins.length; i++)
            _extend(base, mixins[i], true);
    }

    //makes Type method to change namespace dynamically
    function _make_nser(Type_name, Type){
        _ns[Type_name] = ''
        return function(name) {
            _ns[Type_name] = name ? name + '.' : '';
            return Type;
        }
    }

    //===================================================================================================================
    var Trait_name = 'Trait'
    var Trait = _nsadd(_nsprefix + Trait_name, function(){
        var len = arguments.length,
            body = arguments[len - 1],
            SuperTraits = _slice(arguments, 1, len - 1),
            trait = {};

        _nsadd(_ns[Trait_name] + arguments[0], trait);

        if (SuperTraits) _mix(trait, SuperTraits);
        return trait;
    })

    Trait.ns = _make_nser(Trait_name, Trait)

    //===================================================================================================================
    var Class_name = 'Class';
    var Class = _nsadd(_nsprefix + Class_name, function() {
        var len = arguments.length,
            body = arguments[len - 1],
            SuperClass = len > 2 ? arguments[1] : null,
            name = arguments[0],
            ARG = body.A_,   //constructor arguments
            SARG = body.A$, //super arguments
            klass;

        delete body.A_
        delete body.A$

        function _init() { //contains 'name' in the closure !!!!!
            if (ARG){
                for (var i =0; i < ARG.length; i += 2)
                    this[ARG[i]] = ARG[i + 1]
            }
            if (SuperClass && SARG)
                SuperClass.apply(this, SARG)
        }

        if (body._) {
            var saved = body._  //body._ ref will be deleted below
            klass = function() {
                _init.call(this)
                saved.apply(this, arguments)
            }
        } else {
            klass = _init
        }
        delete body._

       _nsadd(_ns[Class_name] + arguments[0], klass);

        if (SuperClass) {

            var SuperClassEmpty = function(){};
            SuperClassEmpty.prototype = SuperClass.prototype;
            klass.prototype = new SuperClassEmpty();

            klass.prototype.constructor = klass;
            klass.$ = SuperClass;
            if ( ! SARG) //manual super() call - create only if wasn't automatic one
                klass.prototype[_super_prefix + name] = function() {
                    SuperClass.apply(this, arguments)
                }

            _extend(klass, SuperClass, false);
        }

        if (body.MIX) _mix(klass.prototype, body.MIX)
        delete body.MIX
        Class.extendClass(klass, body);

        return klass;
    })

    Class.extendClass = function(cls, body, override) {
        if (body.CLS) {
            _extend(cls, body.CLS, true);
            delete body.CLS;
        }
        _extend(cls.prototype, body, override)
    }

    Class.ns = _make_nser(Class_name, Class)

})();
