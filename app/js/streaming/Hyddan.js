window.Hyddan = (function (Hyddan) {
    Hyddan.Utils = (function (Utils) {
        Utils.extend = function () {
            for (var i = 1; i < arguments.length; i++) {
                for (var key in arguments[i]) {
                    if (arguments[i].hasOwnProperty(key)) {
                        arguments[0][key] = arguments[i][key];
                    }
                }
            }
            
            return arguments[0];
        };
        
        Utils.getQueryStringParameter = function (parameter) {
            var result = new RegExp('[\\?&]' + parameter.replace(/[\[]/, '[').replace(/[\]]/, ']') + '=([^&#]*)').exec(window.location.search);

            if (null !== result) {
                result = decodeURIComponent(result[1].replace(/\+/g, ' '));
            }

            return result;
        };
        
        Utils.loadScript = function (url, onLoad) {
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = url;

            if (script.readyState) {
                script.onreadystatechange = function () {
                    if (script.readyState == 'loaded' || script.readyState == 'complete') {
                        script.onreadystatechange = null;

                        if (null !== onLoad) {
                            onLoad();
                        }
                    }
                };
            }
            else {
                if (null !== onLoad) {
                    script.onload = onLoad;
                }
            }

            document.getElementsByTagName('head')[0].appendChild(script);
        };
        
        Utils.loadStyle = function (url, onLoad) {
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = url;

            if (link.readyState) {
                link.onreadystatechange = function () {
                    if (link.readyState == 'loaded' || link.readyState == 'complete') {
                        link.onreadystatechange = null;

                        if (null !== onLoad) {
                            onLoad();
                        }
                    }
                };
            }
            else {
                if (null !== onLoad) {
                    link.onload = onLoad;
                }
            }

            document.getElementsByTagName('head')[0].appendChild(link);
        };

        Utils.notNullOrEmpty = function (obj) {
            return null !== obj && 'undefined' !== typeof (obj) && '' !== obj;
        };

        Utils.stringFormat = function (pattern) {
            if (String.isNullOrEmpty(pattern)) {
                return null;
            }

            var _args = Array.prototype.slice.call(arguments, 0);
            for (var i = 1; i < _args.length; i++) {
                if ('object' !== typeof _args[i]) {
                    pattern = pattern.replace('{' + (i - 1) + '}', _args[i]);
                }
                else {
                    for (var key in _args[i]) {
                        if (_args[i].hasOwnProperty(key)) {
                            pattern = pattern.replace('{' + key + '}', _args[i][key]);
                        }
                    }
                }
            }

            return pattern;
        };
        
        return Utils;
    }(Hyddan.Utils || {}));

    Hyddan.context = function (path, separator) {
        var i = 0,
            current = window;

        path = path.split(separator || '.');

        for (i; i < path.length; ++i) {
            if (!current[path[i]]) {
                current[path[i]] = {};
            }
            current = current[path[i]];
        }

        return current;
    };

    Hyddan.require = function (path) {
        return Hyddan.context(path);
    };

    Hyddan.Player = (function (Player) {
        //jshint unused:false
        var _autoPlay = true,
                _context = null,
                _di = null,
                _element = null,
                _isPlaying = false,
                _logToConsole = false,
                _protection = null,
                _source = null,
                _trackProgress = true;
        
        var _reset = function () {
            if (!String.isNullOrEmpty(_source)) {
                Player.DashJs.streamController.unsubscribe(MediaPlayer.dependencies.StreamController.eventList.ENAME_STREAMS_COMPOSED, Player.DashJs.manifestUpdater);
                Player.DashJs.manifestLoader.unsubscribe(MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED, Player.DashJs.streamController);
                Player.DashJs.manifestLoader.unsubscribe(MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED, Player.DashJs.manifestUpdater);
                Player.DashJs.streamController.reset();
                Player.DashJs.abrController.reset();
                Player.DashJs.rulesController.reset();
                Player.DashJs.streamController = null;
                _source = _protection = null;
                _isPlaying = _trackProgress = false;
            }
        };
        
        Player.DashJs = (function (DashJs) {
            DashJs.initialize = function () {
                _di.mapValue('scheduleWhilePaused', false);
                _di.mapOutlet('scheduleWhilePaused', 'stream');
                _di.mapOutlet('scheduleWhilePaused', 'scheduleController');
                _di.mapValue('bufferMax', MediaPlayer.dependencies.BufferController.BUFFER_SIZE_REQUIRED);
                _di.mapOutlet('bufferMax', 'bufferController');
                
                DashJs.abrController = _di.getObject('abrController');
                DashJs.debug = _di.getObject('debug');
                DashJs.eventBus = _di.getObject('eventBus');
                DashJs.manifestLoader = _di.getObject('manifestLoader');
                DashJs.manifestUpdater = _di.getObject('manifestUpdater');
                DashJs.rulesController = _di.getObject('rulesController');
                DashJs.streamController = _di.getObject('streamController');
                DashJs.videoModel = _di.getObject('videoModel');
            };
            
            Player.notifier = undefined;
            
            return DashJs;
        }(Player.DashJs || {}));
        
        Player.Events = (function (Events) {
            Events.onError = Events.onError || function (error) { };
            Events.onInitialize = Events.onInitialize || function (context) { };
            
            Events.onTimeUpdate = Events.onTimeUpdate || function (currentTime) { };
            
            Events.onConfigure = Events.onConfigure || function (configuration) { };
            Events.onData = Events.onData || function (data) { };
            Events.onDestroy = Events.onDestroy || function () { };
            Events.onObject = Events.onObject || function (element) { };
            Events.onPause = Events.onPause || function () { };
            Events.onPlay = Events.onPlay || function () { };
            Events.onPlayComplete = Events.onPlayComplete || function () { };
            Events.onPosition = Events.onPosition || function (position) { };
            Events.onProtection = Events.onProtection || function (protection) { };
            Events.onSource = Events.onSource || function (source) { };
            Events.onStop = Events.onStop || function () { };
            Events.onVolume = Events.onVolume || function (volume) { };
            
            return Events;
        }(Player.Events || {}));

        Player.addEventListener = function (type, listener, useCapture) {
            Player.DashJs.eventBus.addEventListener(type, listener, useCapture);
            
            return Player;
        };
        Player.removeEventListener = function (type, listener, useCapture) {
            Player.DashJs.eventBus.removeEventListener(type, listener, useCapture);
            
            return Player;
        };

        Player.configure = function (data) {
            data = data || {
                autoPlay: true,
                debug: {
                    logToConsole: false
                },
                object: null,
                protection: null,
                source: null
            };
            
            
            Player.Events.onConfigure(data);
            
            _autoPlay = data.autoPlay;
            _logToConsole = (data.debug || {}).logToConsole || false;
            
            Player.object(data.object);
            Player.protection(data.protection);
            Player.source(data.source);
            
            return Player;
        };
        Player.initialize = function (context) {
            (_di = new dijon.System())
                .mapValue('system', _di)
                .mapOutlet('system')
                .injectInto(_context = context)
                .injectInto(Player);
            
            Player.DashJs.initialize();
            Player.Events.onInitialize(_context);
            
            return Player;
        };
        Player.destroy = function () {
            Player.Events.onDestroy();
            
            return Player;
        };
        Player.object = function (element) {
            if (Hyddan.Utils.notNullOrEmpty(element)) {
                _reset();
                
                Player.DashJs.videoModel.setElement(_element = element);
                Player.Events.onObject(_element);
                
                return Player;
            }
            
            return _element;
        };
        Player.pause = function () {
            if (_isPlaying) {
                _element.pause();
                _isPlaying = _trackProgress = false;
            }
            
            return Player;
        };
        Player.play = function () {
            if (!_isPlaying) {
                _element.play();
                _isPlaying = _trackProgress = true;
            }
            
            return Player;
        };
        Player.position = function (positionInS) {
            positionInS = parseInt(positionInS, 10);
            if ('number' === typeof (positionInS)) {
                Player.Events.onPosition(_element.position = positionInS);
                
                return Player;
            }
            
            return _element.position;
        };
        Player.protection = function (protection) {
            if (Hyddan.Utils.notNullOrEmpty(protection)) {
                Player.Events.onProtection(_protection = protection);
            
                return Player;
            }
            
            return _protection;
        };
        Player.source = function (source) {
            if (Hyddan.Utils.notNullOrEmpty(source)) {
                _reset();
                
                Player.Events.onSource(_source = source);
                
                if (Hyddan.Utils.notNullOrEmpty(_element) && Hyddan.Utils.notNullOrEmpty(_source)) {
                    _isPlaying = _trackProgress = true;
                    
                    Player.DashJs.debug.setLogToBrowserConsole(_logToConsole);
                    
                    Player.DashJs.streamController.subscribe(MediaPlayer.dependencies.StreamController.eventList.ENAME_STREAMS_COMPOSED, Player.DashJs.manifestUpdater);
                    Player.DashJs.manifestLoader.subscribe(MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED, Player.DashJs.streamController);
                    Player.DashJs.manifestLoader.subscribe(MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED, Player.DashJs.manifestUpdater);
                    Player.DashJs.streamController.setVideoModel(Player.DashJs.videoModel);
                    Player.DashJs.streamController.setAutoPlay(_autoPlay);
                    Player.DashJs.streamController.setProtectionData(_protection);
                    Player.DashJs.streamController.load(_source);
                    
                    Player.DashJs.rulesController.initialize();
                }
                
                return Player;
            }
            
            return _source;
        };
        Player.stop = function () {
            _source = null;
            _element.load();
            
            Player.Events.onStop();
            
            return Player;
        };
        Player.volume = function (volume) {
            if ('number' === typeof (volume) && 0 <= volume && 1 >= volume) {
                Player.Events.onVolume(_element.volume = volume);
                
                return Player;
            }
            
            return _element.volume;
        };
        
        return Player;
    })(Hyddan.Player || {});

    return Hyddan;
})(window.Hyddan || {});