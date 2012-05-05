function dump(data, typ) {
    var s = QUnit.jsDump.parse(data, typ ? typ : typeof data)
	return s.replace(/[\&<>]/g, function(s) {
		switch(s) {
			case "&": return "&amp;";
			case "<": return "&lt;";
			case ">": return "&gt;";
			default: return s;
		}
	});
}

var Class = jassino.Class,
    Trait = jassino.Trait,
    ns = jassino.NS,
    default_up_down = {
        setup: function() {
            ns = jassino.NS = {}
        },
        teardown: function() {
            ns = jassino.NS = {}
        }
    }

var eq = equal, ste = strictEqual, rs = raises;

//========================================================================================================================
module("Basic definitions")

test("Class and Trait definitions, typeof Class/Trait === function",
        2, //number of asserts those should be executed
        function() {
            ste(typeof Class, "function", 'Class')
            ste(typeof Trait, "function", 'Trait')
        }
);

//========================================================================================================================
module("Class/Trait creation, NameSpaces --", default_up_down);

test("Class/Trait creation - default namespace", 2, function() {
    var A = Class('A', {})
    var T = Trait('T', {})
    ste(A, ns.A, 'for Class')
    ste(T, ns.T, 'for Trait')
});

test("Class/Trait creation -> ns(ns)", 2, function() {
    var n = {}
    var A = Class(n, 'A', {})
    var T = Trait(n, 'T', {})
    ste(A, n.A, 'for Class')
    ste(T, n.T, 'for Trait')
});

test("Duplicate Class/Trait creation)", 2, function() {
    var n = {}
    Class(n, 'A', {})
    rs(function(){Class(n, 'A', {})}, jassino.DuplicationError, 'for Class: ' + dump(n))
    Trait(n, 'T', {})
    rs(function(){Trait(n, 'T', {})}, jassino.DuplicationError, 'for Trait')
});

test("Duplicate Class/Trait creation - default NS)", 2, function() {
    Class('A', {})
    rs(function(){Class('A', {})}, jassino.DuplicationError, 'for Class: ' + dump(ns))
    Trait('T', {})
    rs(function(){Trait('T', {})}, jassino.DuplicationError, 'for Trait')
});

test("Invalid namespace object test on Class/Trait creation)", 5, function() {
    rs(function(){Class("blabla")}, jassino.ArgumentsError, "arguments.length < 2 for Class")
    rs(function(){Class(null, 'A', {})}, jassino.ArgumentsError, 'null ns for Class')
    rs(function(){Trait(null, 'T', {})}, jassino.ArgumentsError, 'null ns for Trait')
    rs(function(){Class("", {})}, jassino.ArgumentsError, 'empty name for Class')
    rs(function(){Trait("", {})}, jassino.ArgumentsError, 'empty for Trait')
});

//========================================================================================================================
module("Basic Trait operations", default_up_down);

test("Members setup", 1, function() {
    Trait('T', {
        a: 5,
        f: function(){return this.a}
    })
	eq(ns.T.f(), 5, 'member call')
});

//========================================================================================================================
module("Trait inheritance", default_up_down);


test("Single inheritance", 15, function() {
    Trait('A', {
        a: 'a',
        ov: 'ov',
        af: function(){return [this.a, this.ov]},
        ovf: function(){ return [this.a, this.ov];}
    })
    
    Trait('T', [ns.A], {
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


test("Multiple inheritance", 6, function() {
    Trait('A', {
        a: 'a',
        ovf: function(){return 'A'},
        anc_ovf: function(){ return 'anc_A';},
        anc_ovf2: function(){ return 'anc_A_2';}
    })
    Trait('B', {
        b: 'b',
        ovf: function(){return 'B'},
        anc_ovf: function(){ return 'anc_B';},
        anc_ovf2: function(){ return 'anc_B_2';}
    })
    Trait('C', {
        c: 'c',
        anc_ovf: function(){ return 'anc_C';}
    })
    Trait('T', [ns.A, ns.B, ns.C], {
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
test("Inheritance transitive law, inheritance no-array syntax", 4, function() {
    Trait('A', {
        a: 'a',
        ovf: function(){return 'A'},
        anc_ovf: function(){ return 'anc_A';}
    })
    Trait('B', [ns.A], {
        b: 'b',
        ovf: function(){return 'B'},
        anc_ovf: function(){ return 'anc_B';}
    })
    Trait('T', [ns.B], {
        ovf: function(){ return 'T';}
    })
    eq(ns.T.a, 'a', 'inherited variable')
    eq(ns.T.b, 'b', 'inherited variable 2')

    eq(ns.T.ovf(), 'T', 'Overriden ovf() -> T.ovf()')
    eq(ns.T.anc_ovf(), 'anc_B', 'Inheritance override stack: last override happened in B')
});
//========================================================================================================================
//================================================== Classes =============================================================
//========================================================================================================================
module("Basic Class operations", default_up_down);

test("Object members should not become class members", 2, function() {
    Class('T', {
        a: 5,
        f: function(){return this.a}
    })
    
    ste(ns.T.f, undefined)
    ste(ns.T.a, undefined)

});

test("Simple instantiation", 1, function() {
    Class('T', {
        a: 5,
        f: function(){return this.a}
    })
	var t = new ns.T()
    
    eq(t.f(), 5, 'member call')
});

test("Constructor manual setup", 1, function() {
    Class('T', {
        _: function(num){this.num = num},
        a: "zz",
        f: function(){return this.a + this.num}
    })
    
    var t = new ns.T("xx")
    
	ste(t.f(), "zzxx", 'member call')
});

//========================================================================================================================
module("Class inheritance", default_up_down);

test("Example from my-class (http://myjs.fr/my-class/) - NO INFINITE RECURSION!", 1, function() {
    Class('Person', {
        _: function(name){this.name=name}
    })

    Class('Dreamer', ns.Person, {
        _: function(name, dream){
                this.$Dreamer(name)
                this.dream = dream
        }
    })

    Class('Nightmarer', ns.Dreamer, {
        _: function(name, dream){
            this.$Nightmarer(name, dream)
            this.field = "OK!" //control flow should be reached and field created
        },
        test: function(){ return this.field + "-" + this.name + "-" + this.dream}

    })

    var nm = new ns.Nightmarer("Lissa", "Pie")
    
    ste(nm.test(), "OK!-Lissa-Pie", "test to not go into infinite recursion!")
})


/*
test("Single inheritance", 15, function() {
    Trait(ns, 'A', {
        a: 'a',
        ov: 'ov',
        af: function(){return [this.a, this.ov]},
        ovf: function(){ return [this.a, this.ov];}
    })
    Trait(ns, 'T', ns.A, {
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


test("Multiple inheritance", 6, function() {
    Trait(ns, 'A', {
        a: 'a',
        ovf: function(){return 'A'},
        anc_ovf: function(){ return 'anc_A';},
        anc_ovf2: function(){ return 'anc_A_2';}
    })
    Trait(ns, 'B', {
        b: 'b',
        ovf: function(){return 'B'},
        anc_ovf: function(){ return 'anc_B';},
        anc_ovf2: function(){ return 'anc_B_2';}
    })
    Trait(ns, 'C', {
        c: 'c',
        anc_ovf: function(){ return 'anc_C';}
    })
    Trait(ns, 'T', [ns.A, ns.B, ns.C], {
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
test("Inheritance transitive law, inheritance no-array syntax", 4, function() {
    Trait(ns, 'A', {
        a: 'a',
        ovf: function(){return 'A'},
        anc_ovf: function(){ return 'anc_A';}
    })
    Trait(ns, 'B', ns.A, {
        b: 'b',
        ovf: function(){return 'B'},
        anc_ovf: function(){ return 'anc_B';}
    })
    Trait(ns, 'T', ns.B, {
        ovf: function(){ return 'T';}
    })
    eq(ns.T.a, 'a', 'inherited variable')
    eq(ns.T.b, 'b', 'inherited variable 2')

    eq(ns.T.ovf(), 'T', 'Overriden ovf() -> T.ovf()')
    eq(ns.T.anc_ovf(), 'anc_B', 'Inheritance override stack: last override happened in B')
});*/
//========================================================================================================================
//========================================================================================================================
//========================================================================================================================
//========================================================================================================================
//========================================================================================================================
//========================================================================================================================
//========================================================================================================================
//========================================================================================================================






