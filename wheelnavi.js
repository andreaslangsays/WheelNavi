(function($, window, undefined){

    /**
     * MAIN PLUGIN DEFINITIONS
     */

    var wheels = {};

    /*
     * URL of the script directory.
     */
    var scriptDirectory = '';

    var cssInitialized = false;

    var definedRadiusSize = {
        small     : 50,
        medium    : 75,
        large     : 100,
        'x-large' : 150
    };
    
    var wheelsForClosing = [];
    
    var hint = null;
    
    var defaults = {
        radius       : 75,
        position     : 'absolute',
        color        : '#4169E1',
        fontColor    : '#ffffff',
        gradient     : true,
        contours     : true,
        icon         : null,
        showAction   : 'click',
        closeAction  : 'onClickOutside',
        size         : 'medium',
        maxPageLayersCount : 7,
        hintPosition : 'below',
        labels       : {
            previous : 'previous',
            next     : 'next',
            close    : 'close'
        },
        options      : {}
    };
    
    var initialized = false;

    var methods = {
        init : function(options) {
            var config = $.extend({}, defaults, $(this).data(), options);
            var id = $(this).prop('id');
            wheels[id] = new Wheel($(this), config);
        }
    };

    var initCss = function() {
        if (!cssInitialized) {
            $('<link rel="stylesheet" type="text/css" href="' + scriptDirectory + '/utilities/font.css" >')
            .appendTo("head");
            cssInitialized = true;
        }
    };
    
    var getHint = function() {
        if ( ! hint)
            hint = new Hint();
        return hint;
    };

    var fontAwesome;

    $.fn.wheelNavi = function( input, extras ) {
        if (!initialized) {
            if (scriptDirectory === '') {
                var scripts = $('script');
                var arrPath = scripts[scripts.length-1].src.split('/');
                arrPath.pop();
                scriptDirectory = arrPath.join('/');
                $.getJSON(scriptDirectory + '/font-awesome.json').done(function( data ) {
                    fontAwesome = data;
                });
            }

            $(document).mouseup(function (e) {
                for (key in wheelsForClosing) {
                    if (!wheelsForClosing[key].container.is(e.target) && wheelsForClosing[key].container.has(e.target).length === 0) {
                        wheelsForClosing[key].hide();
                    }
                }
            });

            initCss();
        }

        if ( methods[input] ) {
            return methods[input].call(this, extras);
                    //apply( this, Array.prototype.slice.call( arguments, 1 ));
        } else if ( typeof input === 'object' || ! input ) {
            return methods.init.apply( this, arguments );
        } else {
            $.error( 'Method ' +  input + ' does not exist on jQuery.wheelNavi');
        }

    };

    $.fn.showNavi = function( containerId, eventType ) {
        if (!eventType) {
            eventType = 'click';
        }

        $(this).on(eventType, function(event) {
            wheels[containerId].show(event.clientX, event.clientY);
        });
    };

    var getWheel = function(id) {
        return wheels[id];
    };
    ///////////////////////////////////
    // End of MAIN PLUGIN definition //
    ///////////////////////////////////

    /**
     * Definition of element class
     *
     * @type Element
     */
    var Element = function(wheel, key, options) {
        this.elem = wheel.container.children('li').eq(key);

        if (!this.elem) {
            this.elem = $('<li>');
        }
        this.label        = (options.label ? options.label : null);
        this.color        = (options.color ? options.color : wheel.config.color);
        this.fontColor    = (options.fontColor ? options.fontColor : wheel.config.fontColor);
        this.gradient     = (options.gradient !== undefined ? options.gradient : wheel.config.gradient);
        this.contours     = (options.contours !== undefined ? options.contours : wheel.config.contours);
        this.closeOnClick = (options.closeOnClick !== undefined ? options.closeOnClick : true);
        this.icon         = (options.icon ? options.icon : wheel.config.icon);
    };

    Element.prototype.getLabel = function() {
        return (this.elem.data('label') ? this.elem.data('label') : (this.elem.text() !== '' ? this.elem.text() : this.label));
    };

    Element.prototype.getColor = function() {
        return (this.elem.data('color') ? this.elem.data('color') : this.color);
    };

    Element.prototype.getFontColor = function() {
        return (this.elem.data('font-color') ? this.elem.data('font-color') : this.fontColor);
    };

    Element.prototype.isGradient = function() {
        return Boolean(this.gradient || this.elem.data('gradient'));
    };

    Element.prototype.isCloseOnClick = function() {
        return (this.closeOnClick || this.elem.data('close-on-click'));
    };

    Element.prototype.hasContours = function() {
        return (this.contours || this.elem.data('contours'));
    };

    Element.prototype.click = function() {
        if (this.elem.children('a').length) {
            this.elem.children('a').click();
            if (this.elem.children('a').prop('href') && this.elem.children('a').prop('href') !== '#') {
                window.location.assign(this.elem.children('a').prop('href'));
            }
        }
        this.elem.click();
    };

    Element.prototype.hasChildList = function() {
        return this.elem.children('ul').length;
    };

    Element.prototype.getChildList = function() {
        if (this.hasChildList()) {
            return this.elem.children('ul').first();
        }
        return null;
    };

    Element.prototype.getIcon = function() {
        return (this.elem.data('icon') ? this.elem.data('icon') : this.icon);
    };

    Element.prototype.updateOptions = function(options) {
        for(key in options) {
            this[key] = options[key];
        }
    };
    ///////////////////////////////
    // End of Element definition //
    ///////////////////////////////

    /**
     * Definition of layer class
     *
     * @type Layer
     */
    var Layer = function(wheel, config) {
        this.id          = wheel.id + 'Layer' + config.key;
        this.key         = config.key;
        this.wheel       = wheel;
        this.z_index     = (config.options['z-index'] ? config.options['z-index'] : 10000);
        this.canvas      = wheel.canvas; 
        this.context     = wheel.context;
        this.radius      = config.radius;
        this.radiusOut   = config.radius;
        this.radiusOn    = 1.2 * config.radius;
        this.linkElem    = new Element(wheel, config.key ,config.options);

        this.childWheel  = null;

        if (this.linkElem.hasChildList()) {
            this.createChildWheel(this.linkElem.getChildList());
        }
        else if(config.options.childWheel) {
            this.createChildWheel($('<ul>'), config.options.childWheel);
        }

        this.prev        = config.prevArc;
        this.next        = config.nextArc;
        this.radiusStart = config.radiusStart;
        this.radiusStop  = config.radiusStop;
        this.vectorStart = config.currentVector;
        this.vectorHalf  = config.halfVector;
        this.vectorStop  = config.nextVector;
        this.cursorOnLayer = false;
        this.alphaStart  = 0;
        this.alpha       = 0.8;
        this.visible     = true;
        this.action      = ((typeof config.action === 'function') ? config.action : function() {});
    };
    
    Layer.prototype.setVisible = function(visible) {
        this.visible = visible;
    };
    
    Layer.prototype.isVisible = function() {
        return this.visible;
    };

    Layer.prototype.createChildWheel = function(ul, config) {
        if (!ul.prop('id')) {
            ul.prop('id', this.wheel.id + '_inner');
        }
        ul.appendTo('body').wheelNavi(config);
        this.childWheel = getWheel(ul.prop('id'));
        this.childWheel.parentWheel = this.wheel;
    };

    Layer.prototype.getFillStyle = function() {
        var color = this.linkElem.getColor();
        if (this.linkElem.isGradient()) {
            var style = this.context.createLinearGradient(this.vectorHalf.originalX, this.vectorHalf.originalY, this.wheel.halfSize, this.wheel.halfSize);
            style.addColorStop(0, color);
            style.addColorStop(1, "#FFFFFF");
        }
        else {
            var style = color;
        }
        return style;
    };

    Layer.prototype.draw = function() {
        if (!this.visible)
            return;
        var icon = this.linkElem.getIcon();
        this.context.save();
        this.context.beginPath();
        this.context.moveTo(this.wheel.centerX, this.wheel.centerY);
        this.context.arc(
                this.wheel.centerX,
                this.wheel.centerY,
                this.radius,
                this.radiusStart,
                this.radiusStop,
                true
        );

        if (this.linkElem.hasContours()) {
            this.context.lineTo(this.wheel.centerX, this.wheel.centerY);
            this.context.lineWidth = 2;
            this.context.stroke();
        }
        this.context.closePath();
        this.context.fillStyle = this.getFillStyle();
        this.context.fill();
        this.context.restore();
        if (fontAwesome[icon]) {
            var fontSize = this.radius / 3;
            this.context.textBaseline = "top";
            this.context.font      = fontSize + 'px FontAwesome';
            this.context.fillStyle = this.linkElem.getFontColor();
            this.context.fillText(fontAwesome[icon], (this.wheel.config.radius + (2 / 3 * this.vectorHalf.x)) - (fontSize / 2) + this.wheel.padding, (this.wheel.config.radius - (2 / 3 * this.vectorHalf.y)) - (fontSize / 2) + this.wheel.padding);
        }
    };

    Layer.prototype.onMouseOut = function() {
        this.cursorOnLayer = false;
        this.alphaStart = 0.8;
        this.alpha = 0.8;
        this.radius = this.radiusOut;
        this.draw();
    };

    Layer.prototype.onMouseIn = function() {
        this.cursorOnLayer = true;
        this.alphaStart = this.alpha;
        this.alpha = 1;
        this.radius = this.radiusOn;
        this.draw();
        getHint().show(this.linkElem.getLabel(), this.wheel);
    };

    Layer.prototype.onClick = function() {
        this.action();
        
        this.linkElem.click();

        if (this.linkElem.isCloseOnClick()) {
            this.wheel.hide("fast");
        }
        if (this.childWheel) {
            this.childWheel.show();
        }
    };
    ///////////////////////////////////
    // End of Layer class definition //
    ///////////////////////////////////

    /**
     * Definition of layers set's class.
     *
     * @params Object Object of wheel navi container.
     * @type LayerSet
     */

    var LayerSet = function(wheel) {
        this.pageCount   = Math.ceil(wheel.elemCount / wheel.config.maxPageLayersCount);
        this.actualPage  = 0;
        this.layers      = [];
        this.pages       = [];
        this.wheel       = wheel;
        this.navRadius   = this.wheel.config.radius / 3;
        this.nav         = {};
    };

    LayerSet.prototype.hasPrevPage = function() {
        if (this.actualPage > 0) {
            return true;
        }
        return false;
    };

    LayerSet.prototype.hasNextPage = function() {
        if (this.actualPage < this.pageCount - 1) {
            return true;
        }
        return false;
    };

    LayerSet.prototype.setPages = function() {
        for (key = 0; key < this.pageCount; key++) {
            var startLayer = key * this.wheel.config.maxPageLayersCount;
            var next = startLayer + this.wheel.config.maxPageLayersCount - 1;
            var endLayer = (next > this.wheel.elemCount - 1 ? this.wheel.elemCount - 1 : next);
            var layersCount = (endLayer - startLayer + 1);
            var angleDivision = ((layersCount <= 5) ? 5 : layersCount);
            this.pages.push({
                start       : startLayer,
                end         : endLayer,
                angleStep   : (2 / angleDivision) * Math.PI,
                layersCount : layersCount
            });
        }
    };

    LayerSet.prototype.getActualPage = function() {
        return this.pages[this.actualPage];
    };

    LayerSet.prototype.show = function() {
        var page = this.getActualPage();
        this.wheel.clear();
        for (key = page.start; key <= page.end; key++) {
            this.layers[key].draw();
        }
        this.resetNav();
        this.showNav();
    };

    LayerSet.prototype.mouseOutAll = function(activeLayer) {
        var page = this.getActualPage();
        getHint().hide();
        for (key = page.start; key <= page.end; key ++) {
            if (key !== activeLayer) {
                this.layers[key].onMouseOut();
            }
            else {
                this.layers[activeLayer].onMouseIn();
            }
        }
        this.drawCenterLayer();
        for (key in this.nav) {
            if (key !== activeLayer) {
                this.nav[key].onMouseOut();
            }
            else {
                this.nav[activeLayer].onMouseIn();
            }
        }
    };

    LayerSet.prototype.showPage = function(key) {
        this.actualPage = key;
        this.show();
    };

    LayerSet.prototype.showNextPage = function() {
        if (this.actualPage < this.pageCount - 1) {
            this.showPage(this.actualPage + 1);
        }
    };

    LayerSet.prototype.showPrevPage = function() {
        if (this.actualPage > 0) {
            this.showPage(this.actualPage - 1);
        }
    };

    LayerSet.prototype.initNav = function() {
        var layerSet = this;
        var currentVector = {
            x: 0,
            y: -(this.navRadius),
            originalX: this.wheel.halfSize,
            originalY: ((2 * this.navRadius) + this.wheel.padding)
        };

        var options = {
            'z-index' : 11005,
            color     : '#000',
            fontColor : '#fff',
            gradient  : false,
            contours  : false,
            icon      : 'fa-chevron-right',
            label     : 'next',
            closeOnClick : false
        };

        var config = {
            key           : 'next',
            currentVector : currentVector,
            angleStep     : Math.PI / 2,
            halfVector    : this.getNextVector(currentVector.x, currentVector.y, (Math.PI / 4)),
            nextVector    : this.getNextVector(currentVector.x, currentVector.y, (Math.PI / 2)),
            prevArc       : 'prev',
            nextArc       : 'back',
            options       : options,
            radius        : this.navRadius,
            radiusStart   : this.wheel.startAt,
            radiusStop    : this.wheel.startAt - (Math.PI / 2),
            action        : function() {
                                layerSet.showNextPage();
                            }
        };

        this.nav.next = new Layer(this.wheel, config);

        currentVector = config.nextVector;

        options.icon = 'fa-reply';
        options.label = 'back';

        config = {
            key           : 'back',
            currentVector : currentVector,
            angleStep     : Math.PI,
            halfVector    : this.getNextVector(currentVector.x, currentVector.y, (Math.PI / 2)),
            nextVector    : this.getNextVector(currentVector.x, currentVector.y, (Math.PI)),
            prevArc       : 'next',
            nextArc       : 'prev',
            options       : options,
            radius        : this.navRadius,
            radiusStart   : this.wheel.startAt - (Math.PI / 2),
            radiusStop    : this.wheel.startAt - ((3 / 2) * Math.PI),
            action        : function() {
                                this.wheel.hide("fast");
                                var x = this.wheel.parentWheel.currX + this.wheel.parentWheel.halfSize;
                                var y = this.wheel.parentWheel.currY + this.wheel.parentWheel.halfSize;
                                this.wheel.parentWheel.show(x, y, "fast");
                            }
        };

        this.nav.back = new Layer(this.wheel, config);

        currentVector = config.nextVector;

        options.icon = 'fa-chevron-left';
        options.label = 'previous';

        config = {
            key           : 'prev',
            currentVector : currentVector,
            angleStep     : Math.PI / 2,
            halfVector    : this.getNextVector(currentVector.x, currentVector.y, (Math.PI / 4)),
            nextVector    : this.getNextVector(currentVector.x, currentVector.y, (Math.PI / 2)),
            prevArc       : 'back',
            nextArc       : 'next',
            options       : options,
            radius        : this.navRadius,
            radiusStart   : this.wheel.startAt - ((3 / 2) * Math.PI),
            radiusStop    : this.wheel.startAt - (2 * Math.PI),
            action        : function() {
                                layerSet.showPrevPage();
                            }
        };

        this.nav.prev = new Layer(this.wheel, config);
        this.resetNav();
    };

    LayerSet.prototype.resetNav = function() { 
        if (this.hasNextPage())
            this.nav.next.setVisible(true);
        else
            this.nav.next.setVisible(false);
        
        if (this.wheel.parentWheel)
            this.nav.back.setVisible(true);
        else
            this.nav.back.setVisible(false);
        
        if (this.hasPrevPage())
            this.nav.prev.setVisible(true);
        else
            this.nav.prev.setVisible(false);
    };

    LayerSet.prototype.showNav = function() { 
        this.drawCenterLayer();
        this.nav.next.draw();
        this.nav.back.draw();
        this.nav.prev.draw();
    };
    
    LayerSet.prototype.drawCenterLayer = function() {
        this.wheel.context.save();
        this.wheel.context.beginPath();
        this.wheel.context.moveTo(this.wheel.centerX, this.wheel.centerY);
        this.wheel.context.arc(
                this.wheel.centerX,
                this.wheel.centerY,
                this.navRadius,
                0,
                (2 * Math.PI),
                false
        );
        this.wheel.context.closePath();
        this.wheel.context.fillStyle = '#000000';
        this.wheel.context.fill();
        this.wheel.context.restore();
    };

    LayerSet.prototype.init = function() {
        if(this.layers.length) {
            return;
        }

        this.setPages();

        for (key in this.pages) {
            var page = this.pages[key];

            var currentVector = {
                x: 0,
                y: -this.wheel.config.radius,
                originalX: this.wheel.halfSize,
                originalY: (2*this.wheel.config.radius + this.wheel.padding)
            };

            var prevArc = ((page.layersCount < 5) ? null : page.end);
            var nextArc = ((page.layersCount === 1) ? null : page.start + 1);
            var i = 0;
            for(key = page.start; key <= page.end; key++) {
                var config = {
                    key           : key,
                    currentVector : currentVector,
                    angleStep     : page.angleStep,
                    halfVector    : this.getNextVector(currentVector.x, currentVector.y, (page.angleStep / 2)),
                    nextVector    : this.getNextVector(currentVector.x, currentVector.y, page.angleStep),
                    prevArc       : prevArc,
                    nextArc       : nextArc,
                    options       : (this.wheel.config.options[key] ? this.wheel.config.options[key] : {}),
                    radius        : this.wheel.config.radius,
                    radiusStart   : this.wheel.startAt - (i * page.angleStep),
                    radiusStop    : this.wheel.startAt - ((i * page.angleStep) + page.angleStep)
                };

                this.layers.push(new Layer(this.wheel, config));

                currentVector = config.nextVector;

                prevArc = key;
                nextArc += 1;
                i++;
            }
            this.layers[key-1].next = ((page.layersCount < 5) ? null : page.start);
        }
        this.initNav();
    };

    LayerSet.prototype.getNextVector = function(x, y, angle) {
        var tx = parseInt(Math.round(x * Math.cos(angle)) - (y * Math.sin(angle)));
        var ty = parseInt(Math.round(x * Math.sin(angle)) + (y * Math.cos(angle)));

        return {
            x    : tx,
            y    : ty,
            originalX : this.wheel.halfSize + tx,
            originalY : this.wheel.halfSize - ty
        };
    };

    LayerSet.prototype.getDet = function(vecA, vecB) {
        return (vecA.x * vecB.y) - (vecA.y * vecB.x);
    };

    LayerSet.prototype.onLayer = function(posX, posY) {
        if ((Math.pow(posX,2) + Math.pow(posY,2)) <= Math.pow(this.navRadius, 2)) {
            if (this.getDet(this.nav.next.vectorStart , {x: posX, y: posY}) > 0) {
                if (this.getDet(this.nav.next.vectorStop, {x: posX, y: posY}) <= 0) {
                    if (this.hasNextPage())
                        return this.nav.next;
                }
                else {
                    if (this.wheel.parentWheel)
                        return this.nav.back;
                }
            }
            else {
                if (this.getDet(this.nav.prev.vectorStart , {x: posX, y: posY}) > 0) {
                    if (this.hasPrevPage())
                        return this.nav.prev;
                }
                else {
                    if (this.wheel.parentWheel)
                        return this.nav.back;
                }
            }
            
        }
        
        if ((Math.pow(posX,2) + Math.pow(posY,2)) <= Math.pow(this.wheel.config.radius, 2)) {
            var page = this.getActualPage();
            var next = page.start;

            for(i = page.start; i <= page.end; i++) {
                if (this.getDet(this.layers[next].vectorStart, {x: posX, y: posY}) > 0) {
                    if (this.getDet(this.layers[next].vectorStop, {x: posX, y: posY}) <= 0) {
                        break;
                    }
                    else {
                        next = this.layers[next].next;
                    }
                }
                else {
                    next = this.layers[next].prev;
                }
                if (next === null)
                    return false;
            }

            return this.layers[next];
            
        }
        return false;
    };

    //////////////////////////////////////
    // End of LayerSet class definition //
    //////////////////////////////////////


    /**
     * Definition of hint's class
     *
     * @params Object Object of wheel navi container.
     * @type Hint
     */

    var Hint = function() {
        this.handler   = $('<span>')
                       .appendTo('body');
        this.hide();
     };

     Hint.prototype.getPosition = function(wheel) {
        var position = (wheel.container.data('hint-position') ? wheel.container.data('hint-position') : wheel.config.hintPosition);
         
         var config = {
            padding         : '7px',
            'text-align'    : 'center',
            'font-weight'   : 'bold',
            'font-size'     : '12px',
            color           : wheel.config.fontColor,
            'font-family'   : 'Verdana',
            'box-shadow'    : '0 0 5px 1px #fff',
            'text-shadow'   : 'inset 1px 1px white, -1px -1px #444',
            'z-index'       : '10005',
            background      : wheel.config.color
        };

        if (position === 'below') {
            config.position = 'absolute';
            config.top      = wheel.currY + (wheel.padding * 2) + (wheel.config.radius * 2);
            config.left     = wheel.currX + wheel.padding;
            config.width    = wheel.config.radius * 2;
        }
        else if (position === 'above') {
            config.position = 'absolute';
            config.top      = wheel.currY - (wheel.padding * 2);
            config.left     = wheel.currX + wheel.padding;
            config.width    = wheel.config.radius * 2;
        }
        else if (position === 'fixed-top') {
            config.position = 'fixed';
            config.width    = wheel.config.radius * 4;
            config.top      = '0';
            config.left     = '50%';
            config['margin-left'] = -wheel.config.radius * 2;
        }
        
        return config;
    };

    Hint.prototype.hide = function() {
        this.handler.finish().fadeOut("fast");
        this.handler.text("");
    };

    Hint.prototype.show = function(text, wheel) {
        this.handler.css(this.getPosition(wheel));
        this.handler.text(text);
        this.handler.finish().fadeIn("fast");
    };
    //////////////////////////////////
    // End of Hint class definition //
    //////////////////////////////////

    /**
     * Definition of wheel class
     *
     * @param Object Object of wheel navi container.
     * @param Object Object with wheel configurations.
     * @type Wheel
     */
    var Wheel = function(container, config) {
        this.id       = container.prop('id');
        this.config   = this.prepareConfig(config);
        this.padding  = 20;
        this.startAt  = (0.5 * Math.PI);
        this.size     = 2 * this.config.radius + (this.padding * 2);
        this.halfSize = this.size / 2;
        this.centerX  = this.config.radius + this.padding;
        this.centerY  = this.config.radius + this.padding;
        this.container = container;
        this.container.css({
            position : this.config.position,
            margin   : 0,
            padding  : 0,
            display  : 'none',
            width    : this.size,
            height   : this.size,
            cursor   : 'pointer'
        });
        this.container.children('li').hide();
        this.canvas = $('<canvas>')
                .prop('id', this.id + 'Canvas')
                .prop('width', this.size)
                .prop('height', this.size)
                .css({
                    position  : 'absolute',
                    'z-index' : 10000,
                    left : 0,
                    top : 0
                })
                .appendTo(this.container);
        this.context     = this.canvasContent(this.id + 'Canvas');
        this.elemCount   = this.container.children('li').length;
        this.parentWheel = null;
        this.currX       = 0;
        this.currY       = 0;
        this.visible     = false;
        this.initialized = false;

        this.layers = new LayerSet(this);
    };

    Wheel.prototype.clear = function() {
        this.context.clearRect(0, 0, this.size, this.size);
    };

    Wheel.prototype.canvasContent = function(id) {
        var canvas = document.getElementById(id);
        return canvas.getContext("2d");
    };

    Wheel.prototype.prepareConfig = function(config) {
         if (config.size && definedRadiusSize[config.size]) {
             config.radius = definedRadiusSize[config.size];
         }
         return config;
    };

    Wheel.prototype.initLayers = function() {
        this.layers.init();

        if (!this.initialized) {
            this.container.mousemove(function(event) {
                var wheel = getWheel($(this).prop('id'));

                var layer = wheel.getCursorLayer(event.clientX, event.clientY);
                if (layer !== undefined) {
                    if (!layer.cursorOnLayer) {
                        wheel.clear();     
                        wheel.layers.mouseOutAll(layer.key);
                    }
                }
                else {
                    wheel.clear();
                    wheel.layers.mouseOutAll();
                    if (wheel.config.closeAction === 'onMouseOut')
                        wheel.hide();
                }
            });

            this.container.click(function(event) {
                var wheel = getWheel($(this).prop('id'));
                if (wheel.visible) {
                    var layer = wheel.getCursorLayer(event.clientX, event.clientY);
                    if (layer) {
                        layer.onClick(event);
                    }
                }
            });
            
            if (this.config.closeAction === 'onClickOutside')
                wheelsForClosing.push(this);
            
            this.initialized = true;
        }
    };

    Wheel.prototype.getCursorLayer = function(clientX, clientY) {
        var posX = clientX - this.currX - this.halfSize;
        var posY = -(clientY - this.currY - this.halfSize);

        return this.layers.onLayer(posX, posY);
    };

    Wheel.prototype.show = function(x, y, delay) {
        if (this.parentWheel) {
            this.currX = this.parentWheel.currX;
            this.currY = this.parentWheel.currY;
        }
        else {
            this.currX = (x - this.halfSize);
            this.currX = (this.currX > 0 ? this.currX : 0);
            this.currY = (y - this.halfSize);
            this.currY = (this.currY > 0 ? this.currY : 0);
        }

        this.container.css({
            left : this.currX,
            top  : this.currY
        });
        
        this.initLayers();
        this.layers.show();
        
        this.visible = true;
        this.container.fadeIn(delay);
    };

    Wheel.prototype.hide = function(delay) {
        this.visible = false;
        getHint().hide();
        this.container.fadeOut(delay);
    };
    ///////////////////////////////////
    // End of Wheel class definition //
    ///////////////////////////////////

}(jQuery, window));

$(function() {
    $('[data-wheel-navi]').each(function() {
        var id = $(this).data('wheel-navi');
        $(this).prop('id', id).wheelNavi();
    });

    $('[data-wheel-navi-target]').each(function() {
        var eventType = $(this).data('event');
        $(this).showNavi($(this).data('wheel-navi-target'), eventType);
    });
});