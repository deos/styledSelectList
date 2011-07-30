/**
@name:        styledSelectList
@description: A mootools class for a "fake" (html) select list, created from a normal select element
@author:      deos (deos.dev@gmail.com)
@version:     0.8
@license:     MIT

Options:
    wrapperClass           CSS class for wrapper div
    hideOnMouseleave       If true, list hides when mouse leaves it (default: false)
    hideOnMouseleaveDelay  Delay for mouse leave auto-hide in ms, is less annoying, 0 is instant-hide (default: 500)
    resizeOnWindowResize   If true, list gets resized on window resize, usefull if wrapper has no fixed with (default: false),
    smoothAnimation        If true, fade effects will be used (default: false)
    animationOptions       If smoothAnimation is true, animation options can be set here (its used as el.set('tween', options) so give it a options object),
    showListOnKeydown      If true, the list will get shown when keys are used while the list is in focus (for keyboard navigation) (default: true)
    showListOnFocus        If true, the list will get shown when it gets focused (default: true)

Events:
    optionSelected       Gets fired when a item gets selected
**/

var styledSelectList = new Class({
    Implements: [Options, Events],
    
    options: {
        /*
        onOptionSelected: function(selectedItem)
        */
        'wrapperClass': 'styledSelectList',
        'hideOnMouseleave': false,
        'hideOnMouseleaveDelay': 500,
        'resizeOnWindowResize': false,
        'smoothAnimation': false,
        'animationOptions': null,
        'showListOnKeydown': true,
        'showListOnFocus': true
    },
    
    initialize: function(elementId, options){
        var element = document.id(elementId);
        this.setOptions(options);        
        var self = this;
        
        //fetch the selected element when starting
        var selectedItem = element.getElements('option')[element.selectedIndex];
        
        //the current selected listitem gets stored here
        this.selectedListItem = null;
        
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
        this.wrapper = new Element('div', {
            'class': this.options.wrapperClass,
            'styles': {
                'display': 'inline-block'
            }
        }).inject(element, 'after');
        
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
                'margin-left': (-1 * this.wrapper.getStyle('border-left-width').toInt()),
                'margin-top': this.wrapper.getStyle('border-bottom-width').toInt()
            }
        }).inject(this.wrapper);
        
        if(this.options.smoothAnimation){
            this.ul.setStyle('display', 'block').fade('hide');
            
            if(this.options.animationOptions){
                this.ul.set('tween', this.options.animationOptions);    
            }
        }
        
        //set ul size and refresh it on window resize (if enabled)
        this.setListSize();
        if(this.options.resizeOnWindowResize){
            window.addEvent('resize', this.setListSize.bind(this));
        }
    
        //show and hide the list when clicking on the main element
        this.selectedOptionTextElement.addEvents({
            'click': function(e){
                if(e){ e.preventDefault(); }
                this.toggleOptionList();
            }.bind(this),
            'keydown': function(e){
                if(e.key=='enter' || e.key=='space'){
                    e.stop();
                    this.toggleOptionList();
                }
                else{
                    if(!['esc', 'delete', 'tab'].contains(e.key)){
                        e.stop();
                        if(this.options.showListOnKeydown){
                            this.showOptionList();
                        }
                    }

                    if(e.key=='up'){
                        var previous = this.selectedListItem.getPrevious('li');
                        if(previous){
                            this.selectItem(previous, true);
                        }
                    }
                    else if(e.key=='down'){
                        var next = this.selectedListItem.getNext('li');
                        if(next){
                            this.selectItem(next, true);
                        }                    
                    }
                    else if(!['left', 'right', 'esc', 'delete', 'tab'].contains(e.key)){
                        //entry search on input follows here... someday...
                    }
                }
            }.bind(this),
            'focus': function(e){
                this.wrapper.addClass('focused');

                if(this.options.showListOnFocus){
                    this.showOptionList();
                    
                    this.preventToggle = true;
                    (function(){ this.preventToggle = false; }).delay(100, this);
                    
                    clearTimeout(hideTimeout);
                }
            }.bind(this),
            'blur': function(){
                this.wrapper.removeClass('focused');

                //hide list on blur, but do it delayed so clicks dont get into nowhere
                clearTimeout(hideTimeout);
                hideTimeout = (function(){ this.hideOptionList(); }).delay(100, this);
            }.bind(this)
        });
        
        //hide list after a while when leaving it
        if(this.options.hideOnMouseleave && this.options.hideOnMouseleaveDelay>=0){
            var hideTimeout = null;
            this.wrapper.addEvents({
                'mouseenter': function(){
                    clearTimeout(hideTimeout);
                }.bind(this),
                'mouseleave': function(){
                    clearTimeout(hideTimeout);
                    hideTimeout = (function(){
                        this.hideOptionList();  
                    }).delay(this.options.hideOnMouseleaveDelay, this);
                }.bind(this)
            });
        }
        
        //create the option list
        element.getChildren('option').each(function(opt, i){
            var li = new Element('li', {
                'html': opt.get('html'),
                'events': {
                    'click': function(e){
                        if(e){ e.preventDefault(); }
                        self.selectItem(this);
                    }    
                }
            }).store('optionValue', opt.getAttribute('value') || '').inject(this.ul);

            //is it the selected item?
            if(i==element.selectedIndex){
                this.selectedListItem = li;
            }
        }, this);

        //mark selected item
        this.selectedListItem.addClass('selected');
        
        //the old element is done for now, destroy it
        element.destroy();
    },
    
    toggleOptionList: function(){
        if(!this.preventToggle){
            if(this.options.smoothAnimation){
                 this.ul.fade('toggle');
            }
            else{
                this.ul.setStyle('display', (this.ul.getStyle('display')=='none' ? 'block' : 'none'));
            }
        }
    },
    
    showOptionList: function(){
         if(this.options.smoothAnimation){
             this.ul.fade('in');
        }
        else{
            this.ul.setStyle('display', 'block');
        }
    },
        
    hideOptionList: function(){
         if(this.options.smoothAnimation){
             this.ul.fade('out');
        }
        else{
            this.ul.setStyle('display', 'none');
        }
    },
        
    selectItem: function(item, dontCloseList){
        if(this.selectedOptionValueElement.get('value')!=item.retrieve('optionValue')){
            this.selectedOptionTextElement.set('html', item.get('html'));
            this.selectedOptionValueElement.set('value', item.retrieve('optionValue')).fireEvent('change');
            
            this.selectedListItem.removeClass('selected');
            this.selectedListItem = item;
            this.selectedListItem.addClass('selected');
            
            this.fireEvent('optionSelected', [item]);
        }
        
        if(!dontCloseList){
            this.hideOptionList();
        }
    },
        
    setListSize: function(){
        var targetSize = this.selectedOptionTextElement.getSize().x;
        targetSize += this.wrapper.getStyle('border-left-width').toInt() + this.wrapper.getStyle('border-right-width').toInt();
        targetSize -= this.ul.getStyle('border-left-width').toInt() + this.ul.getStyle('border-right-width').toInt();
        this.ul.setStyle('width', targetSize);
    }        
});