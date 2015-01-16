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
 * @namespace MediaPlayer.rules.ArkenaSwitchingMetric
 *
 */

MediaPlayer.rules.ArkenaSwitchingMetric = function () {

console.debug('////////////////////////////////////////');
console.debug('// ' + 'ArkenaSwitchingMetric V 0.6.38');
console.debug('// ' + 'By Lars Rothaus & Daniel Hedenius');
console.debug('////////////////////////////////////////');

    var firstSwitch = true;

    ////////////
    // runCount
    ////////////

    var runcounter = 0;

    var currentCallback = null;

    var mathRatio = 3;
    var mathBase = [];
    var switchThreshold = 5;
    var switchCount = 0;
    var gotManifestInfo = false;

    var videoCallback = null;

    var manifestModel = null;

    var qualitySheet = {

    };

    //## requeredOverhead is a number in kb/ps that is added the calculation
    var requeredOverhead = 250;

    var streamProcessors = {};
    var changeToIndex = 0;
    var doChange = false;

    // Bitrate Collections
    var qualitys = {
       0 : {
            qualityIndex: 0,
            KBps: 57
        },
        1 : {
            qualityIndex: 1,
            KBps: 100
        },
        2 : {
            qualityIndex: 2,
            KBps: 188
        },
        3 : {
            qualityIndex: 3,
            KBps: 250
        },
        4 : {
            qualityIndex: 4,
            KBps: 375
        }
    };

    //checkVideoBufferLevels
    var bufferOverhead = 0;
    var prevBufferLevel = 0;
    var backbufferReadingComplete = false;
    var lowBufferCount  = 0;
    var lowBufferThreshold = 10;

    //next
    var prevKBPSReading = 0;
    var currentBufferLevel = 0;
    var currentQuality = qualitys[0];
    var bitratesCollected = false;
    var switchInProgress = false;
    var currentIndex = -1;
    var count = 0 ;
    var th = 6;
    var indexArray = [];

    var next = function(index){

        count++;
        if(count <= th)
        {
            indexArray.push(index);
        }else{
            var sub = 0;
            for(var indexs in indexArray)
            {
                sub += indexArray[indexs];
            }

            if(!switchInProgress)
            {
                changeToIndex = (sub /indexArray.length).toFixed(0);
            }else{
                console.debug("Change Out of turn!!");
            }


            if(parseInt(currentIndex,10) !== parseInt(changeToIndex,10))
            {
                if(!switchInProgress)
                {
                    if(changeToIndex > currentIndex)
                    {
                        if(runcounter > 9 || firstSwitch)
                        {
                            if(currentBufferLevel > 15)
                            {

                                if(firstSwitch)
                                {
                                    changeToIndex = 1;
                                    firstSwitch = false;
                                    doChange = true;
                                }else{
                                    console.debug("##########################");
                                    console.debug("## Engaging SwitchUP -- on a bufferOverhead == ",bufferOverhead);

                                    if(bufferOverhead < 20 || currentBufferLevel < 20 )
                                    {
                                        console.debug("## Downgration SwitchUP from ",changeToIndex," to ",changeToIndex-1);
                                        changeToIndex--;
                                    }
                                    /*
                                     *  if(runcounter > 15)
                                     {
                                     // P1 //
                                     console.debug("##########################");
                                     console.debug("## Engaging SwitchUP -- on a bufferOverhead == ",bufferOverhead);

                                     if(bufferOverhead < 20 || currentBufferLevel < 20 )
                                     {
                                     console.debug("## Downgration SwitchUP from ",changeToIndex," to ",changeToIndex-1);
                                     changeToIndex--;
                                     }
                                     }else{
                                     changeToIndex = currentIndex++;
                                     }
                                     * */

                                    if(changeToIndex !== currentIndex)
                                    {
                                        doChange = true;
                                    }else{
                                        console.debug("## Cancelling Switch do to currections ");
                                        console.debug("##########################");
                                        doChange = false;
                                        switchInProgress = false;

                                    }

                                }
                            }else{
                                console.debug("##########################")
                                console.debug("## Not enough buffer capacity to switch UP");
                                console.debug("##########################")
                            }
                        }else{
                            console.debug("##########################")
                            console.debug("## Switching is Suspended !");
                            console.debug("##########################")
                        }


                    }else{
                        console.debug("##########################")
                        console.debug("## Engaging Switch DOWN");
                        console.debug("doChange","2")
                        doChange = true;
                    }

                }else{
                    console.debug("## Switch to index Still in progress");
                }
            }

            indexArray = [];
            count = 0;
        }

    };
    ////////////////////////////////////////////////////
    // VideoBuffer
    ////////////////////////////////////////////////////


    var drainingPeriod = 0;

    var switchDownTh = 15;

    var checkVideoBufferLevels = function(videoBufferLevel){

        if(videoBufferLevel <= 1)
        {
            runcounter = 0;
        }else{
            runcounter++;

            drainingPeriod++;

            if(drainingPeriod > 30)
            {

                if(videoBufferLevel < 40)
                {

                    drainingPeriod = 0;

                    changeToIndex = currentIndex - 1

                    console.debug("## run down ->" ,changeToIndex);

                    if(changeToIndex < 0 )
                    {
                        changeToIndex = 0;
                    }

                    doChange = true;

                }

            }

            if(runcounter > switchDownTh)
            {
                if(videoBufferLevel < 15)
                {
                    changeToIndex = 0;
                    drainingPeriod = 0;
                    doChange = true;

                    console.debug("Warning: Very low buffer force switching down!!!");
                    runcounter = 0;
                }
            }
        }


        currentBufferLevel = videoBufferLevel;


        if(prevBufferLevel < videoBufferLevel)
        {
            bufferOverhead = prevBufferLevel;

            drainingPeriod = 0;

            console.debug('Appenting bytes to buffer');
        }

        prevBufferLevel = videoBufferLevel;



       if(videoBufferLevel == 0)
       {
           lowBufferCount++;
           if(lowBufferCount > lowBufferThreshold -1)
           {
               try{

               }catch (e)
               {
                   console.debug('////////////////////////////////////////');
                   console.debug('// ' + 'HEAD__RESER__DASH.JS'," FAILD!!!");
                   console.debug('////////////////////////////////////////');
               }

               console.debug('////////////////////////////////////////');
               console.debug('// ' + 'HEAD__RESER__DASH.JS');
               console.debug('////////////////////////////////////////');


           }
       }else{
           lowBufferCount = 0;
       }

    };


    var trendExtractor = function(){

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

            var self = this;
            var mediaInfo = context.getMediaInfo();
            var mediaType = mediaInfo.type;
            var nextQuality = null;
            var metrics = self.metricsModel.getReadOnlyMetricsFor(mediaType);
            var isDynamic = context.getStreamProcessor().isDynamic();
            var lastRequest = self.metricsExt.getCurrentHttpRequest(metrics);
            var downloadTime;
            var averageThroughput;
            var lastRequestThroughput;
            var bufferStateVO = (metrics.BufferState.length > 0) ? metrics.BufferState[metrics.BufferState.length - 1] : null;
            var bufferLevelVO = (metrics.BufferLevel.length > 0) ? metrics.BufferLevel[metrics.BufferLevel.length - 1] : null;
            var switchRequest = new MediaPlayer.rules.SwitchRequest(MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, MediaPlayer.rules.SwitchRequest.prototype.WEAK);
            var stream = context.getStreamInfo();
            var streamId = context.getStreamInfo().id;
            var mediaInfo = context.getMediaInfo();
            var current = context.getCurrentValue();
            //var sp = streamProcessors[streamId][mediaType];
            var metrics = self.metricsModel.getReadOnlyMetricsFor(mediaType);


            ////////////////////////////////////////////////////
            // DoChange
            ////////////////////////////////////////////////////

            if(doChange && mediaInfo.type === "video")
            {
                doChange = false;
                switchInProgress = true;
                // P2 //
                console.debug("## CHANGING to ",changeToIndex," for ",mediaInfo.type);

                switchRequest = new MediaPlayer.rules.SwitchRequest(changeToIndex, 1);

                callback(switchRequest);

                return;
            }else{

            }



            ////////////////////////////////////////////////////
            // Calculate Bandwidth
            ////////////////////////////////////////////////////

            if (lastRequest !== null && metrics !== null) {


                if (lastRequest.range !== null ) {

                    repSwitch = self.metricsExt.getCurrentRepresentationSwitch(metrics);
                    bufferLevel = self.metricsExt.getCurrentBufferLevel(metrics);
                    httpRequests = self.metricsExt.getHttpRequests(metrics);
                    droppedFramesMetrics = self.metricsExt.getCurrentDroppedFrames(metrics);

                    currentIndex = self.metricsExt.getIndexForRepresentation(repSwitch.to);

                    ////////////////////////////////////////////////////
                    // Chech if switch is complete
                    ////////////////////////////////////////////////////
                    if(switchInProgress === true )
                    {
                        if(currentIndex == changeToIndex) {
                            console.debug("## Switch to ", currentIndex ," Complete!!");
                            console.debug("##########################")
                            switchInProgress = false;
                            runcounter = 0;
                        }else{
                            console.debug("## waiting switch: " , currentIndex," -> ", changeToIndex," Buffer:",currentBufferLevel.toFixed(0));
                        }
                    }else{
                        if(mediaInfo.type === "video")
                        {

                            console.debug(" Buffer: ", currentBufferLevel.toFixed(0)," - runcounter ", runcounter," - drainingPeriod ",drainingPeriod," - currentIndex ", currentIndex, "Bandwidth - ", prevKBPSReading.toFixed(0)+" KB/s");
                        }
                    }

                    if(mediaInfo.type === "video")
                    {
                        checkVideoBufferLevels(bufferLevel.level);
                    }

                    if(lastRequest.type !== "Initialization Segment")
                    {
                        if(mediaInfo.type === "video" || 1 === 1)
                        {


                            ////////////////////////////////////////////////////
                            // Calculation bandwitch & choosing bitrate index!
                            ////////////////////////////////////////////////////

                            var rangeArray = (lastRequest.range).split("-");
                            var bytes = parseInt(rangeArray[1],10) - parseInt(rangeArray[0],10);
                            var kb = bytes / 1024;
                            var multiplicationRate = 1 / ((lastRequest.tfinish.getTime() - lastRequest.tresponse.getTime()) / 1000);
                            var kbps = multiplicationRate * kb;

                            mathBase.push(kbps);

                            if (mathBase.length > mathRatio) {

                                var sub = 0;

                                for (var value in mathBase) {
                                    sub += mathBase[value];
                                }

                                mathBase.shift();
                            }

                            kbps = sub / mathBase.length;


                            if(kbps)
                            {
                                var downloadIndex = 0;


                                for (var bitrates in qualitys) {

                                    if((kbps / 100) / ((qualitys[bitrates].KBps + requeredOverhead) / 100) * 100 > 100)
                                    {
                                        downloadIndex = bitrates;

                                    }
                                };

                                if(prevKBPSReading != kbps)
                                {
                                    ////////////////////////////////////////////////////
                                    // CALLING NEXT !!!!!!
                                    ////////////////////////////////////////////////////

                                    next(parseInt(downloadIndex,10));
                                }

                                prevKBPSReading = kbps;

                            }

                            currentCallback = callback;
                        }
                    }
                }

            }else{
                console.info("Downloaded Initialization Segment!!");
            }
        },

        test: function () {
            return "Hello from ArkenaSwitchingMetric ";
        },

        reset: function () {
            console.debug("called -- reset");
        }
    };
};


MediaPlayer.rules.ArkenaSwitchingMetric.prototype = {
    constructor: MediaPlayer.rules.ArkenaSwitchingMetric
};

/*
*  if(1 == 2 && videoBufferLevel < 10 && switchInProgress === false && currentIndex > 0)
 {
 console.debug("go down!!!");

 var switchToIndex = currentIndex - 2;



 if(switchToIndex < 0 )
 {

 switchToIndex = 0;
 }

 if(currentIndex != switchToIndex )
 {
 changeToIndex = switchToIndex;
 console.debug("doChange","4")
 doChange = true;
 }
 }
* */