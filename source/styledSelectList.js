/**
 @name:        styledSelectList
 @description: A mootools class for a "fake" (html) select list, created from a normal select element
 @author:      deos (deos.dev@gmail.com)
 @version:     0.9
 @license:     MIT
 
 Options:
 wrapperClass             CSS class for wrapper div
 optgroupClass            CSS class for optgroup elements
 optgroupChildClass       CSS class for the option elements within optgroup elements
 disabledClass            CSS class for disabled options and optgroups
 hideOnMouseleave         If true, list hides when mouse leaves it (default: false)
 hideOnMouseleaveDelay    Delay for mouse leave auto-hide in ms, is less annoying, 0 is instant-hide (default: 500)
 resizeOnWindowResize     If true, list gets resized on window resize, usefull if wrapper has no fixed with (default: false)
 smoothAnimation          If true, fade effects will be used (default: false)
 animationOptions         If smoothAnimation is true, animation options can be set here (its used as el.set('tween', options) so give it a options object)
 showListOnKeydown        If true, the list will get shown when keys are used while the list is in focus (for keyboard navigation) (default: true)
 showListOnFocus          If true, the list will get shown when it gets focused (default: true)
 keepListOnSelect         If true, the list wont close if something is selected by mouseclick, otherwise the list will loose focus (default: true)
 showListOnHoverSelected  If true, the list will get shown when hovering over the element if it is selected
 scrollContainer          The container element to position the list within, to prevent overflow out of the page/container (default: window)
 shrinkListWidth          If this option is >0, the list width gets shrinked by the amounth of px, e.g. for placing it under rounded corners (default: 0)
 fallBackToOptionText     If this option is true, the select will take the text of the option elements as value if they dont have a value attribute (default: true)
 keepAttributes           An array of attributes that should be kept from the original select element and gets cloned onto the wrapper element
 keepAttributes           An array of styles that should be kept from the original select element and gets cloned onto the wrapper element
 keys                     Contains a object with keys to use for the tasks toggle, previous, next and ignore. each is a array of keys as string
 
 Events:
 optionSelected           Gets fired when a item gets selected
 
 Notice:
 You better set tabindex for all inputs/selects in your form (including the styled ones) if you want good keyboard navigation
 **/

var styledSelectList = new Class({
    Implements: [Options, Events],

    options: {
        /*
        onOptionSelected: function(selectedItem)
        */
        'wrapperClass': 'styledSelectList',
        'optgroupClass': 'styledSelectOptGroup',
        'optgroupChildClass': 'styledSelectGrouped',
        'disabledClass': 'styledSelectDisabled',
        'hideOnMouseleave': false,
        'hideOnMouseleaveDelay': 500,
        'resizeOnWindowResize': false,
        'smoothAnimation': false,
        'animationOptions': null,
        'showListOnKeydown': true,
        'showListOnFocus': true,
        'keepListOnSelect': true,
        'showListOnHoverSelected': true,
        'scrollContainer': window,
        'shrinkListWidth': 0,
        'fallBackToOptionText': true,
        'keepAttributes': ['class'],
        'keepStyles': [],
        'keys': {
            toggle: ['space', 'enter'],
            previous: ['up'],
            next: ['down'],
            ignore: ['esc', 'delete', 'tab']
        }
    },

    initialize: function(elementId, options) {
        var element = document.id(elementId);
        this.setOptions(options);
        var self = this;

        //fetch the selected element when starting
        var selectedItem = element.getElements('option')[element.selectedIndex];

        //the current selected listitem gets stored here
        this.selectedListItem = null;

        //init timer
        var hideTimeout = null,
            focusTimeout = null;

        //create a hidden input field for the current value
        //(events for the select gets redirected here, so 'change' events for the select still work)
        this.selectedOptionValueElement = new Element('input', {
            'typ': 'text',
            'name': element.get('name'),
            'id': element.get('id'),
            'value': selectedItem.getAttribute('value'),
            'class': element.get('class'),
            'styles': {
                'display': 'none'
            }
        }).cloneEvents(element).inject(element, 'after');

        //create the main wrapper element
        this.wrapper = new Element('div')
            .set(element.get(this.options.keepAttributes))
            .setStyles(element.getStyles(this.options.keepStyles))
            .addClass(this.options.wrapperClass)
            .setStyle('display', 'inline-block')
            .inject(element, 'after');

        //element for showing the current status
        this.selectedOptionTextElement = new Element('div', {
            'html': selectedItem.get('html'),
            'tabindex': element.getAttribute('tabindex') || 100
        }).inject(this.wrapper);

        //ul list as list for option elements
        this.ul = new Element('ul', {
            'tabindex': -1,
            'styles': {
                'position': 'absolute',
                'z-index': 10000,
                'display': 'none',
                'margin-left': (-1 * this.wrapper.getStyle('border-left-width').toInt() + (this.options.shrinkListWidth / 2).toInt()),
                'margin-top': this.wrapper.getStyle('border-bottom-width').toInt()
            },
            'events': {
                'focus': function() {
                    clearTimeout(focusTimeout);
                    clearTimeout(hideTimeout);
                },
                'mouseup': function() {
                    this.preventItemFocus = true;
                    this.selectedOptionTextElement.focus();
                }.bind(this)
            }
        }).inject(this.wrapper);

        if (this.options.smoothAnimation) {
            this.ul.setStyle('display', 'block').fade('hide');

            if (this.options.animationOptions) {
                this.ul.set('tween', this.options.animationOptions);
            }
        }

        //set ul size and refresh it on window resize (if enabled)
        this.setListSize();
        if (this.options.resizeOnWindowResize) {
            window.addEvent('resize', this.setListSize.bind(this));
        }

        //show and hide the list when clicking on the main element and handle keyboard
        this.selectedOptionTextElement.addEvents({
            'click': function(e) {
                if (e) {
                    e.preventDefault();
                }
                this.toggleOptionList();
            }.bind(this),
            'keydown': function(e) {
                if (!this.options.keys.ignore.contains(e.key) && !e.control && !e.meta) {
                    e.stop();

                    //workaround for a IE / webkit bug, arrow keys dont fire keypress events...
                    if (Browser.ie || Browser.safari || Browser.chrome) {
                        this.fireEvent('keypress', [e, true]);
                    }
                }
            }.bind(this),
            'keyup': function(e) {
                if (!this.options.keys.ignore.contains(e.key) && !e.control && !e.meta) {
                    e.stop();
                }
            }.bind(this),
            'keypress': function(e, keyDownEvent) {
                if (!this.options.keys.ignore.contains(e.key) && !e.control && !e.meta) {
                    e.stop();

                    if (this.options.keys.toggle.contains(e.key)) {
                        this.toggleOptionList();
                    }
                    else {
                        if (this.options.showListOnKeydown) {
                            clearTimeout(hideTimeout);
                            this.showOptionList();
                        }

                        if (this.options.keys.previous.contains(e.key)) {
                            this.selectPreviousItem();
                        }
                        else if (this.options.keys.next.contains(e.key)) {
                            this.selectNextItem();
                        }
                        else if (!keyDownEvent) {
                            //entry search/filtering on input follows here... someday... maybe...
                            var key = ((/^\w$/.test(e.key) && e.shift) ? e.key.toUpperCase() : e.key);
                            //alert(key);
                        }
                    }
                }
            }.bind(this),
            'focus': function(e) {
                clearTimeout(focusTimeout);
                this.wrapper.addClass('focused');

                if (this.options.showListOnFocus) {
                    this.showOptionList();

                    this.preventToggle = true;
                    (function() {
                        this.preventToggle = false;
                    }).delay(100, this);

                    clearTimeout(hideTimeout);
                }
            }.bind(this),
            'blur': function() {
                //delaying the class removal so it gets less strange styling effects
                focusTimeout = (function() {
                    this.wrapper.removeClass('focused');
                }).delay(100, this);

                //hide list on blur, but do it delayed so clicks dont get into nowhere
                clearTimeout(hideTimeout);
                hideTimeout = (function() {
                    this.hideOptionList();
                }).delay(100, this);
            }.bind(this)
        });

        //hide list after a while when leaving it
        if (this.options.hideOnMouseleave && this.options.hideOnMouseleaveDelay >= 0) {
            this.wrapper.addEvents({
                'mouseenter': function() {
                    clearTimeout(hideTimeout);

                    if (this.options.showListOnHoverSelected && this.wrapper.hasClass('focused')) {
                        this.showOptionList();
                    }
                }.bind(this),
                'mouseleave': function() {
                    clearTimeout(hideTimeout);
                    hideTimeout = (function() {
                        this.hideOptionList();
                    }).delay(this.options.hideOnMouseleaveDelay, this);
                }.bind(this)
            });
        }

        //helper function for creating the list elements
        var createItem = function(opt, i, optgroupChild, optgroupDisabled) {
            var li = new Element('li');

            //set text and value
            if (opt.get('tag') == 'optgroup') {
                li.set('html', opt.get('label'));
            }
            else {
                li.set('html', opt.get('text'))
                    .store('optionValue', (opt.getAttribute('value') !== null ? opt.getAttribute('value') : (this.options.fallBackToOptionText ? opt.get('text') : '')));
            }

            //set events
            if (opt.get('tag') == 'optgroup' || opt.get('disabled') || optgroupDisabled) {
                //no real events for optgroups and disabled elements
                li.addEvents({
                    'click': function(e) {
                        if (e) {
                            e.preventDefault();
                        }
                    },
                    'mouseup': function(e) {
                        e.stop();
                    }
                });
            }
            else {
                //normal elements have sth to do
                li.addEvents({
                    'click': function(e) {
                        if (e) {
                            e.preventDefault();
                        }
                        self.selectItem(this);
                    },
                    'mouseup': function(e) {
                        e.stop();
                    }
                });
            }

            //set classes
            if (opt.get('tag') == 'optgroup') {
                li.addClass(this.options.optgroupClass);
            }
            else if (optgroupChild) {
                li.addClass(this.options.optgroupChildClass);
            }
            
            if(opt.get('disabled') || optgroupDisabled){
                li.addClass(this.options.disabledClass);    
            }

            //add it to the list
            li.inject(this.ul);

            //is it the selected item?
            if (opt.get('tag') == 'option' && i == element.selectedIndex && !opt.get('disabled') && !optgroupDisabled) {
                this.selectedListItem = li;
            }
        }.bind(this);

        //create the option list
        var i = 0;
        element.getChildren('option, optgroup').each(function(opt) {
            createItem(opt, i);

            if (opt.get('tag') == 'optgroup') {
                opt.getChildren('option').each(function(el) {
                    createItem(el, i++, true, opt.get('disabled'));
                });
            }
            else {
                i++;
            }
        }, this);

        //if there is no selected item, use the first one. just to be sure
        if(!this.selectedListItem){
            this.selectedListItem = this.ul.getChildren('li:not(.' + this.options.optgroupClass + '):not(.' + this.options.disabledClass + ')')[0];
        }

        //mark selected item
        this.selectedListItem.addClass('selected');

        //handle list position on body scroll
        this.options.scrollContainer.addEvent('scroll', this.positionList.bind(this));

        //the old element is done for, now destroy it
        element.destroy();
    },

    toggleOptionList: function() {
        if (!this.preventToggle) {
            if (this.options.smoothAnimation) {
                this.ul.fade('toggle');
            }
            else {
                this.ul.setStyle('display', (this.ul.getStyle('display') == 'none' ? 'block' : 'none'));
            }

            this.positionList();
            this.focusCurrentItem();
        }
    },

    showOptionList: function() {
        if (this.options.smoothAnimation) {
            this.ul.fade('in');
        }
        else {
            this.ul.setStyle('display', 'block');
        }

        this.positionList();
        this.focusCurrentItem();
    },

    hideOptionList: function() {
        if (this.options.smoothAnimation) {
            this.ul.fade('out');
        }
        else {
            this.ul.setStyle('display', 'none');
        }
    },

    selectItem: function(item, dontCloseList) {
        if(item.hasClass(this.options.optgroupClass) || item.hasClass(this.options.disabledClass)){
            return false;   
        }
        
        if (this.selectedOptionValueElement.get('value') != item.retrieve('optionValue')) {
            this.selectedOptionTextElement.set('html', item.get('html'));
            this.selectedOptionValueElement.set('value', item.retrieve('optionValue')).fireEvent('change');

            this.selectedListItem.removeClass('selected');
            this.selectedListItem = item;
            this.selectedListItem.addClass('selected');

            this.focusCurrentItem();

            this.fireEvent('optionSelected', [item]);
        }

        if (!dontCloseList) {
            this.hideOptionList();

            if (this.options.keepListOnSelect) {
                this.selectedOptionTextElement.focus();
            }
        }
    },

    selectPreviousItem: function() {
        var previous = this.selectedListItem.getPrevious('li:not(.' + this.options.optgroupClass + '):not(.' + this.options.disabledClass + ')');
        if (previous) {
            this.selectItem(previous, true);
        }
    },

    selectNextItem: function() {
        var next = this.selectedListItem.getNext('li:not(.' + this.options.optgroupClass + '):not(.' + this.options.disabledClass + ')');
        if (next) {
            this.selectItem(next, true);
        }
    },

    focusCurrentItem: function() {
        var position = this.selectedListItem.getPosition(this.ul);
        if (position.x === 0 && !this.preventItemFocus) {
            var currentScroll = this.ul.getScroll(),
                ulSize = this.ul.getSize(),
                itemSize = this.selectedListItem.getSize();
            if (position.y < 0) {
                //scroll up
                this.ul.scrollTo(currentScroll.x, currentScroll.y + position.y);
            }
            else if (position.y + itemSize.y > ulSize.y) {
                //scroll down
                this.ul.scrollTo(currentScroll.x, position.y + itemSize.y + currentScroll.y - ulSize.y);
            }
            //notice: there sometimes is a 1px-calculation-error that seems to come from the browser, dont know (and cant help it)
        }
        this.preventItemFocus = false;
    },

    positionList: function() {
        var listSize = this.ul.getSize();

        if (listSize.y > 0) {
            this.ul.setStyles({
                'margin-top': this.wrapper.getStyle('border-bottom-width').toInt()
            });

            var container = (this.options.scrollContainer == window ? document.body : this.options.scrollContainer),
                listPosition = this.ul.getPosition(container),
                containerSize = container.getSize(),
                containerScroll = container.getScroll();

            //dont let the list stick out of the container!
            if (listPosition.y + listSize.y > containerSize.y + containerScroll.y) {
                this.ul.setStyles({
                    'margin-top': (-1 * listSize.y - this.wrapper.getSize().y + 1)
                }).addClass('upperPosition');
            }
            else {
                this.ul.removeClass('upperPosition');
            }
        }
    },

    setListSize: function() {
        var targetSize = this.selectedOptionTextElement.getSize().x;
        targetSize += this.wrapper.getStyle('border-left-width').toInt() + this.wrapper.getStyle('border-right-width').toInt();
        targetSize -= this.ul.getStyle('border-left-width').toInt() + this.ul.getStyle('border-right-width').toInt();
        targetSize -= this.options.shrinkListWidth;
        this.ul.setStyle('width', targetSize);
    },

    toElement: function() {
        return this.wrapper;
    }
});