"use strict";

function dump(data) {
    data = (data === null ? 'null' : data);
    var s = QUnit.jsDump.parse(data, typeof data);
	return s.replace(/[\&<>]/g, function(s) {
		switch(s) {
			case "&": return "&amp;";
			case "<": return "&lt;";
			case ">": return "&gt;";
			default: return s;
		}
	});
}

var Class = Jassino.Class,
    Mixin = Jassino.Mixin,
    ns, _ns = {},
    default_up_down = {
        beforeEach: function () {
            ns = Jassino.setDefaultNS({});
        },
        afterEach: function () {
            ns = Jassino.setDefaultNS({});
        }
    };

var eq = strictEqual;

//========================================================================================================================
module("Basic definitions", default_up_down);

test("Class and Mixin definitions, typeof Class/Mixin === function", 2, function() {
            eq(typeof Class, "function", 'Class');
            eq(typeof Mixin, "function", 'Mixin')
});

//========================================================================================================================
module("Class/Mixin creation, NameSpaces --", default_up_down);

test("Class/Mixin creation - default namespace", 2, function() {
    var A = Class('A', {});
    var T = Mixin('T', {});
    eq(A, ns.A, 'for Class');
    eq(T, ns.T, 'for Mixin');
});

test("Class/Mixin creation -> namespace test", 2, function() {
    var ns = {};
    var A = Class(ns, 'A', {});
    var T = Mixin(ns, 'T', {});
    eq(A, ns.A, 'for Class');
    eq(T, ns.T, 'for Mixin');
});

test("Duplicate Class/Mixin creation)", 2, function() {
    var n = {};
    Class(n, 'A', {});
    throws(function(){Class(n, 'A', {})}, Jassino.DuplicationError, 'for Class: ' + dump(n));
    Mixin(n, 'T', {});
    throws(function(){Mixin(n, 'T', {})}, Jassino.DuplicationError, 'for Mixin');
});

test("Duplicate Class/Mixin creation - default NS)", 2, function() {
    Class('A', {});
    throws(function(){Class('A', {})}, Jassino.DuplicationError, 'for Class: ' + dump(ns));
    Mixin('T', {});
    throws(function(){Mixin('T', {})}, Jassino.DuplicationError, 'for Mixin');
});

test("Invalid namespace object test on Class/Mixin creation)", function() {
    throws(function(){Class(null, 'A', {})}, Jassino.ArgumentsError, 'null ns for Class')
    throws(function(){Mixin(null, 'T', {})}, Jassino.ArgumentsError, 'null ns for Mixin')
    throws(function(){Class("", {})}, Jassino.ArgumentsError, 'empty name for Class')
    throws(function(){Mixin("", {})}, Jassino.ArgumentsError, 'empty for Mixin')
    throws(function(){Class("ff")}, Jassino.ArgumentsError, 'empty name for Class')
    throws(function(){Mixin("ff")}, Jassino.ArgumentsError, 'empty for Mixin')
    throws(function(){Class()}, Jassino.ArgumentsError, 'empty name for Class')
    throws(function(){Mixin()}, Jassino.ArgumentsError, 'empty for Mixin')
    throws(function(){Class(['a'], {})})
    throws(function(){Mixin(['a'], {})})
    Mixin('T', {})
    throws(function(){Class(ns, [ns.T], {})})
    throws(function(){Mixin(ns, ['a'], {})})
});

//========================================================================================================================
module("Basic Mixin operations", default_up_down);

test("Members setup", 1, function() {
    Mixin('T', {
        a: 5,
        f: function(){return this.a}
    })
	eq(ns.T.f(), 5, 'member call')
});

//========================================================================================================================
module("Basic Class definitions and operations", default_up_down);

//-------------------------------------------------------------------------------------------------------------------
test("Object members should not become class members", 2, function() {
    Class('T', {
        a: 5,
        f: function(){return this.a}
    })

    eq(ns.T.f, undefined)
    eq(ns.T.a, undefined)

});

//-------------------------------------------------------------------------------------------------------------------
test("Simple instantiation with implicit constructor", 1, function() {
    Class('T', {
        a: 5,
        f: function(){return this.a}
    })
    var t = new ns.T()

    eq(t.f(), 5, 'member call')
});

//========================================================================================================================
module("Class constructors", default_up_down);

//-------------------------------------------------------------------------------------------------------------------
test("Explicit constructor", 1, function() {
    Class('T', {
        _: function(_sup, num){
            this.num = num;
            console.log(dump(_sup));
            console.log(dump(num));
            
        },
        a: "zz",
        f: function(){
            return this.a + this.num
        }
    });

    var t = new ns.T("xx");

    eq(t.f(), "zzxx", 'member call test');
});

//-------------------------------------------------------------------------------------------------------------------
test("Implicit constructor", 1, function() {
    Class('A', {
        _:function(_sup, ancestor_name){
            this.a = "ancestor";
            this.b = ancestor_name;
        }
    });

    Class('T', ns.A, {
        res: function(){return this.a + " " + this.b}
    });

    var t = new ns.T("Sam", "Guy");

    eq(t.res(), "ancestor Sam", 'work properly with super classes, ignores extra parameters')
});


//-------------------------------------------------------------------------------------------------------------------
test("Explicit shortcut - no SuperClass", 3, function() {

    Class('T', {
        _: 'country, flag_color'
    });

    var t = new ns.T("China", "Red");

    ok(true, dump(t));
    eq(t.country, "China", 'initializes parameter');
    eq(t.flag_color, "Red", 'initializes parameter')
});


//-------------------------------------------------------------------------------------------------------------------
test("Explicit shortcut with super args but no SuperClass (Error)", function() {
    throws(function(){
            Class('T', {
                _: 'country, flag_color',
                __:1
            })
        },
        Jassino.ConstructorError,
        "not allowed"
    );
    throws(function(){
            Class('T', {
                _: ['blabla', '']
            })
        },
        Jassino.ConstructorError,
        "not allowed"
    );
    throws(function(){
            Class('T', {
                _: ['', '']
            })
        },
        Jassino.ConstructorError,
        "not allowed"
    );
});

//-------------------------------------------------------------------------------------------------------------------
test("Explicit shortcut constructor with super class", function() {

    Class('A', {
        protovar: "proto",
        
        _:function(_sup, ancestorName){
            this.rootSuper = _sup;
            this.a = "ancestor";
            this.a1 = ancestorName;
        }
    });

    Class('B', ns.A, {
        _: 'anynameX, b',   
        __: 1
    });

    Class('T', ns.B, {
        _:'anyname1, anyname2, c',
        __: 2,
        res: function(){return this.protovar + " " + 
            this.a + " " + this.a1 + " " + this.b + " " + this.c}
    });

    var t = new ns.T("Sam", "b", "c");

    eq(t.rootSuper, null, '1st cclass has no super, and null passed to _sup');
    eq(t.anyname1, undefined, 'ancestor arguments are not defined');
    eq(t.anyname2, undefined, 'ancestor arguments are not defined');
    eq(t.anynameX, undefined, 'ancestor arguments are not defined');
    eq(t.res(), "proto ancestor Sam b c", 'work properly with super classes, ignores extra parameters')
});

test("Explicit shortcut constructor, explicit full constructor, _sup and super method call", function() {

    Class('A', {
        _: 'a, b'
    });

    Class('T', ns.A, {
        _: function(_sup, a, b, c){
            _sup.call(this, a, b);
            this.c = c;
        },
        res: function(additional){
            return this.a + this.b + this.c + additional;
        }
    });


    Class('X', ns.T, {
        _:'1, 2, 3, d',
        __:3,
        res: [Class.CLS, function(_cls, additional){
            return this.super(_cls, "res", additional);
        }]
    });


    var t = new ns.X("a", "b", "c", "d");

    eq(t.res("ZZZ"), "abcZZZ", 'supe method call works');
    eq(t.d, "d", 'adding parameters to child constructor works')
});


//========================================================================================================================
module("Class instantiation consistency", default_up_down);

test("Multiple instantiation test", function() {
    Class('A', {
        _: 'x, y',
        z: [Class.STATIC, 78],
        a: 4,
        af: function(){return this.a + this.x + this.y}
    });

    var a = new ns.A(1, 2);
    var b = new ns.A(8, 16);

    eq(a.a, 4);
    eq(b.a, 4);
    eq(b.x + b.y, 8 + 16);
    
    eq(a.af(), 1 + 2 + 4);
    eq(b.af(), 8 + 16 + 4);

    eq(ns.A.z, 78);
    
});

test("Forgotten 'new'", function() {
    Class('A', {});
    Class('B', ns.A, {});
    Class('C', {_:function(_sup, x){}});
    Class('D', ns.C, {
        _:'x, y',
        __:1
    });
    Class('E', {_:'a, b'});

    throws(function(){ns.A()}, Jassino.InstantiationError, "Instantiation error raised");
    throws(function(){ns.B()}, Jassino.InstantiationError, "Instantiation error raised 2");
    throws(function(){ns.C(5)}, Jassino.InstantiationError, "Instantiation error raised 3");
    throws(function(){ns.D(6,7)}, Jassino.InstantiationError, "Instantiation error raised 4");
    throws(function(){ns.E(8,9)}, Jassino.InstantiationError, "Instantiation error raised 5");

    new ns.A();
    new ns.B();
    new ns.C(5);
    new ns.D(6,7);
    new ns.E(8,9);
    
});
//========================================================================================================================
module("Class meta definitions", default_up_down);

test("Multiple instantiation test", function() {
    Class('A', {
        m:function(a ,b){return 1 + a + b;}
    });
    Class('B', ns.A, {
        m: [Class.CLS, function(_cls, a, b){return this.super(_cls, "m", 10, 20);}]
    });

    eq(ns.A.__name__, 'A', 'A name');
    eq(ns.B.__name__, 'B', 'B name');
    eq(ns.B.__super__, ns.A, 'A instannce');
    eq(ns.B.__super__.__name__, 'A', 'B super name is A');

    var b = new ns.B();
    eq(b.m(), 1 + 10 + 20, "super method test: regular method");
});

//========================================================================================================================
module("Mixin inheritance", default_up_down);


test("Single inheritance", 15, function() {
    Mixin('A', {
        a: 'a',
        ov: 'ov',
        af: function(){return [this.a, this.ov]},
        ovf: function(){ return [this.a, this.ov];}
    })
    
    Mixin('T', [ns.A], {
        t: 'T',
        ov: 'T_ov',
        tf: function(){return [this.t, this.ov, this.a];},
        ovf: function(){ return [this.t, this.ov, this.a];}
    })
    eq(ns.A.af()[0], 'a', 'A.af() - ancestor\'s members do not corrupted')
    eq(ns.A.af()[1], 'ov', 'A.af() - ancestor\'s members do not corrupted 2')
    eq(ns.A.ovf()[0], 'a', 'A.ovf() - ancestor\'s members do not corrupted')
    eq(ns.A.ovf()[1], 'ov', 'A.ovf() - ancestor\'s members do not corrupted 2')

    eq(ns.T.t, 'T', 't = "T" - own members not corrupted')
    eq(ns.T.ov, 'T_ov', 't = "T" - own overriden members are correct')

    eq(ns.T.a, 'a', 'T.a = "a" - inherited variable')

    eq(ns.T.tf()[0], 'T', 'Own T.tf(), should correctly access ancestor/overriden fields')
    eq(ns.T.tf()[1], 'T_ov', 'Own T.tf(), should correctly access ancestor/overriden fields 2')
    eq(ns.T.tf()[2], 'a', 'Own T.tf(), should correctly access ancestor/overriden fields 3')

    eq(ns.T.af()[0], 'a' , 'Virtual function effect: Inherited A.af() -> T.af(), overriden variables should be changed')
    eq(ns.T.af()[1], 'T_ov' , 'Virtual function effect: Inherited A.af() -> T.af(), overriden variables should be changed 2')

    eq(ns.T.ovf()[0], 'T', 'Overriden A.ovf() -> T.ovf() - output should be as in T.tf()')
    eq(ns.T.ovf()[1], 'T_ov', 'Overriden A.ovf() -> T.ovf() - output should be as in T.tf() 2')
    eq(ns.T.ovf()[2], 'a', 'Overriden A.ovf() -> T.ovf() - output should be as in T.tf() 3')
});


//-------------------------------------------------------------------------------------------------------------------
test("Multiple inheritance", 6, function() {
    Mixin('A', {
        a: 'a',
        ovf: function(){return 'A'},
        anc_ovf: function(){ return 'anc_A';},
        anc_ovf2: function(){ return 'anc_A_2';}
    })
    Mixin('B', {
        b: 'b',
        ovf: function(){return 'B'},
        anc_ovf: function(){ return 'anc_B';},
        anc_ovf2: function(){ return 'anc_B_2';}
    })
    Mixin('C', {
        c: 'c',
        anc_ovf: function(){ return 'anc_C';}
    })
    Mixin('T', [ns.A, ns.B, ns.C], {
        ovf: function(){ return 'T';}
    })
    eq(ns.T.a, 'a', 'inherited variable')
    eq(ns.T.b, 'b', 'inherited variable 2')
    eq(ns.T.c, 'c', 'inherited variable 3')

    eq(ns.T.ovf(), 'T', 'Overriden ovf() -> T.ovf()')
    eq(ns.T.anc_ovf(), 'anc_C', 'Inheritance order: override 1 - last override in C')
    eq(ns.T.anc_ovf2(), 'anc_B_2', 'Inheritance order: override 2 - last override in B')
});
//========================================================================================================================
test("Inheritance transitive law", 4, function() {
    Mixin('A', {
        a: 'a',
        ovf: function(){return 'A'},
        anc_ovf: function(){ return 'anc_A';}
    })
    Mixin('B', [ns.A], {
        b: 'b',
        ovf: function(){return 'B'},
        anc_ovf: function(){ return 'anc_B';}
    })
    Mixin('T', [ns.B], {
        ovf: function(){ return 'T';}
    })
    eq(ns.T.a, 'a', 'inherited variable')
    eq(ns.T.b, 'b', 'inherited variable 2')

    eq(ns.T.ovf(), 'T', 'Overriden ovf() -> T.ovf()')
    eq(ns.T.anc_ovf(), 'anc_B', 'Inheritance override stack: last override happened in B')
});
//========================================================================================================================
module("Classes mixed-in with Mixins", default_up_down);

test("Single mixin", 1, function() {
    Mixin('T1', {t1: "a"})

    Class('C1', [ns.T1], {
        a: "CLS",
        f: function(){return this.a + this.t1}
    })

    eq((new ns.C1()).f(), "CLSa")

});

//-------------------------------------------------------------------------------------------------------------------
test("Multiple mixins", 2, function() {
    
    Mixin('T1', {t1: "a", xf: function(){return "1"}})
    Mixin('T2', {t2: "b"})
    Mixin('T3', [ns.T2], {t3: function(){return this.t2 + "c"}})

    Class('C', [ns.T1, ns.T2, ns.T3], {
        a: "CLS",
        xf: function(){return "2"},
        f: function(){return this.a + this.t1 + this.t3()}
    })

    var inst = new ns.C()
    eq(inst.f(), "CLSabc", "accessing members")
    eq(inst.xf(), "2", "overriding mixin members")

});

//========================================================================================================================
module("Class inheritance", default_up_down);

//-------------------------------------------------------------------------------------------------------------------
test("Inheritance: members test", function() {
    Class('A', {
        a: 'a',
        ov: 'ov',
        c_ov: 78,
        _:'c1, c2',
        af: function(){return [this.a, this.ov]},
        ovf: function(){ return [this.a, this.ov];}
    });
    
    Class('T', ns.A, {
        t: 'T',
        ov: 'T_ov',
        _: 'c1, c2, c_ov',
        __: 2,
        tf: function(){return [this.t, this.ov, this.a];},
        ovf: function(){ return [this.t, this.ov, this.a];}
    });
    var a = new ns.A(1, 2), t = new ns.T(3, 4, 5);
    
    eq(a.af()[0], 'a', 'A.af() - ancestor\'s members do not corrupted');
    eq(a.af()[1], 'ov', 'A.af() - ancestor\'s members do not corrupted 2');
    eq(a.ovf()[0], 'a', 'A.ovf() - ancestor\'s members do not corrupted');
    eq(a.ovf()[1], 'ov', 'A.ovf() - ancestor\'s members do not corrupted 2');

    eq(a.c_ov, 78, 'A().c_ov - ancestor\'s members do not corrupted 2');

    eq(t.t, 'T', 't = "T" - own members not corrupted');
    eq(t.ov, 'T_ov', 't = "T" - own overriden members are correct');

    eq(t.a, 'a', 'T.a = "a" - inherited variable');

    eq(t.tf()[0], 'T', 'Own T.tf(), should correctly access ancestor/overriden fields');
    eq(t.tf()[1], 'T_ov', 'Own T.tf(), should correctly access ancestor/overriden fields 2');
    eq(t.tf()[2], 'a', 'Own T.tf(), should correctly access ancestor/overriden fields 3');

    eq(t.af()[0], 'a' , 'Virtual function effect: Inherited A.af() -> T.af(), overriden variables should be changed')
    eq(t.af()[1], 'T_ov' , 'Virtual function effect: Inherited A.af() -> T.af(), overriden variables should be changed 2')

    eq(t.ovf()[0], 'T', 'Overriden A.ovf() -> T.ovf() - output should be as in T.tf()')
    eq(t.ovf()[1], 'T_ov', 'Overriden A.ovf() -> T.ovf() - output should be as in T.tf() 2')
    eq(t.ovf()[2], 'a', 'Overriden A.ovf() -> T.ovf() - output should be as in T.tf() 3')

    eq(t.c_ov, 5, 'T().c_ov - overridden')

});

//-------------------------------------------------------------------------------------------------------------------
test("Inheritance from usual Prototype-Based pseudo class)", 12, function() {
    function A(constr_var){
        this.constr_var = constr_var
    }
    A.prototype.a = 'a';
    A.prototype.ov = 'ov';
    A.prototype.af = function(){return [this.a, this.ov]};
    A.prototype.ovf = function(){ return [this.a, this.ov];};

    Class('T', A, {
        _:'constr_var',
        __: 1,
        t: 'T',
        ov: 'T_ov',
        tf: function(){return [this.t, this.ov, this.a];},
        ovf: function(){ return [this.t, this.ov, this.a];}
    });
    var t = new ns.T('CONSTRUCTION');

    eq(t.constr_var, 'CONSTRUCTION', 't = super constructor works');

    eq(t.t, 'T', 't = "T" - own members not corrupted');
    eq(t.ov, 'T_ov', 't = "T" - own overridden members are correct');

    eq(t.a, 'a', 'T.a = "a" - inherited variable');

    eq(t.tf()[0], 'T', 'Own T.tf(), should correctly access ancestor/overriden fields');
    eq(t.tf()[1], 'T_ov', 'Own T.tf(), should correctly access ancestor/overriden fields 2');
    eq(t.tf()[2], 'a', 'Own T.tf(), should correctly access ancestor/overriden fields 3');

    eq(t.af()[0], 'a' , 
        'Virtual function effect: Inherited A.af() -> T.af(), overriden variables should be changed');
    eq(t.af()[1], 'T_ov' , 
        'Virtual function effect: Inherited A.af() -> T.af(), overriden variables should be changed 2');

    eq(t.ovf()[0], 'T', 'Overridden A.ovf() -> T.ovf() - output should be as in T.tf()');
    eq(t.ovf()[1], 'T_ov', 'Overridden A.ovf() -> T.ovf() - output should be as in T.tf() 2');
    eq(t.ovf()[2], 'a', 'Overridden A.ovf() -> T.ovf() - output should be as in T.tf() 3');
});

//-------------------------------------------------------------------------------------------------------------------
test("Inheritance transitive law", 4, function() {
    Class('A', {
        a: 'a',
        ovf: function(){return 'A'},
        anc_ovf: function(){ return 'anc_A';}
    });
    
    Class('B', ns.A, {
        b: 'b',
        ovf: function(){return 'B'},
        anc_ovf: function(){ return 'anc_B';}
    });
    Class('T', ns.B, {
        ovf: function(){ return 'T';}
    });
    
    var t = new ns.T();
    
    eq(t.a, 'a', 'inherited variable');
    eq(t.b, 'b', 'inherited variable 2');

    eq(t.ovf(), 'T', 'Overriden ovf() -> T.ovf()');
    eq(t.anc_ovf(), 'anc_B', 'Inheritance override stack: last override happened in B');
});

//-------------------------------------------------------------------------------------------------------------------
test("DEEP inheritance", 1, function() {
    var LEVEL = 100;
    var nspace = {};

    Class(nspace, 'C0', {
        get_accum: function(){ return this.accum },
        _: function(_sup, i){
            this.accum += "{C0: {}}"
        }  //constructor
    });
    var self, i;
    for (i=1; i < LEVEL; i++){
        self = 'C' + i.toString();
        var ancestor = 'C' + (i - 1).toString();

        Class(nspace, self, nspace[ancestor], {
            _: function(_sup, i){
                this.accum = '{C' + i.toString() + ": " + (this.accum || "");
                _sup.call(this, i - 1);
                this.accum += "}"
            }  //constructor
        })
    }
    var accum = (new nspace[self](i - 1)).get_accum();
    eq( accum.replace(/[\w{}\s]+/g, "").length, i, "Here is chain: " + dump(accum))
});

//========================================================================================================================
module("Class members (aka static)", default_up_down);

test("basic test", function() {
    Class('T', {
        _: 'a',
        b: function(){ return "Hello!"},
        
        a: [Class.STATIC, 8],
        bb: [Class.STATIC, function(_cls){ return (ns.T.a + 12) + _cls.__name__}],
        c: [Class.STATIC, null],            
        d: [Class.STATIC, undefined]
    });

    eq(ns.T.a, 8, 'static variable');
    eq(ns.T.bb(), '20T', 'static method');
    eq(ns.T.c, null, 'robustness test: null');
    eq(ns.T.d, undefined, 'robustness test: undefined');

    var t = new ns.T(10);

    eq(ns.T.a, 8, 'static variable (not changed by inst.)');
    eq(ns.T.c, null, 'robustness test: null  (not changed by inst.)');
    eq(ns.T.d, undefined, 'robustness test: undefined  (not changed by inst.)');

    eq(t.a, 10, 'instance var is not overridden');

});


//========================================================================================================================
module("Class/Mixin combined tests", default_up_down);

//-------------------------------------------------------------------------------------------------------------------
test("Rewritten example from my-class (http://myjs.fr/my-class/) - NO INFINITE RECURSION!", 1, function() {
    Class('Person', {
        old_method: function(){ return "Hey!, "},
        _: function(_sup, name){
            this.name=name
        }  //constructor
    });

    Class('Dreamer', ns.Person, {
        _:'name, dream',  //constructor shortcut: name -> super call, dream -> this.dream
        __: 1
    });

    var custom_ns = {};
    Class(custom_ns, 'Nightmarer', ns.Dreamer, {
        field: "dreams about",  //"instance constant" - added to every instance, may be overridden in constructor
        
        old_method: function(){ return "Okay, "}, //overriding
        
        _:function(_sup, name, dream){
            _sup.call(this, name, dream);
            this.field = this.field.toUpperCase(); //control flow should be reached and field created
        },
        test: [Class.CLS, function(_cls){ return this.super(_cls, "old_method") + 
                                 this.old_method() +
                                 this.name + " " + this.field + " " + this.dream
        }]

    });

    var nm = new custom_ns.Nightmarer("Lissa", "Pie");
    
    strictEqual(nm.test(), "Hey!, Okay, Lissa DREAMS ABOUT Pie", "test to not go into infinite recursion!")
});

//========================================================================================================================
module("COMPLEX EXAMPLE", default_up_down);

test("Bees Simplified [not finished]", function() {
    /***************************************************************************************
     * Full featured Example
     *************************************************************************************/

    //convenient variables
    Jassino.setDefaultNS(window);

    //Namespace. It may contain members as well
    var Bees = {};
    
    //---------------------------------------------------------------
    Mixin('Movable', {        
        total_distance: 0,
        location: {x:0, y:0},  //var members also possible in mixins, 
        move_to: function(loc){
            var t = this;
            t.total_distance = t.total_distance + Math.sqrt( Math.pow(loc.x - t.location.x, 2) 
                + Math.pow(loc.y - t.location.y, 2) );
            t.location = loc
        }
    });

    Mixin(Bees, 'Flyable', [Movable], {     //explicit namespace
        flight_hours: 0,
        fly_to: function(loc){ 
            this.move_to(loc);
            this.flight_hours = this.total_distance * 0.001 // hours per meter
        }
    });

    Mixin('Workable', {   
        work_on: function(place){return "Working on " + place.toString()}
    });

    //---------------------------------------------------------------
    Class('Bee', {             
        _: 'name, lifespan'
    });

    Class(Bees, 'FemaleBee', Bee, {
        _: function(_sup, name){         //Explicit constructor
            _sup.call(this,'F');          //super constructor call
            this.name=name;
        }  //constructor
    });

    Class(Bees, 'MaleBee', Bee, [Bees.Flyable], {
        _: 'name, lifespan',
        __: 2
    });

    Class(Bees, 'Queen', Bees.FemaleBee, {               
        _: function(_sup, name){         //Full form of constructor
            _sup.call(this, 'F');          //super constructor call
            this.name=name;
        }  //constructor
    });
    
    Class(Bees, 'Worker', Bees.FemaleBee, [Workable, Bees.Flyable], {
        //Sort Constructor form, means: 
        // On declaration time, generate constructor accepting 2 parameters,
        // first parameter pass to super constructor
        // second parameter write to this.name 
        _: 'gender, name',
        __:1,
        get_productiveness: function(){ return this.productiveness }
    });
    //----------------------------------------------------------------------------------------------
    var Places = {};

    function Place(visitors_capacity){                //native prototype-based class         
        this.visitors_capacity = visitors_capacity
        this.visitors = []
    }
    Place.prototype.add_visitor = function(vis){
        if (this.visitors.length < this.visitors_capacity){
            this.visitors_capacity.push(vis);
            return true
        }else{
            return false
        }
    };
    Place.prototype.remove_visitor = function(vis){
        if (this.visitors.length < this.visitors_capacity){
            this.visitors_capacity.push(vis);
            return true
        }else{
            return false
        }
    };

    Class(Places, 'Plant', Place, {
        $: 'Place'  //inheriting from native pseudo class requires its explicit name
    });

    Class(Places, 'Flower', Places.Plant, {
        nectar: 5,
        full_amount: 5,
        restore_point: -5,
        get_nectar: function(){ 
            var t = this;
            if (t.nectar < t.restore_point){
                t.nectar = t.full_amount
            }
            this.nectar > 0 ? (this.nectar--, 1) : 0 }
    });


    Class(Places, 'Weed', Places.Plant, {
        nectar: 0,
        get_nectar: function(){ this.nectar ? (this.nectar--, 1) : 0 }
    });

    //----------------------------------------------------------------------------------------------
    Class('BeeKeeper', [Workable], {
        
    });

    //---------------------------------------------------------------

    Class(Places, 'Hive', Place, [Movable], {
        //Constructor shortcut (SuperClass-less form)
        //means: take first argument from constructor and place it into this.bees
        _: 'visitors_capacity, bees',
        __: 1,

        get_most_productive: function(){
            if ( ! this.bees) return null;s
            var most = bees[0];
            for (var bee in this.bees){
                if (bee.get_productiveness() > most.get_productiveness())
                    most = bee;
            }
            return most
        }
    });

    //***************************************************************************
    var hive = new Places.Hive(20, //20 visitors max
                      [new Bees.Queen('')])
    //hive.get_most_productive().gather(place)
    
    eq(1,1, "stub")
});





