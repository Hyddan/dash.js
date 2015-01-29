/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2015, Arkena.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Arkena nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

MediaPlayer.models.ProtectionModel_28Aug2014 = function () {
    var self = null,
            videoElement = null,
            mediaKeys = null,
            mediaKeysPromise = null,
            api = null,
            sessions = [],
            eventHandler = null,

            createEventHandler = function() {
                return {
                    handleEvent: function(event) {
                        switch (event.type) {
                            case api.needkey:
                                self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_NEED_KEY,
                                    new MediaPlayer.vo.protection.NeedKey(event.initData));
                                break;
                        }
                    }
                };
            },

            createSessionToken = function(keySession, initData) {
                return {
                    prototype: (new MediaPlayer.models.SessionToken()).prototype,
                    session: keySession,
                    sessionID: keySession.sessionId,
                    initData: initData,

                    handleEvent: function(event) {
                        switch (event.type) {
                            case api.message:
                                self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_MESSAGE,
                                        new MediaPlayer.vo.protection.KeyMessage(this, event.message, event.destinationURL));
                                break;
                        }
                    }
                };
            };

    return {
        system: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,
        keySystem: null,

        setup: function() {
            eventHandler = createEventHandler.call(this);
        },

        init: function() {
            self = this;
            api = MediaPlayer.models.ProtectionModel_28Aug2014.detect(document.createElement('video'));
        },

        teardown: function() {
            if (videoElement) {
                videoElement.removeEventListener(api.needkey, eventHandler);
            }
            for (var i = 0; i < sessions.length; i++) {
                this.closeKeySession(sessions[i]);
            }
        },

        isSupported: function(keySystem, contentType) {
            //jshint unused:false
            return window[api.MediaKeys].isTypeSupported(keySystem.systemString);
        },

        selectKeySystem: function(keySystem) {
            this.keySystem = keySystem;
            mediaKeysPromise = window[api.MediaKeys].create(this.keySystem.systemString);
        },

        setMediaElement: function(mediaElement) {
            if (videoElement) {
                videoElement.removeEventListener(api.needkey, eventHandler().bind(this));
            }
            videoElement = mediaElement;
            videoElement.addEventListener(api.needkey, eventHandler);
            if (mediaKeys) {
                videoElement[api.setMediaKeys](mediaKeys);
            }
        },

        createKeySession: function(initData, contentType, initDataType) {
            //jshint unused:false
            if (!this.keySystem || (!mediaKeys && !mediaKeysPromise)) {
                throw new Error('Can not create sessions until you have selected a key system');
            }

            mediaKeysPromise.then(function (_mediaKeys) {
                var session = null,
                        sessionToken = null;

                mediaKeysPromise = null;
                mediaKeys = _mediaKeys;

                if (videoElement) {
                    videoElement[api.setMediaKeys](mediaKeys).then(function () {
                        session = mediaKeys.createSession();
                        sessionToken = createSessionToken.call(this, session, initData);

                        session.addEventListener(api.error, sessionToken);
                        session.addEventListener(api.message, sessionToken);
                        session.addEventListener(api.ready, sessionToken);
                        session.addEventListener(api.close, sessionToken);

                        sessions.push(sessionToken);
                        
                        session[api.generateRequest]('cenc', initData).then(function (obj) {
                            sessionToken.sessionID = session.sessionId;
                        }).catch(function (obj){
                            self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ERROR,
                                    new MediaPlayer.vo.protection.KeyError(sessionToken, 'Failed to create keySession'));
                        });
                    });
                }
            });
        },

        updateKeySession: function (sessionToken, message) {
            sessionToken.session[api.update](message);
        },

        closeKeySession: function(sessionToken) {
            var session = sessionToken.session;

            session.removeEventListener(api.error, sessionToken);
            session.removeEventListener(api.message, sessionToken);
            session.removeEventListener(api.ready, sessionToken);
            session.removeEventListener(api.close, sessionToken);

            for (var i = 0; i < sessions.length; i++) {
                if (sessions[i] === sessionToken) {
                    sessions.splice(i, 1);
                    break;
                }
            }

            session[api.release]();
        }
    };
};

// Defines the supported 28Aug2014 API variations
MediaPlayer.models.ProtectionModel_28Aug2014.APIs = [
    {
        // Video Element
        setMediaKeys: 'setMediaKeys',

        // MediaKeys
        MediaKeys: 'MediaKeys',

        // MediaKeySession
        generateRequest: 'generateRequest',
        release: 'release',
        update: 'update',

        // Events
        needkey: 'needkey',
        message: 'message'
    }
];

/**
 * Detects presence of EME v28Aug2014 APIs
 *
 * @param videoElement {HTMLMediaElement} the media element that will be
 * used for detecting APIs
 * @returns an API object that is used when initializing the ProtectionModel
 * instance
 */
MediaPlayer.models.ProtectionModel_28Aug2014.detect = function(videoElement) {
    var apis = MediaPlayer.models.ProtectionModel_28Aug2014.APIs;
    for (var i = 0; i < apis.length; i++) {
        var api = apis[i];
        if ('function' !== typeof (videoElement[api.setMediaKeys]) || 'function' !== typeof (window[api.MediaKeys]) || !('create' in window[api.MediaKeys])) {
            continue;
        }
        
        return api;
    }

    return null;
};

MediaPlayer.models.ProtectionModel_28Aug2014.prototype = {
    constructor: MediaPlayer.models.ProtectionModel_28Aug2014
};