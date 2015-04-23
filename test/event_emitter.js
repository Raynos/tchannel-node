// Copyright (c) 2015 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

'use strict';

var test = require('tape');
var EventEmitter = require('../lib/event_emitter');
var inherits = require('util').inherits;

function Foo() {
    EventEmitter.call(this);
    this.errorEvent = this.defineEvent('error');
    this.fooEvent = this.defineEvent('foo');
    this.barEvent = this.defineEvent('bar');
}

inherits(Foo, EventEmitter);

test('classic on works', function t(assert) {
    var fooCalled = null;
    var errCalled = null;
    var f = new Foo();

    f.on('error', function(err) {
        assert.deepEqual(this, f, 'expected context');
        errCalled = err;
    });

    f.on('foo', function(arg) {
        assert.deepEqual(this, f, 'expected context');
        fooCalled = arg;
    });

    f.emit('foo', 'abc');
    assert.deepEqual(errCalled, null, 'expected no err');
    assert.deepEqual(fooCalled, 'abc', 'expected arg');

    fooCalled = errCalled = null;
    var err = new Error('ERR');
    f.emit('error', err);
    assert.deepEqual(errCalled, err, 'expected err');
    assert.deepEqual(fooCalled, null, 'expected no arg');

    assert.end();
});

test('classic once works', function t(assert) {
    var fooCalled = [];
    var f = new Foo();

    f.once('foo', function(arg) {
        assert.deepEqual(this, f, 'expected context');
        fooCalled.push(arg);
    });

    f.emit('foo', 'abc');
    f.emit('foo', '123');
    assert.deepEqual(fooCalled.length, 1, 'expected only one');
    assert.deepEqual(fooCalled[0], 'abc', 'expected arg');

    assert.end();
});

test('default error behavior', function t(assert) {
    var f = new Foo();
    assert.throws(function() {
        f.emit('error', new Error('ERR'));
    }, /ERR/);
    assert.end();
});

test('once works in combination', function t(assert) {
    var f = new Foo();

    var fooCalled = [];
    f.once('foo', function(arg) {
        fooCalled.push(arg);
    });
    f.on('foo', function(arg) {
        fooCalled.push(arg);
    });
    f.emit('foo', 'abc');
    f.emit('foo', '123');
    assert.deepEqual(fooCalled, ['abc', 'abc', '123'], 'expected arg');

    var barCalled = [];
    f.on('bar', function(arg) {
        barCalled.push(arg);
    });
    f.once('bar', function(arg) {
        barCalled.push(arg);
    });
    f.emit('bar', 'abc');
    f.emit('bar', '123');
    assert.deepEqual(barCalled, ['abc', 'abc', '123'], 'expected arg');

    assert.end();
});
