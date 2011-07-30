var styledSelectList = new Class({
    Implements: [Options, Events],
    
    options: {
        'wrapperClass': 'styledSelectList',
        'hideListAfter': 600,
        'resizeOnWindowResize': true,
        'smoothAnimation': true
    },
    
    initialize: function(elementId, options){
        var element = document.id(elementId);
        this.setOptions(options);        
        var self = this;
        
        //fetch the selected element when starting
        var selectedItem = element.getElements('option')[element.selectedIndex];
        
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
        this.selectedOptionTextElement = new Element('div', { html: selectedItem.get('html') }).inject(this.wrapper);
        
        //ul list as list for option elements
        var ul = new Element('ul', {
            'styles': {
                'position': 'absolute',
                'z-index': 10000,
                'display': 'none',
                'margin-left': (-1 * this.wrapper.getStyle('border-left-width').toInt()),
                'margin-top': this.wrapper.getStyle('border-bottom-width').toInt()
            }
        }).inject(this.wrapper);
        
        if(this.options.smoothAnimation){
            ul.setStyle('display', 'block').fade('hide');
        }
        
        //set ul size (and refresh it on window resize if enabled)
        var setMenuSize = function(){
            var targetSize = this.selectedOptionTextElement.getSize().x;
            targetSize += this.wrapper.getStyle('border-left-width').toInt() + this.wrapper.getStyle('border-right-width').toInt();
            targetSize -= ul.getStyle('border-left-width').toInt() + ul.getStyle('border-right-width').toInt();
            ul.setStyle('width', targetSize);
        }.bind(this);
        
        if(this.options.resizeOnWindowResize){
            window.addEvent('resize', setMenuSize);
        }
        
        setMenuSize();
        
        //show and hide the list when clicking on the main element
        this.selectedOptionTextElement.addEvent('click', function(e){
            if(e){ e.preventDefault(); }
            if(this.options.smoothAnimation){
                ul.fade('toggle');
            }
            else{
                ul.setStyle('display', (ul.getStyle('display')=='none' ? 'block' : 'none'));
            }
        }.bind(this));
        
        //hide list after a while when leaving it
        if(this.options.hideListAfter){
            var hideTimeout = null;
            this.wrapper.addEvent('mouseenter', function(){
                clearTimeout(hideTimeout);
            }.bind(this));
            this.wrapper.addEvent('mouseleave', function(){
                clearTimeout(hideTimeout);
                if(ul.getStyle('display')!='none'){
                    hideTimeout = (function(){
                        if(this.options.smoothAnimation){
                            ul.fade('out');
                        }
                        else{
                            ul.setStyle('display', 'none');
                        }    
                    }).delay(this.options.hideListAfter, this);
                }
            }.bind(this));
        }
        
        //create the option list
        element.getChildren('option').each(function(opt){
            new Element('li', { 'html': opt.get('html') })
                .store('optionValue', opt.getAttribute('value') || '')
                .addEvent('click', function(e){
                    if(e){ e.preventDefault(); }
                    
                    if(self.selectedOptionValueElement.get('value')!=this.retrieve('optionValue')){
                        self.selectedOptionTextElement.set('html', this.get('html'));
                        self.selectedOptionValueElement.set('value', this.retrieve('optionValue')).fireEvent('change');
                    }
                    
                    if(self.options.smoothAnimation){
                        ul.fade('out');
                    }
                    else{
                        ul.setStyle('display', 'none');
                    }   
                })
                .inject(ul);
        });
        
        //the old element is done for now, destroy it
        element.destroy();
    }
});