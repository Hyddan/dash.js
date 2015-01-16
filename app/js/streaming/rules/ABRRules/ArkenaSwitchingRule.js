/**
 * @copyright The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2015, Lars Rothaus
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Lars Rothaus nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * @license THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * @namespace MediaPlayer.rules.ArkenaSwitchingRule
 *
 */

MediaPlayer.rules.ArkenaSwitchingRule = function () {
    console.debug('////////////////////////////////////////');
    console.debug('// ' + 'ArkenaSwitchingRule V 0.6.39');
    console.debug('// ' + 'By Lars Rothaus & Daniel Hedenius');
    console.debug('////////////////////////////////////////');

    var firstSwitch = true,
            runcounter = 0,

            mathRatio = 3,
            mathBase = [],

            //## requiredOverhead is a number in kbps that is added to the calculation
            requiredOverhead = 250,

            streamProcessors = {},
            changeToIndex = 0,
            doChange = false,

            // Bitrate Collections
            qualities = {
                0: {
                    qualityIndex: 0,
                    KBps: 57
                },
                1: {
                    qualityIndex: 1,
                    KBps: 100
                },
                2: {
                    qualityIndex: 2,
                    KBps: 188
                },
                3: {
                    qualityIndex: 3,
                    KBps: 250
                },
                4: {
                    qualityIndex: 4,
                    KBps: 375
                }
            },

            //checkVideoBufferLevels
            bufferOverhead = 0,
            prevBufferLevel = 0,
            lowBufferCount = 0,
            lowBufferThreshold = 10,

            //next
            prevKbpsReading = 0,
            currentBufferLevel = 0,
            switchInProgress = false,
            currentIndex = -1,
            count = 0 ,
            th = 6,
            indexArray = [],

            next = function (index) {
                count++;
                if (count <= th) {
                    indexArray.push(index);
                } else {
                    var sub = 0;
                    for (var indexs in indexArray) {
                        sub += indexArray[indexs];
                    }

                    if (!switchInProgress) {
                        changeToIndex = (sub / indexArray.length).toFixed(0);
                    } else {
                        console.debug("Change Out of turn!!");
                    }

                    if (parseInt(currentIndex, 10) !== parseInt(changeToIndex, 10)) {
                        if (!switchInProgress) {
                            if (changeToIndex > currentIndex) {
                                if (runcounter > 9 || firstSwitch) {
                                    if (currentBufferLevel > 15) {
                                        if (firstSwitch) {
                                            changeToIndex = 1;
                                            doChange = true;
                                            firstSwitch = false;
                                        } else {
                                            console.debug("##########################");
                                            console.debug("## Engaging SwitchUP -- on a bufferOverhead == ", bufferOverhead);

                                            if (bufferOverhead < 20 || currentBufferLevel < 20) {
                                                console.debug("## Downgration SwitchUP from ", changeToIndex, " to ", changeToIndex - 1);
                                                changeToIndex--;
                                            }

                                            if (changeToIndex !== currentIndex) {
                                                doChange = true;
                                            } else {
                                                console.debug("## Cancelling Switch do to currections ");
                                                console.debug("##########################");
                                                doChange = false;
                                                switchInProgress = false;
                                            }
                                        }
                                    } else {
                                        console.debug("##########################");
                                        console.debug("## Not enough buffer capacity to switch UP");
                                        console.debug("##########################");
                                    }
                                } else {
                                    console.debug("##########################");
                                    console.debug("## Switching is Suspended !");
                                    console.debug("##########################");
                                }
                            } else {
                                console.debug("##########################");
                                console.debug("## Engaging Switch DOWN");
                                console.debug("doChange","2");
                                doChange = true;
                            }
                        } else {
                            console.debug("## Switch to index Still in progress");
                        }
                    }

                    indexArray = [];
                    count = 0;
                }
            },
            
            ////////////////////////////////////////////////////
            // VideoBuffer
            ////////////////////////////////////////////////////
            drainingPeriod = 0,
            switchDownThreshold = 15,

            checkVideoBufferLevels = function (videoBufferLevel) {
                if (videoBufferLevel <= 1) {
                    runcounter = 0;
                } else {
                    runcounter++;
                    drainingPeriod++;

                    if (30 < drainingPeriod && 40 > videoBufferLevel) {
						drainingPeriod = 0;
						changeToIndex = currentIndex - 1;

						console.debug("## run down ->" , changeToIndex);
						changeToIndex = 0 < changeToIndex ? changeToIndex : 0;
						doChange = true;
                    }

                    if (switchDownThreshold < runcounter && 15 > videoBufferLevel) {
						changeToIndex = 0;
						drainingPeriod = 0;
						runcounter = 0;
						doChange = true;

						console.debug("Warning: Very low buffer force switching down!!!");
                    }
                }

                currentBufferLevel = videoBufferLevel;

                if (prevBufferLevel < videoBufferLevel) {
                    bufferOverhead = prevBufferLevel;
                    drainingPeriod = 0;
                    console.debug('Appenting bytes to buffer');
                }

                prevBufferLevel = videoBufferLevel;

                if (videoBufferLevel === 0) {
                    lowBufferCount++;
                    if (lowBufferCount > lowBufferThreshold -1) {
                        try {
                            lowBufferCount = lowBufferCount;
                        } catch (e) {
                            console.debug('////////////////////////////////////////');
                            console.debug('// ' + 'HEAD__RESER__DASH.JS'," FAILED!!!");
                            console.debug('////////////////////////////////////////');
                        }
                
                        console.debug('////////////////////////////////////////');
                        console.debug('// ' + 'HEAD__RESER__DASH.JS');
                        console.debug('////////////////////////////////////////');
                    }
                } else {
                    lowBufferCount = 0;
                }
            };

    return {
        debug: undefined,
        metricsExt: undefined,
        metricsModel: undefined,
        manifestExt: undefined,
        manifestModel: undefined,

        setStreamProcessor: function (streamProcessorValue) {
            var type = streamProcessorValue.getType(),
                    id = streamProcessorValue.getStreamInfo().id;

            streamProcessors[id] = streamProcessors[id] || {};
            streamProcessors[id][type] = streamProcessorValue;
        },

        execute: function (context, callback) {
            var self = this,
                    mediaInfo = context.getMediaInfo(),
                    mediaType = mediaInfo.type,
                    metrics = self.metricsModel.getReadOnlyMetricsFor(mediaType),
                    lastRequest = self.metricsExt.getCurrentHttpRequest(metrics),
                    switchRequest = new MediaPlayer.rules.SwitchRequest(MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, MediaPlayer.rules.SwitchRequest.prototype.WEAK);

            ////////////////////////////////////////////////////
            // DoChange
            ////////////////////////////////////////////////////
            if (doChange && mediaInfo.type === "video") {
                doChange = false;
                switchInProgress = true;

                console.debug("## CHANGING to ", changeToIndex, " for ", mediaInfo.type);
                callback(switchRequest = new MediaPlayer.rules.SwitchRequest(changeToIndex, 1));

                return;
            }

            ////////////////////////////////////////////////////
            // Calculate Bandwidth
            ////////////////////////////////////////////////////
            if (null !== lastRequest && null !== lastRequest.range && null !== metrics) {
				var repSwitch = self.metricsExt.getCurrentRepresentationSwitch(metrics),
					bufferLevel = self.metricsExt.getCurrentBufferLevel(metrics);
				currentIndex = self.metricsExt.getIndexForRepresentation(repSwitch.to);

				////////////////////////////////////////////////////
				// Check if switch is complete
				////////////////////////////////////////////////////
				if (switchInProgress === true ) {
					if (currentIndex === changeToIndex) {
						console.debug("## Switch to ", currentIndex ," Complete!!");
						console.debug("##########################");
						switchInProgress = false;
						runcounter = 0;
					} else {
						console.debug("## waiting switch: " , currentIndex," -> ", changeToIndex, " Buffer:", currentBufferLevel.toFixed(0));
					}
				} else {
					if (mediaInfo.type === "video") {
						console.debug(" Buffer: ", currentBufferLevel.toFixed(0)," - runcounter ", runcounter," - drainingPeriod ",drainingPeriod," - currentIndex ", currentIndex, "Bandwidth - ", prevKbpsReading.toFixed(0)+" KB/s");
					}
				}

				if ('Initialization Segment' === lastRequest.type) {
					console.info("Downloaded Initialization Segment!!");
					return;
				}

				if (mediaInfo.type === "video") {
					checkVideoBufferLevels(bufferLevel.level);
				}
				
				if (true || mediaInfo.type === "video") { // Remove 'true ||' to only use video metrics
					////////////////////////////////////////////////////
					// Calculating bandwidth & choosing bitrate index
					////////////////////////////////////////////////////

					var rangeArray = (lastRequest.range).split("-");
					var bytes = parseInt(rangeArray[1],10) - parseInt(rangeArray[0],10);
					var kb = bytes / 1024;
					var multiplicationRate = 1 / ((lastRequest.tfinish.getTime() - lastRequest.tresponse.getTime()) / 1000);
					var kbps = multiplicationRate * kb;

					mathBase.push(kbps);

					var sub = 0;
					if (mathBase.length > mathRatio) {
						for (var value in mathBase) {
							sub += mathBase[value];
						}

						mathBase.shift();
					}

					kbps = sub / mathBase.length;

					if (kbps) {
						var downloadIndex = 0;
						for (var bitrates in qualities) {
							if ((kbps / 100) / ((qualities[bitrates].KBps + requiredOverhead) / 100) * 100 > 100) {
								downloadIndex = bitrates;
							}
						}

						if (prevKbpsReading !== kbps) {
							next(parseInt(downloadIndex,10));
						}

						prevKbpsReading = kbps;
					}
				}
            }
        },

        reset: function () {
            console.debug("called -- reset");
        }
    };
};

MediaPlayer.rules.ArkenaSwitchingRule.prototype = {
    constructor: MediaPlayer.rules.ArkenaSwitchingRule
};