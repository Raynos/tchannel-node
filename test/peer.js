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

var allocCluster = require('./lib/alloc-cluster.js');

allocCluster.test('peer should use the identified connection', {
    numPeers: 2
}, function t(cluster, assert) {
    var server = cluster.channels[0];
    var client = cluster.channels[1];
    var serverHost = cluster.hosts[0];

    server.makeSubChannel({
        serviceName: 'server'
    });

    var subClient = client.makeSubChannel({
        serviceName: 'server',
        peers: [server.hostPort]
    });

    client.waitForIdentified({
        host: serverHost
    }, onIdentified);

    function onIdentified(err) {
        if (err) {
            return assert.end(err);
        }

        var peer = subClient.peers.get(serverHost);

        var socket = peer.makeOutSocket();
        var conn = peer.makeOutConnection(socket);
        peer.addConnection(conn);
        assert.doesNotThrow(
            function noThrow() {
                peer.request({hasNoParent: true});
            },
            'should use the identified connection'
        );

        client.close();
        server.close();
        assert.end();
    }
});
