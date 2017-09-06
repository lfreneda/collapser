'use strict';

if (!String.prototype.endsWith) {
    String.prototype.endsWith = function(searchStr, Position) {
        // This works much better than >= because
        // it compensates for NaN:
        if (!(Position < this.length))
            Position = this.length;
        else
            Position |= 0; // round position
        return this.substr(Position - searchStr.length,
                searchStr.length) === searchStr;
    };
}

if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(searchString, position) {
        position = position || 0;
        return this.indexOf(searchString, position) === position;
    };
}

/**
 * Collapses tabular result sets into a (hierarchical) object graph based on
 * column nomenclature. Given a query that selects parent and child columns as
 * this.id, this.val, this.children.id, this.children.val, this will return an
 * array of objects in the form
 *
 * {id: 1, val: 'parent val', children: [{id: 11, val: 'child val'}]}
 *
 * and so on.
 *
 * @param  {[type]} data    Data to operate on.
 * @return {[type]}         Transformed object graph.
 */
module.exports = function (data) {

    var parent = 'this';
    var pk = 'id';
    var options = {};

    if (!data || data.length === 0) {
        return [];
    }

    // console.log(data);

    /* schemata defines the structural relationships of the entity-models and the fields each model consists of, and maps
     * the final field names to the original columns in the query resultset.
     * example: {id: parent__id, name: parent__name, children: {id: children__id, name: children__name}} */

    var schemata = Object.keys(data[0]).reduce(function (acc, c) {
        var tuple = c.split('.');
        var entity = acc;
        var name;

        do {
            name = tuple.shift();
            if (name !== parent) {

                // avoid creating a parent schema, we want that to be the root
                // this almost certainly does Bad things if the graph is cyclic
                // but fortunately we don't need to worry about that since the
                // column name format can't define a backwards relationship

                if (!entity.hasOwnProperty(name)) {
                    entity[name] = {};
                }
                entity = entity[name];
            }
        } while (tuple.length > 1);	// walk as deep as we need to for child__grandchild__greatgrandchild__fieldname etc
        entity[tuple.pop()] = c;	// set {fieldname: path__to__fieldname} pair

        return acc;
    }, {});

    /* mapping is a nested dictionary of id:entity but otherwise in the form of the final structure we're trying to build,
     * effectively hashing ids to ensure we don't duplicate any entities in cases where multiple dependent tables are
     * joined into the source query.
     *
     * example: {1: {id: 1, name: 'hi', children: {111: {id: 111, name: 'ih'}}} */
    var mapping = data.reduce(function (acc, row) {
        return (function build (obj, schema, parents, name) {

            var opts = options[name] || {};
            //var pkField = 'this.' + name + '.' + (opts.pk || pk);
            var pkField = name + '.' + (opts.pk || pk);

            if (parents.length) {
                pkField = parents.join('.') + '.' + pkField;
                // anything deeper than child.id needs to build the full column name
            }

            if (!pkField.startsWith(parent)) { pkField = parent + '.' + pkField; }

            var id = row[pkField];

            if (id === null) {						// null id means this entity doesn't exist and was likely outer joined in
                return;
            } else if (!obj.hasOwnProperty(id)) {	// this entity is new
                obj[id] = {};
            }

            Object.keys(schema).forEach(function (c) {

                if (typeof schema[c] === 'string') {	// c is a field
                    obj[id][c] = row[schema[c]];
                } else {								// c is a relation
                    if (!obj[id].hasOwnProperty(c)) {
                        obj[id][c] = {};				// current object does not have relation defined, initialize it
                    }

                    // if parent isn't the root schema include that when we recurse, otherwise ignore
                    build(obj[id][c], schema[c], (name !== parent) ? parents.concat([name]): parents, c);
                }

            });

            return obj;
        })(acc, schemata, [], parent);
    }, {});

    /* Build the final graph. The structure and data already exists in mapping, but we need to transform the {id: entity} structures
     * into arrays of entities (or flat objects if required).
     *
     * example: [{id: 1, name: 'hi', children: [{id: 111, name: 'ih'}]}] */
    return (function transform(schema, map, accumulator) {
        // for every id:entity pair in the current level of mapping, if the schema defines any dependent
        // entities recurse and transform them, then push the current object into the accumulator and return
        // console.log('map', map);
        // console.log('accumulator', accumulator);

        return Object.keys(map).reduce(function (acc, k) {

            Object.keys(schema)
                .filter(function (c) { return typeof schema[c] === 'object'; })	// just structure now
                .forEach(function (c) {

                    // we have to init & pass the accumulator into the *next* recursion since the single
                    // option is defined on the child rather than the parent
                    // a property name ending with [] is a array otherwise is a object

                    var isArray = c.endsWith('[]');

                    if (isArray) {

                        map[k][c.replace('[]', '')] = transform(schema[c], map[k][c], []);
                        if (map[k][c]) {
                            // delete original key named with []
                            // for example: delete key named "labels[]"
                            delete map[k][c];
                        }

                    } else {
                        var value = transform(schema[c], map[k][c], {});
                        map[k][c] = Array.isArray(value) ? null : value;
                    }

                    // if (options[c] && options[c].sort) {
                    //     var sort = options[c].sort;
                    //     map[k][c].sort(function (a, b) {
                    //         if (a[sort] > b[sort]) { return 1; }
                    //         else if (a[sort] < b[sort]) { return -1; }
                    //         return 0;
                    //     });
                    // }
                });

            if (Array.isArray(accumulator)) {
                acc.push(map[k]);
            }
            else {
                acc = map[k];
            }

            return acc;

        }, []);

    })(schemata, mapping, []);
};