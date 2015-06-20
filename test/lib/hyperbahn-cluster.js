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

var tape = require('tape');
var tapeCluster = require('tape-cluster');

var RelayNetwork = require('./relay_network.js');

HyperbahnCluster.test = tapeCluster(tape, HyperbahnCluster);

// TODO merge RelayNetwork into this
module.exports = HyperbahnCluster;

/*  This class is just to have the same interface as the
    hyperbahn cluster for sharing tests between tchannel
    and hyperbahn.

    cluster: {
        remotes: {
            steve: TChannel,
            bob: TChannel
        },
        logger: Logger,
        hostPortList: Array<String>,
        apps: Array<HyperbahnApps>
    }

*/
function HyperbahnCluster(options) {
    if (!(this instanceof HyperbahnCluster)) {
        return new HyperbahnCluster(options);
    }

    var self = this;

    self.size = options.size;

    self.relayNetwork = RelayNetwork({
        numRelays: self.size,
        numInstancesPerService: 1,
        kValue: 5,
        serviceNames: ['bob', 'steve', 'mary'],
        cluster: options.cluster
    });

    self.remotes = {};
    self.apps = null;
    self.logger = null;
    self.hostPortList = null;
}

HyperbahnCluster.prototype.bootstrap = function bootstrap(cb) {
    var self = this;

    self.relayNetwork.bootstrap(onBootstrap);

    function onBootstrap(err) {
        if (err) {
            return cb(err);
        }

        var relayNetwork = self.relayNetwork;
        self.logger = self.relayNetwork.cluster.logger;

        self.hostPortList = relayNetwork.relayChannels.map(function p(c) {
            return c.hostPort;
        });
        self.apps = relayNetwork.relayChannels.map(function p(channel, index) {
            return HyperbahnApp({
                relayChannel: channel,
                egressNodes: relayNetwork.egressNodesForRelay[index]
            });
        });

        self.remotes.steve = HyperbahnRemote({
            subChannel: relayNetwork.subChannelsByName.steve[0],
            hostPortList: self.hostPortList
        });
        self.remotes.bob = HyperbahnRemote({
            subChannel: relayNetwork.subChannelsByName.bob[0],
            hostPortList: self.hostPortList
        });

        cb();
    }
};

HyperbahnCluster.prototype.checkExitPeers =
function checkExitPeers(assert, options) {
    // TODO implement
};

HyperbahnCluster.prototype.close = function close(cb) {
    var self = this;

    self.relayNetwork.close(cb);
};

function HyperbahnApp(opts) {
    if (!(this instanceof HyperbahnApp)) {
        return new HyperbahnApp(opts);
    }

    var self = this;

    self.relayChannel = opts.relayChannel;
    self.egressNodes = opts.egressNodes;
    self.hostPort = self.relayChannel.hostPort;
}

HyperbahnApp.prototype.exitsFor = function exitsFor(serviceName) {
    var self = this;

    return self.egressNodes.exitsFor(serviceName);
};

HyperbahnApp.prototype.destroy = function destroy() {
    var self = this;

    self.relayChannel.close();
};

function HyperbahnRemote(opts) {
    if (!(this instanceof HyperbahnRemote)) {
        return new HyperbahnRemote(opts);
    }

    var self = this;

    self.serviceName = opts.subChannel.serviceName;
    self.channel = opts.subChannel.topChannel;
    self.clientChannel = self.channel.makeSubChannel({
        serviceName: 'autobahn-client',
        peers: opts.hostPortList,
        requestDefaults: {
            hasNoParent: true,
            headers: {
                as: 'raw',
                cn: self.serviceName
            }
        }
    });
    self.serverChannel = opts.subChannel;

    self.serverChannel.register('echo', echo);

    function echo(req, res, a, b) {
        res.headers.as = 'raw';
        res.sendOk(String(a), String(b));
    }
}