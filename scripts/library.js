$(function() {

(function($) {
	
	window.LibraryItem = Backbone.Model.extend({

		idAttribute: "key",
		
		getViewBookUrl: function(book) {
			return "/views/viewer.html?book=" + this.get('key');
		},

		openInReader: function() {
			window.location = this.getViewBookUrl();
		},

		delete: function() {
			var key = this.get('key');
			Lawnchair(function() {
				var that = this; // <=== capture Lawnchair scope
				this.get(key, function(book) {
					if(book) {
						Readium.FileSystemApi(function(fs) {
							fs.rmdir(book.key);
							that.remove(key);
						});
					}
				});		
			});
		}
	});

	window.LibraryItems = Backbone.Collection.extend({

		model: LibraryItem,
		
	});

	window.LibraryItemView = Backbone.View.extend({

		tagName: 'div',

		className: "book-item clearfix",

		template: _.template( $('#library-item-template').html() ),

		initialize: function() {
			_.bindAll(this, "render");	
		},

		render: function() {
			var renderedContent = this.template(this.model.toJSON());
			$(this.el).html(renderedContent);
			return this;
		},

		events: {
			"click .delete": function(e) {
				e.preventDefault();
				var confMessage;
				var selector = "#details-modal-" + this.model.get('key');
				confMessage  = "Are you sure you want to perminantly delete " 
				confMessage += this.model.get('title');
				confMessage += "?";


				if(confirm(confMessage)) {
					$(selector).modal('hide');
					this.model.delete();
					this.remove();
				}
			},

			"click .read": function(e) {
				this.model.openInReader();
			}
			
		}
	});

	window.LibraryItemsView = Backbone.View.extend({
		tagName: 'div',

		id: "library-items-container",

		className: 'row-view clearfix',

		template: _.template( $('#library-items-template').html() ),

		initialize: function() {
			_.bindAll(this, "render");
			this.collection.bind('reset', this.render);
			this.collection.bind('add',   this.addOne, this);
		},

		render: function() {
			var collection = this.collection;
			var $container = $(this.el);
			$container.html(this.template({}));
			this.$('#empty-message').toggle(this.collection.isEmpty());

			collection.each(function(item) {
				var view = new LibraryItemView({
					model: item,
					collection: collection,
					id: item.get('id')
				});
				$container.append( view.render().el );

			});
			
			// i dunno if this should go here
			$('#library-books-list').html(this.el)
			return this;
		},

		addOne: function(book) {
			var view = new LibraryItemView({
				model: item,
				collection: collection,
				id: item.get('id')
			});
			$(this.el).append( view.render().el );
		},

		events: {
			
		}
	});

	// Does this need to be here???? I dont think so....
	var addLibraryBooks =  function(records) {
		var html;
		if(records.length === 0) {
			html = "<p>Your book list is empty</p>";
		}
		else {
			html = ""
			for(var i = 0; i < records.length; i++) {
				html += getBookHtml(records[i]);
			}
			
		}
		$('#library-items-container').html(html);
		$('.delete-link').click(function(e) {
			var key;
			var $this = $(this);
			var confirmed = confirm( $(this).attr("data-confirm") );
			e.preventDefault();
			if( confirmed ) {
				key = $(this).attr("data-key");
				deleteBook(key);		
			} 
			
		});
		$('#loading-message').remove();
	};

	window.ExtractItem = Backbone.Model.extend({
		
		updateProgress: function(index, total) {
			var prog = index * 100 / total;
			this.set({
				progress: prog.toFixed().toString() + "%",
			});
		},

		start: function() {
			this.set({
				message: "Fetching ePUB",
				progress: 0,
				extracting: true
			});
		},

		end: function() {
			this.set({
				message: "Fetching ePUB",
				progress: 0,
				extracting: false
			});
		}


	});

	window.ExtractItemView = Backbone.View.extend({
		
		el: $('#progress-container')[0],

		template: _.template( $('#extracting-item-template').html() ),

		initialize: function() {
			_.bindAll(this, "render");	
			this.model.bind('change', this.render, this);
		},

		render: function() {
			var $el = $(this.el);
			if( this.model.get('extracting') ) {
				
				$el.html(this.template(this.model.toJSON()));
				$el.show("slow");
			}
			else {
				$el.hide("slow");
			}
			return this;
		}
	});
		
	window.extraction = new ExtractItem({extracting: false});
	window.extract_view = new ExtractItemView({model: extraction});
	extract_view.render();

	window.Library = new LibraryItems();
	window.lib_view = new LibraryItemsView({collection: window.Library});



	

})(jQuery);

var beginExtraction = function(url) {
	 // Create a new window to the info page.
	 window.extraction.start();

	var extractOptions = {
		display_message: function(message) {
			window.extraction.set({
				message: message
			});
		},

		update_progress: function(x, y) {
			window.extraction.updateProgress(x,y);
		}
	};
	
	Readium.ExtractBook(url, function(book) {
			window.extraction.end();
			window.Library.add(new window.LibraryItem(book));
			setTimeout(function() {
				chrome.tabs.create({url: "/views/viewer.html?book=" + book.key });
			}, 800);
		}, function() {
			/* wah wah :( */
		}, extractOptions);
};

var resetAndHideForm = function() {
	$('#add-book-modal').modal('hide');
};

var handleFileSelect = function(evt) {
	var files = evt.target.files; // FileList object
	var url = window.webkitURL.createObjectURL(files[0]);
	beginExtraction(url);
	resetAndHideForm();
};

var clickHandler = function(evt) {
	var input = document.getElementById('book-url');
	if(input.value === null || input.value.length < 1) {
		alert("invalid url, cannot process");
	}
	else {
		var url = input.value;
		beginExtraction(url);
		resetAndHideForm();
	}
};

var flash = function(text, type) {
	var className = "alert";
	if(type) {
		className += " alert-" + type;
	}
	$('#flash-container').
		html('<div>'+text+'</div>').
		removeClass().
		addClass(className);
	
}


	document.getElementById('files').addEventListener('change', handleFileSelect, false);
	document.getElementById('url-button').addEventListener('click', clickHandler, false);
	_lawnchair = new Lawnchair(function() {
		this.all(function(all) {
			window.Library.reset(all);							
		});
	});
	$("#block-view-btn").click(function(e) {
		$('#library-items-container').addClass("block-view").removeClass("row-view")
	});
	$("#row-view-btn").click(function(e) {
		$('#library-items-container').addClass("row-view").removeClass("block-view")
	})
	
});


