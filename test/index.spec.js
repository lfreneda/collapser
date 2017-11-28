'use strict';

var assert = require('chai').assert;
var collapse = require('./../src/index');

describe('lib/collapse', function () {

    describe('lib/collapse original tests cases', function () {

        it('should return empty if given empty', function () {
            assert.deepEqual([], collapse([]));
        });

        it('should collapse simple tree structures', function () {
            var rows = [
                {'this.id': 1, 'this.val': 'p1', 'this.children[].id': 11, 'this.children[].val': 'c1'},
                {'this.id': 1, 'this.val': 'p1', 'this.children[].id': 12, 'this.children[].val': 'c2'}
            ];

            var result = collapse(rows);

            var expectedResult = [{id: 1, val: 'p1', children: [{id: 11, val: 'c1'}, {id: 12, val: 'c2'}]}];
            assert.deepEqual(result, expectedResult);
        });

        it('should sort children if an option is specified', function () {
            var rows = [
                {'this.id': 1, 'this.val': 'p1', 'this.children[].id': 11, 'this.children[].val': 'c2'},
                {'this.id': 1, 'this.val': 'p1', 'this.children[].id': 12, 'this.children[].val': 'c1'}
            ];

            var result = collapse(rows);
            var expectedResult = [{id: 1, val: 'p1', children: [{id: 11, val: 'c2'}, {id: 12, val: 'c1'}]}];
            assert.deepEqual(result, expectedResult);
        });


        it('should collapse multiple children with the same parent', function () {

            var rows = [
                {
                    'this.id': 1,
                    'this.val': 'p1',
                    'this.children1[].id': 11,
                    'this.children1[].val': 'c1',
                    'this.children2[].id': 21,
                    'this.children2[].val': 'd1'
                },
                {
                    'this.id': 1,
                    'this.val': 'p1',
                    'this.children1[].id': 12,
                    'this.children1[].val': 'c2',
                    'this.children2[].id': 22,
                    'this.children2[].val': 'd2'
                },
                {
                    'this.id': 1,
                    'this.val': 'p1',
                    'this.children1[].id': 12,
                    'this.children1[].val': 'c2',
                    'this.children2[].id': 23,
                    'this.children2[].val': 'd3'
                }
            ];

            var result = collapse(rows);
            var expectedResult = [{
                id: 1,
                val: 'p1',
                children1: [{id: 11, val: 'c1'}, {id: 12, val: 'c2'}],
                children2: [{id: 21, val: 'd1'}, {id: 22, val: 'd2'}, {id: 23, val: 'd3'}]
            }];

            assert.deepEqual(result, expectedResult);
        });

        it('should collapse children into other children', function () {

            var rows = [
                {
                    'this.id': 1,
                    'this.val': 'p1',
                    'this.children1[].id': 11,
                    'this.children1[].val': 'c1',
                    'this.children1[].children2[].id': 21,
                    'this.children1[].children2[].val': 'd1'
                },
                {
                    'this.id': 1,
                    'this.val': 'p1',
                    'this.children1[].id': 12,
                    'this.children1[].val': 'c2',
                    'this.children1[].children2[].id': 22,
                    'this.children1[].children2[].val': 'd2'
                },
                {
                    'this.id': 1,
                    'this.val': 'p1',
                    'this.children1[].id': 12,
                    'this.children1[].val': 'c2',
                    'this.children1[].children2[].id': 23,
                    'this.children1[].children2[].val': 'd3'
                }
            ];

            var result = collapse(rows);
            var expectedResult = [{
                id: 1,
                val: 'p1',
                children1: [{
                    id: 11,
                    val: 'c1',
                    children2: [{id: 21, val: 'd1'}]
                }, {
                    id: 12,
                    val: 'c2',
                    children2: [{id: 22, val: 'd2'}, {id: 23, val: 'd3'}]
                }]
            }];
            assert.deepEqual(result, expectedResult);
        });


        it('should create empty child arrays if given null children from outer joins', function () {
            var rows = [
                {'this.id': 1, 'this.val': 'p1', 'this.children[].id': null, 'this.children[].val': null},
                {'this.id': 2, 'this.val': 'p2', 'this.children[].id': 11, 'this.children[].val': 'c1'}
            ];

            var result = collapse(rows);
            var expetedResult = [{id: 1, val: 'p1', children: []}, {id: 2, val: 'p2', children: [{id: 11, val: 'c1'}]}];
            assert.deepEqual(result, expetedResult);
        });


        it('should collapse 1:1 relations', function () {
            var rows = [
                {'this.id': 1, 'this.val': 'p1', 'this.child.id': 11, 'this.child.val': 'c1'}
            ];

            var result = collapse(rows);
            var expectedResult = [{id: 1, val: 'p1', child: {id: 11, val: 'c1'}}];
            assert.deepEqual(result, expectedResult);
        });

        it('should collapse 1:1 relations with null value', function () {
            var rows = [
                {'this.id': 1, 'this.val': 'p1', 'this.child.id': 11, 'this.child.val': 'c1'},
                {'this.id': 2, 'this.val': 'p2', 'this.child.id': null, 'this.child.val': null},
                {'this.id': 3, 'this.val': 'p3', 'this.child.id': 12, 'this.child.val': 'c2'}
            ];

            var result = collapse(rows);
            var expectedResult = [
                {id: 1, val: 'p1', child: {id: 11, val: 'c1'}},
                {id: 2, val: 'p2', child: null},
                {id: 3, val: 'p3', child: {id: 12, val: 'c2'}}
            ];
            assert.deepEqual(result, expectedResult);
        });

        it('should collapse with duplicated rows', function () {

            // this dataset is 'bad' in that you're not usually going to see 100% duplicate rows unless you've really screwed up
            // but it's more legible than reproducing the 'multiple children' data and tests the deduplication just the same
            var rows = [
                {'this.id': 1, 'this.val': 'p1', 'this.children[].id': 11, 'this.children[].val': 'c1'},
                {
                    'this.id': 1,
                    'this.val': 'p1',
                    'this.children[].id': 12,
                    'this.children[].val': 'c2'
                }, /* <---- duplicated row */
                {
                    'this.id': 1,
                    'this.val': 'p1',
                    'this.children[].id': 12,
                    'this.children[].val': 'c2'
                }  /* <---- duplicated row */
            ];

            var result = collapse(rows);
            var expectedResult = [{id: 1, val: 'p1', children: [{id: 11, val: 'c1'}, {id: 12, val: 'c2'}]}];
            assert.deepEqual(result, expectedResult);
        });

        it('should apply new parents only in the correct scope', function () {

            var rows = [

                {
                    'this.id': 1,
                    'this.account.id': 1,
                    'this.name': 'Eduardo Luiz',
                    'this.contact.email': 'email',
                    'this.contact.phone': 'phone',
                    'this.notes': null,
                    'this.archived': false,
                    'this.address.zipCode': 'zip',
                    'this.address.street': 'street',
                    'this.address.number': 'number',
                    'this.address.complement': null,
                    'this.address.neighborhood': null,
                    'this.address.city': 'Sao Paulo',
                    'this.address.state': 'Sao Paulo',
                    'this.address.coords.latitude': '1',
                    'this.address.coords.longitude': '2',
                    'this.labels[].id': '297726d0-301d-4de6-b9a4-e439b81f44ba',
                    'this.labels[].name': 'Contrato',
                    'this.labels[].color': 'yellow',
                    'this.labels[].type': 1
                },
                {
                    'this.id': 1,
                    'this.account.id': 1,
                    'this.name': 'Eduardo Luiz',
                    'this.contact.email': 'email',
                    'this.contact.phone': 'phone',
                    'this.notes': null,
                    'this.archived': false,
                    'this.address.zipCode': 'zip',
                    'this.address.street': 'street',
                    'this.address.number': 'number',
                    'this.address.complement': null,
                    'this.address.neighborhood': null,
                    'this.address.city': 'Sao Paulo',
                    'this.address.state': 'Sao Paulo',
                    'this.address.coords.latitude': '1',
                    'this.address.coords.longitude': '2',
                    'this.labels[].id': '1db6e07f-91e2-42fb-b65c-9a364b6bad4c',
                    'this.labels[].name': 'Particular',
                    'this.labels[].color': 'purple',
                    'this.labels[].type': 1
                }
            ];

            var result = collapse(rows);
            var expectedResult = [{
                'id': 1,
                'account': {
                    'id': 1
                },
                'name': 'Eduardo Luiz',
                'contact': {
                    'email': 'email',
                    'phone': 'phone'
                },
                'notes': null,
                'archived': false,
                'address': {
                    'zipCode': 'zip',
                    'street': 'street',
                    'number': 'number',
                    'complement': null,
                    'neighborhood': null,
                    'city': 'Sao Paulo',
                    'state': 'Sao Paulo',
                    'coords': {
                        'latitude': '1',
                        'longitude': '2'
                    }
                },
                'labels': [
                    {
                        'id': '297726d0-301d-4de6-b9a4-e439b81f44ba',
                        'name': 'Contrato',
                        'color': 'yellow',
                        'type': 1
                    }, {
                        'id': '1db6e07f-91e2-42fb-b65c-9a364b6bad4c',
                        'name': 'Particular',
                        'color': 'purple',
                        'type': 1
                    }
                ]
            }];
            assert.deepEqual(result, expectedResult);
        });

    });

    describe('real life scenarios', function () {

        it('should collapse two tasks', function () {
            var rows = [
                {'this.id': 1, 'this.todo': 'do task 1'},
                {'this.id': 2, 'this.todo': 'do task 2'}
            ];

            var result = collapse(rows);
            var expectedResult = [
                {id: 1, todo: 'do task 1'},
                {id: 2, todo: 'do task 2'}
            ];
            assert.deepEqual(result, expectedResult);
        });

        it('should collapse two tasks with simple customers', function () {

            var rows = [
                {'this.id': 1, 'this.todo': 'do task 1', 'this.customer.id': 3, 'this.customer.name': 'Luiz'},
                {'this.id': 2, 'this.todo': 'do task 2', 'this.customer.id': 4, 'this.customer.name': 'Felipe'}
            ];

            var result = collapse(rows);
            var expectedResult = [
                {id: 1, todo: 'do task 1', customer: {id: 3, name: 'Luiz'}},
                {id: 2, todo: 'do task 2', customer: {id: 4, name: 'Felipe'}}
            ];
            assert.deepEqual(result, expectedResult);
        });

        it('should collapse two tasks with customers and its address', function () {

            var rows = [
                {
                    'this.id': 1,
                    'this.todo': 'do task 1',
                    'this.customer.id': 3,
                    'this.customer.name': 'Luiz',
                    'this.customer.address.street': 'Rua dos Pinheiros 383',
                    'this.customer.address.coords.latitude': -1,
                    'this.customer.address.coords.longitude': -2
                },
                {
                    'this.id': 2,
                    'this.todo': 'do task 2',
                    'this.customer.id': 4,
                    'this.customer.name': 'Felipe',
                    'this.customer.address.street': 'Avenida Rebouças 130',
                    'this.customer.address.coords.latitude': -3,
                    'this.customer.address.coords.longitude': -5
                }
            ];

            var result = collapse(rows);
            var expectedResult = [
                {
                    id: 1,
                    todo: 'do task 1',
                    customer: {
                        id: 3,
                        name: 'Luiz',
                        address: {street: 'Rua dos Pinheiros 383', coords: {latitude: -1, longitude: -2}}
                    }
                },
                {
                    id: 2,
                    todo: 'do task 2',
                    customer: {
                        id: 4,
                        name: 'Felipe',
                        address: {street: 'Avenida Rebouças 130', coords: {latitude: -3, longitude: -5}}
                    }
                }
            ];
            assert.deepEqual(result, expectedResult);
        });

        it('should collapse a complete customer with address and labels', function () {

            var rows = [
                {
                    "this.id": 1,
                    "this.name": "Eduardo Luiz",
                    "this.account.id": 1,
                    "this.contact.email": "eduardoluizsantos@gmail.com",
                    "this.contact.phone": "11965874523",
                    "this.notes": null,
                    "this.archived": false,
                    "this.address.zipCode": "05422010",
                    "this.address.street": "Rua dos Pinheiros",
                    "this.address.number": "383",
                    "this.address.complement": null,
                    "this.address.neighborhood": null,
                    "this.address.city": "Sao Paulo",
                    "this.address.state": "Sao Paulo",
                    "this.address.coords.latitude": "1",
                    "this.address.coords.longitude": "2",
                    "this.labels[].id": "297726d0-301d-4de6-b9a4-e439b81f44ba",
                    "this.labels[].name": "Contrato",
                    "this.labels[].color": "yellow",
                    "this.labels[].type": 1
                },
                {
                    "this.id": 1,
                    "this.account.id": 1,
                    "this.name": "Eduardo Luiz",
                    "this.contact.email": "eduardoluizsantos@gmail.com",
                    "this.contact.phone": "11965874523",
                    "this.notes": null,
                    "this.archived": false,
                    "this.address.zipCode": "05422010",
                    "this.address.street": "Rua dos Pinheiros",
                    "this.address.number": "383",
                    "this.address.complement": null,
                    "this.address.neighborhood": null,
                    "this.address.city": "Sao Paulo",
                    "this.address.state": "Sao Paulo",
                    "this.address.coords.latitude": "1",
                    "this.address.coords.longitude": "2",
                    "this.labels[].id": "1db6e07f-91e2-42fb-b65c-9a364b6bad4c",
                    "this.labels[].name": "Particular",
                    "this.labels[].color": "purple",
                    "this.labels[].type": 1
                }
            ];

            var result = collapse(rows);
            var expectedResult = [
                {
                    "id": 1,
                    "account": {
                        "id": 1
                    },
                    "name": "Eduardo Luiz",
                    "contact": {
                        "email": "eduardoluizsantos@gmail.com",
                        "phone": "11965874523"
                    },
                    "notes": null,
                    "archived": false,
                    "address": {
                        "zipCode": "05422010",
                        "street": "Rua dos Pinheiros",
                        "number": "383",
                        "complement": null,
                        "neighborhood": null,
                        "city": "Sao Paulo",
                        "state": "Sao Paulo",
                        "coords": {
                            "latitude": "1",
                            "longitude": "2"
                        }
                    },
                    "labels": [
                        {
                            "id": "297726d0-301d-4de6-b9a4-e439b81f44ba",
                            "name": "Contrato",
                            "color": "yellow",
                            "type": 1
                        },
                        {
                            "id": "1db6e07f-91e2-42fb-b65c-9a364b6bad4c",
                            "name": "Particular",
                            "color": "purple",
                            "type": 1
                        }
                    ]
                }
            ];
            assert.deepEqual(result, expectedResult);
        });

        it('should collapse a complete form with questions and options', function () {
            var rows = [
                {
                    "this.id": "528ad1ca-c889-46f0-b044-689e0986dab2",
                    "this.name": "Formulário",
                    "this.questions[].id": "acf9af3f-f0ce-4ac9-93c2-c18e06d887ca",
                    "this.questions[].type": 6,
                    "this.questions[].title": "Qual alimento pode ser ser transformado em código?",
                    "this.questions[].required": false,
                    "this.questions[].position": 7,
                    "this.questions[].options[].id": "a",
                    "this.questions[].options[].value": "Carne Completo",
                    "this.questions[].options[].position": 1
                },
                {
                    "this.id": "528ad1ca-c889-46f0-b044-689e0986dab2",
                    "this.name": "Formulário",
                    "this.questions[].id": "acf9af3f-f0ce-4ac9-93c2-c18e06d887ca",
                    "this.questions[].type": 6,
                    "this.questions[].title": "Qual alimento pode ser ser transformado em código?",
                    "this.questions[].required": false,
                    "this.questions[].position": 7,
                    "this.questions[].options[].id": "b",
                    "this.questions[].options[].value": "Café",
                    "this.questions[].options[].position": 2
                }
            ];

            var result = collapse(rows);
            var expectedResult = [{
                "id": '528ad1ca-c889-46f0-b044-689e0986dab2',
                "name": 'Formulário',
                "questions": [{
                    "id": 'acf9af3f-f0ce-4ac9-93c2-c18e06d887ca',
                    "type": 6,
                    "title": 'Qual alimento pode ser ser transformado em código?',
                    "required": false,
                    "position": 7,
                    "options": [
                        {
                            "id": 'a',
                            "value": "Carne Completo",
                            "position": 1
                        },
                        {
                            "id": 'b',
                            "value": "Café",
                            "position": 2
                        }
                    ]
                }]
            }];

            assert.deepEqual(result, expectedResult);
        });

        it('should collapse tasks with orders, customers, address and more relationships', function () {

            var rows = [
                {
                    "this.id": "286c1265-e4e3-46b6-8a98-c96d234f1df4",
                    "this._id": 18,
                    "this.startedAt": null,
                    "this.completedAt": null,
                    "this.status": 0,
                    "this.statusDescription": null,
                    "this.sharedLocationToken": null,
                    "this.description": null,
                    "this.duration": 60,
                    "this.archived": false,
                    "this.position": 1,
                    "this.account.id": 1,
                    "this.order.id": "d7089ad9-5386-4beb-aff2-66509130e56f",
                    "this.employee.id": 4,
                    "this.rating.id": null,
                    "this.scheduling.type": 0,
                    "this.scheduling.date": null,
                    "this.scheduling.time": null,
                    "this.coords.id": "286c1265-e4e3-46b6-8a98-c96d234f1df4",
                    "this.coords.latitude": "-23.573005",
                    "this.coords.longitude": "-46.695866",
                    "this.metadata.createdAt": "2017-11-28T14:42:42.158Z",
                    "this.order._id": null,
                    "this.order.identifier": "order-with-service-2",
                    "this.order.description": null,
                    "this.order.customer.id": 3,
                    "this.order.service.id": 2,
                    "this.order.address.zipCode": "15085480",
                    "this.order.address.street": "Rua dos Pinheiros",
                    "this.order.address.number": "383",
                    "this.order.address.complement": null,
                    "this.order.address.neighborhood": null,
                    "this.order.address.city": "Sao paulo",
                    "this.order.address.state": "SP",
                    "this.order.address.coords.latitude": "-23.573005",
                    "this.order.address.coords.longitude": "-46.695866",
                    "this.order.deadlineAt": null,
                    "this.order.archived": false,
                    "this.order.signature.path": null,
                    "this.order.signature.signedAt": null,
                    "this.order.signature.signedBy": null,
                    "this.order.form.id": null
                }
            ];

            var result = collapse(rows);

            var expectedResult = [
                {
                    "id": "286c1265-e4e3-46b6-8a98-c96d234f1df4",
                    "_id": 18,
                    "startedAt": null,
                    "completedAt": null,
                    "status": 0,
                    "statusDescription": null,
                    "sharedLocationToken": null,
                    "description": null,
                    "duration": 60,
                    "archived": false,
                    "position": 1,
                    "account": {
                        "id": 1
                    },
                    "order": {
                        "id": "d7089ad9-5386-4beb-aff2-66509130e56f",
                        "_id": null,
                        "identifier": "order-with-service-2",
                        "description": null,
                        "deadlineAt": null,
                        "archived": false,
                        "customer": {
                            "id": 3
                        },
                        "service": {
                            "id": 2
                        },
                        "address": {
                            "zipCode": "15085480",
                            "street": "Rua dos Pinheiros",
                            "number": "383",
                            "complement": null,
                            "neighborhood": null,
                            "city": "Sao paulo",
                            "state": "SP",
                            "coords": {
                                "latitude": "-23.573005",
                                "longitude": "-46.695866"
                            }
                        },
                        "signature": {
                            "path": null,
                            "signedAt": null,
                            "signedBy": null
                        },
                        "form": null
                    },
                    "employee": {
                        "id": 4
                    },
                    "rating": null,
                    "scheduling": {
                        "type": 0,
                        "date": null,
                        "time": null
                    },
                    "coords": {
                        "id": "286c1265-e4e3-46b6-8a98-c96d234f1df4",
                        "latitude": "-23.573005",
                        "longitude": "-46.695866"
                    },
                    "metadata": {
                        "createdAt": "2017-11-28T14:42:42.158Z"
                    }
                }
            ];

            assert.deepEqual(result, expectedResult);
        });

    });
});