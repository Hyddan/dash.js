/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
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

MediaPlayer.dependencies.protection.KeySystem_ClearKey = function() {
    "use strict";

    var keySystemStr = "org.w3.clearkey",
            keySystemUUID = "1077efec-c0b2-4d02-ace3-3c1e52e2fb4b",
            _protectionData = {
                licenseRequest: {
                    cdmData: null,
                    laUrl: null,
                    headers: null,
                    clearKeys: null
                }
            },

            /**
             * Request a ClearKey license using PSSH-based message format that allows
             * multiple methodologies for retrieving/storing key information
             *
             * @param message the ClearKey PSSH
             * @param requestData request data to be passed back in the LicenseRequestComplete event
             */
            requestLicense = function(event) {
                var self = this,
                        keyMessageEvent = event,
                        laUrl = self.laUrl() || keyMessageEvent.defaultURL,
                        i;
            
                var jsonMsg = JSON.parse(String.fromCharCode.apply(null, new Uint8Array(keyMessageEvent.message)));
            
                /* Retrieve keys from remote server */
                if (laUrl) {
            
                    // Build query string
                    laUrl += "/?";
                    for (i = 0; i < jsonMsg.kids.length; i++) {
                        laUrl += jsonMsg.kids[i] + "&";
                    }
                    laUrl = laUrl.substring(0, laUrl.length-1);
            
                    var xhr = new XMLHttpRequest();
                    xhr.onload = function () {
                        if (xhr.status == 200) {
            
                            if (!xhr.response.hasOwnProperty("keys")) {
                                self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE,
                                        null, new Error('DRM: ClearKey Remote update, Illegal response JSON'));
                            }
                            for (i = 0; i < xhr.response.keys.length; i++) {
                                var keypair = xhr.response.keys[i],
                                        keyid = keypair.kid.replace(/=/g, "");
                                        key = keypair.k.replace(/=/g, "");
                                keyPairs.push(new MediaPlayer.vo.protection.KeyPair(keyid, key));
                            }
                            var event = new MediaPlayer.vo.protection.LicenseRequestComplete(new MediaPlayer.vo.protection.ClearKeyKeySet(keyPairs), keyMessageEvent.sessionToken);
                            self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE,
                                    event);
                        } else {
                            self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE,
                                    null, new Error('DRM: ClearKey Remote update, XHR aborted. status is "' + xhr.statusText + '" (' + xhr.status + '), readyState is ' + xhr.readyState));
                        }
                    };
                    xhr.onabort = function () {
                        self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE,
                                null, new Error('DRM: ClearKey update, XHR aborted. status is "' + xhr.statusText + '" (' + xhr.status + '), readyState is ' + xhr.readyState));
                    };
                    xhr.onerror = function () {
                        self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE,
                                null, new Error('DRM: ClearKey update, XHR error. status is "' + xhr.statusText + '" (' + xhr.status + '), readyState is ' + xhr.readyState));
                    };
            
                    xhr.open('GET', laUrl);
                    xhr.responseType = 'json';
                    xhr.send();
                }
                /* internal -- keys are retrieved from protectionExtensions */
                else if (_protectionData.clearKeys) {
                    var keyPairs = [];
                    for (i = 0; i < jsonMsg.kids.length; i++) {
                        var keyID = jsonMsg.kids[i],
                            key = (_protectionData.clearKeys.hasOwnProperty(keyID)) ? _protectionData.clearKeys[keyID] : null;
                        if (!key) {
                            this.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE,
                                    null, new Error("DRM: ClearKey keyID (" + keyID + ") is not known!"));
                        }
                        // KeyIDs from CDM are not base64 padded.  Keys may or may not be padded
                        keyPairs.push(new MediaPlayer.vo.protection.KeyPair(keyID, key));
                    }
            
                    var event = new MediaPlayer.vo.protection.LicenseRequestComplete(new MediaPlayer.vo.protection.ClearKeyKeySet(keyPairs), keyMessageEvent.sessionToken);
                    this.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE,
                            event);
                } else {
                    self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE,
                            null, new Error('DRM: ClearKey has no way (URL or protection data) to retrieve keys'));
                }
            },

            /* TODO: Implement me */
            parseInitDataFromContentProtection = function(/*cpData*/) {
                return null;
            },

            isInitDataEqual = function (initData1, initData2) {
                return initData1.length === initData2.length && btoa(initData1.buffer) === btoa(initData2.buffer);
            },

            cdmData = function (cdmData) {
                if (!String.isNullOrEmpty(cdmData)) {
                    _protectionData.licenseRequest.cdmData = cdmData;
                }
                return _protectionData.licenseRequest.cdmData;
            },
            laUrl = function (laUrl) {
                if (!String.isNullOrEmpty(laUrl)) {
                    _protectionData.licenseRequest.laUrl = laUrl;
                }
                return _protectionData.licenseRequest.laUrl;
            },
            headers = function (headers) {
                if ('object' === typeof (headers)) {
                    _protectionData.licenseRequest.headers = headers;
                }

                return _protectionData.licenseRequest.headers;
            };

    return {
        schemeIdURI: "urn:uuid:" + keySystemUUID,
        systemString: keySystemStr,
        uuid: keySystemUUID,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        /**
         * Initialize this key system
         *
         * @param protectionData {ProtectionData} data providing overrides for
         * default or CDM-provided values
         */
        init: function(protectionData) {
            if ('undefined' !== typeof (protectionData) && null !== protectionData) {
                _protectionData.licenseRequest = protectionData.licenseRequest || _protectionData.licenseRequest;
            }
        },

        requestLicense: requestLicense,

        getInitData: MediaPlayer.dependencies.protection.CommonEncryption.parseInitDataFromContentProtection,

        initDataEquals: isInitDataEqual,

        cdmData: cdmData,
        laUrl: laUrl,
        headers: headers
    };
};

MediaPlayer.dependencies.protection.KeySystem_ClearKey.prototype = {
    constructor: MediaPlayer.dependencies.protection.KeySystem_ClearKey
};

