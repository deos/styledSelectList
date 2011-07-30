var styledSelectList = new Class({
    Implements: [Options, Events],
    
    options: {
        'wrapperClass': 'styledSelectList'        
    },
    
    initialize: function(element, options){
        element = document.id(element);
        this.setOptions(options);
        
        var self = this;
        
        var selectedItem = element.getElements('option')[element.selectedIndex];
        
        this.selectedOptionValueElement = new Element('input', {
            'typ': 'text',
            'value': selectedItem.getAttribute('value'),
            'class': element.get('class'),
            'styles': {
                'display': 'none'
            }
        }).cloneEvents(element).inject(element, 'after');
       
        this.wrapper = new Element('div', {
            'class': this.options.wrapperClass
        }).inject(element, 'after');
        
        this.selectedOptionElement = new Element('div', { html: selectedItem.get('html') }).inject(this.wrapper);
        
        var ul = new Element('ul').inject(this.wrapper);

        element.getChildren('option').each(function(opt){
            new Element('li', { 'html': opt.get('html') })
                .store('optionValue', opt.getAttribute('value') || '')
                .addEvent('click', function(e){
                    if(e){ e.preventDefault(); }

                    if(self.selectedOptionValueElement.get('value')!=this.retrieve('optionValue')){
                        self.selectedOptionElement.set('html', this.get('html'));
                        self.selectedOptionValueElement.set('value', this.retrieve('optionValue')).fireEvent('change');
                    }
                })
                .inject(ul);
        });
        
        element.destroy();
    },
        
    toElement: function(){
        return this.element;   
    }
    
});