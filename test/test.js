var ns = {},
    dump = function(data){ return QUnit.jsDump.parse(data)}, //wrapper needed for proper 'this' for jsDump obj
    Class = jassino.Class,
    Trait = jassino.Trait;

//========================================================================================================================
module("Basic definitions")

test("Class and Trait definitions, typeof Class/Trait === function",
        2, //number of asserts those should be executed
        function() {
            strictEqual(typeof Class, "function", 'Class')
            strictEqual(typeof Trait, "function", 'Trait')
        }
);

//========================================================================================================================
module("Namespaces and class/trait creation test", {
    setup: function() {
        ns = {}
        jassino.NS = {}
    },
    teardown: function() {
    }
});

test("Class/Trait creation - default namespace", 2, function() {
    var A = Class('A', {})
    var T = Trait('T', {})
    strictEqual(A, jassino.NS.A, 'for Class')
    strictEqual(T, jassino.NS.T, 'for Trait')
});

test("Class/Trait creation -> ns(ns)", 2, function() {
    var A = Class(ns, 'A', {})
    var T = Trait(ns, 'T', {})
    strictEqual(A, ns.A, 'for Class')
    strictEqual(T, ns.T, 'for Trait')
});

test("Duplicate Class/Trait creation)", 2, function() {
    Class(ns, 'A', {})
    raises(function(){Class(ns, 'A', {})}, jassino.DuplicationError, 'for Class: ' + dump(ns))
    Trait(ns, 'T', {})
    raises(function(){Trait(ns, 'T', {})}, jassino.DuplicationError, 'for Trait')
});

test("Duplicate Class/Trait creation - default NS)", 2, function() {
    Class('A', {})
    raises(function(){Class('A', {})}, jassino.DuplicationError, 'for Class: ' + dump(ns))
    Trait('T', {})
    raises(function(){Trait('T', {})}, jassino.DuplicationError, 'for Trait')
});

test("Invalid namespace object test on Class/Trait creation)", 2, function() {
    raises(function(){Class(null, 'A', {})}, jassino.InvalidNamespaceError, 'for Class')
    raises(function(){Trait(null, 'T', {})}, jassino.InvalidNamespaceError, 'for Trait')
});

//========================================================================================================================
module("Basic Trait operations")

test("Class", function() {
    var Tr = Trait('Tr')
	ok(true);
});

//-------------------------------------
module("Class test", {
	setup: function() {
		Class()
	},
	teardown: function() {
		ok(true);
	}
});

test("module with setup/teardown", function() {
	expect(3);
	ok(true);
});







