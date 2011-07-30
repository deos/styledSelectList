var styledSelectList = new Class({
    Implements: [Options, Events],
    
    options: {
        'wrapperClass': 'styledSelectList'        
    },
    
    initialize: function(element, options){
        this.element = document.id(element);
        this.setOptions(options);  
       
        this.wrapper = new Element('div', { 'class': this.options.wrapperClass }).inject(this.element, 'after');
        
        var selectedItem = this.element.getElements('option')[this.element.selectedIndex];
        
        new Element('div', { html: selectedItem.get('html') }).inject(this.wrapper);
        
        var ul = new Element('ul').inject(this.wrapper);

        this.element.getChildren('option').each(function(opt){
            new Element('li', { 'html': opt.get('html') })
                .store('optionValue', opt.get('value'))
                .inject(ul);
        });
            
        new Element('input', { 'typ': 'text', 'value': selectedItem.get('value') });
    },
        
    toElement: function(){
        return this.element;   
    }
    
});
