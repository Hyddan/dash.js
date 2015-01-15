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

MediaPlayer.dependencies.protection.KeySystem_PlayReady = function() {
    'use strict';

    var keySystemStr = 'com.microsoft.playready',
            keySystemUUID = '9a04f079-9840-4286-ab92-e65be0885f95',
            _protectionData = {
                licenseRequest: {
                    cdmData: null,
                    laUrl: null,
                    headers: null
                }
            },

            requestLicense = function (event) {
                var self = this,
                        keyMessageEvent = event,
                        xhr = new XMLHttpRequest(),
                        message = null,
                        laUrl = self.laUrl() || keyMessageEvent.defaultURL,
                        headerOverrides = self.headers(),
                        headers = {},
                        key,
                        parser = new DOMParser(),
                        xmlDoc = parser.parseFromString(String.fromCharCode.apply(null, new Uint16Array(keyMessageEvent.message.buffer)), 'application/xml');

                if (!laUrl) {
                    self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE,
                        null, new Error('DRM: No valid PlayReady Proxy Server URL specified!'));
                } else {
                    if (xmlDoc.getElementsByTagName('Challenge')[0]) {
                        var Challenge = xmlDoc.getElementsByTagName('Challenge')[0].childNodes[0].nodeValue;
                        if (Challenge) {
                            message = BASE64.decode(Challenge);
                        }
                    }
                    else {
                        self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE,
                            null, new MediaPlayer.vo.Error(null, 'DRM: playready update, can not find Challenge in keyMessage', null));
                    }

                    var headerNameList = xmlDoc.getElementsByTagName('name');
                    var headerValueList = xmlDoc.getElementsByTagName('value');

                    if (headerNameList.length != headerValueList.length) {
                        self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE,
                            null, new MediaPlayer.vo.Error(null, 'DRM: playready update, invalid header name/value pair in keyMessage', null));
                    }

                    for (var i = 0; i < headerNameList.length; i++) {
                        headers[headerNameList[i].childNodes[0].nodeValue] = headerValueList[i].childNodes[0].nodeValue;
                    }

                    xhr.onload = function () {
                        if (xhr.status == 200) {
                            var event = new MediaPlayer.vo.protection.LicenseRequestComplete(new Uint8Array(xhr.response), keyMessageEvent.sessionToken);
                            self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE,
                                event);
                        } else {
                            self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE,
                                null, new MediaPlayer.vo.Error(null, 'DRM: playready update, XHR status is "' + xhr.statusText + '" (' + xhr.status + '), expected to be 200. readyState is ' + xhr.readyState, null));
                        }
                    };
                    xhr.onabort = function () {
                        self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE,
                            null, new MediaPlayer.vo.Error(null, 'DRM: playready update, XHR aborted. status is "' + xhr.statusText + '" (' + xhr.status + '), readyState is ' + xhr.readyState, null));
                    };
                    xhr.onerror = function () {
                        self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE,
                            null, new MediaPlayer.vo.Error(null, 'DRM: playready update, XHR error. status is "' + xhr.statusText + '" (' + xhr.status + '), readyState is ' + xhr.readyState, null));
                    };

                    xhr.open('POST', laUrl);
                    xhr.responseType = 'arraybuffer';

                    if (headerOverrides) {
                        for (key in headerOverrides) {
                            headers[key] = headerOverrides[key];
                        }
                    }

                    for (key in headers) {
                        if ('authorization' === key.toLowerCase()) {
                            xhr.withCredentials = true;
                        }

                        xhr.setRequestHeader(key, headers[key]);
                    }

                    xhr.send(message);
                }
            },

            parseInitDataFromContentProtection = function(cpData) {
                // * desc@ getInitData
                // *   generate PSSH data from PROHeader defined in MPD file
                // *   PSSH format:
                // *   size (4)
                // *   box type(PSSH) (8)
                // *   Protection SystemID (16)
                // *   protection system data size (4) - length of decoded PROHeader
                // *   decoded PROHeader data from MPD file
                var byteCursor = 0,
                    PROSize = 0,
                    PSSHSize = 0,
                    PSSHBoxType = new Uint8Array([0x70, 0x73, 0x73, 0x68, 0x00, 0x00, 0x00, 0x00 ]), //'PSSH' 8 bytes
                    playreadySystemID = new Uint8Array([0x9a, 0x04, 0xf0, 0x79, 0x98, 0x40, 0x42, 0x86, 0xab, 0x92, 0xe6, 0x5b, 0xe0, 0x88, 0x5f, 0x95]),
                    uint8arraydecodedPROHeader = null,
                    PSSHBoxBuffer = null,
                    PSSHBox = null,
                    PSSHData = null;

                if ('pro' in cpData) {
                    uint8arraydecodedPROHeader = BASE64.decodeArray(cpData.pro.__text);
                }
                else if ('prheader' in cpData) {
                    uint8arraydecodedPROHeader = BASE64.decodeArray(cpData.prheader.__text);
                }
                else {
                    return null;
                }

                PROSize = uint8arraydecodedPROHeader.length;
                PSSHSize = 0x4 + PSSHBoxType.length + playreadySystemID.length + 0x4 + PROSize;

                PSSHBoxBuffer = new ArrayBuffer(PSSHSize);

                PSSHBox = new Uint8Array(PSSHBoxBuffer);
                PSSHData = new DataView(PSSHBoxBuffer);

                PSSHData.setUint32(byteCursor, PSSHSize);
                byteCursor += 0x4;

                PSSHBox.set(PSSHBoxType, byteCursor);
                byteCursor += PSSHBoxType.length;

                PSSHBox.set(playreadySystemID, byteCursor);
                byteCursor += playreadySystemID.length;

                PSSHData.setUint32(byteCursor, PROSize);
                byteCursor += 0x4;

                PSSHBox.set(uint8arraydecodedPROHeader, byteCursor);
                byteCursor += PROSize;

                return PSSHBox.buffer;
            },

            /* TODO: Implement me */
            isInitDataEqual = function(/*initData1, initData2*/) {
                return false;
            },

            cdmData = function (cdmData) {
                if (!String.isNullOrEmpty(cdmData)) {
                    _protectionData.licenseRequest[this.keysTypeString].cdmData = cdmData;
                }

                var _cdmData = _protectionData.licenseRequest[this.keysTypeString].cdmData;
                if (null === _cdmData) {
                    return null;
                }

                var cdmDataArray = [], charCode;
                cdmDataArray.push(239);
                cdmDataArray.push(187);
                cdmDataArray.push(191);
                for(var i = 0, j = _cdmData.length; i < j; ++i){
                    charCode = _cdmData.charCodeAt(i);
                    cdmDataArray.push((charCode & 0xFF00) >> 8);
                    cdmDataArray.push(charCode & 0xFF);
                }

                return new Uint8Array(cdmDataArray);
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

        schemeIdURI: 'urn:uuid:' + keySystemUUID,
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
        init: function (protectionData) {
            if ('undefined' !== typeof (protectionData) && null !== protectionData) {
                _protectionData.licenseRequest = protectionData.licenseRequest || _protectionData.licenseRequest;
            }
        },

        requestLicense: requestLicense,

        getInitData: parseInitDataFromContentProtection,

        initDataEquals: isInitDataEqual,

        cdmData: cdmData,
        laUrl: laUrl,
        headers: headers
    };
};

MediaPlayer.dependencies.protection.KeySystem_PlayReady.prototype = {
    constructor: MediaPlayer.dependencies.protection.KeySystem_PlayReady
};