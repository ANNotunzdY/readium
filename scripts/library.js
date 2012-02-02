(function() {
	
	var _lawnchair;
	
	var getViewBookUrl = function(book) {
		return "/views/viewer.html?book=" + book.key;
	};
	
	var getDeleteLink = function(book) {
		var confMessage = "Are you sure you want to perminantly delete "
		return "<a class='delete-link btn danger' href='#' data-key='"+book.key+"' data-confirm='"+ confMessage + book.title +"'>delete</a>";
	};
	
	var getBookHtml = function(book) {
		var html;
		html  = "<div class='library-item row' id='" + book.key + "'>";
		html += "<div class='span3'>";
		html += "<ul class='media-grid'><li><a href='" + getViewBookUrl(book) + "'>";
		html += "<img class='thumbnail' src='" + book.cover_href + "' width='150' height='220' ></a></li>";
		html += "</ul></div><div class='span11'>"
		html += "<h3>" + book.title + "</h3>";
		
		html += "<div>author: " + book.author + "</div>";			
		html += "<div>added: " + book.created_at.toString() + "</div>";
		html += "<div>id: " + book.id + "</div>";
		html += "<div>key: " + book.key + "</div>";
		html += "<div><a class='btn' href='" + getViewBookUrl(book) +"'>view</a>";
		html += getDeleteLink(book) + "</div>"
		html += "</div></div>";
		return html;
	};
	
	var removeFiles = function(book, callback) {
		Readium.FileSystemApi(function(fs) {
			fs.rmdir(book.key);
			callback();
		});
	};
	
	var deleteBook = function(key) {
		Lawnchair(function() {
			var that = this;
			this.get(key, function(book) {
				if(book) {
					removeFiles(book, function() {	
						that.remove(key);				
						$("#" + key).toggle('fast');
					});
				}
			});		
		})

	};

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
		$('#library-container').html(html);
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
	};
		
	var handleFileSelect = function(evt) {
		var files = evt.target.files; // FileList object
		var url = window.webkitURL.createObjectURL(files[0]);
		
	    // Create a new window to the info page.
	    chrome.windows.create({ url: ('/views/extractBook.html#' + url), width: 1200, height: 760 });
	};
	
	var clickHandler = function(evt) {
		var input = document.getElementById('book-url');
		if(input.value === null || input.value.length < 1) {
			alert("invalid url, cannot process");
		}
		else {
			var url = input.value;
			chrome.windows.create({ url: ('/views/extractBook.html#' + url), width: 1200, height: 760 });
		}
	};

	

	$(function() {
		document.getElementById('files').addEventListener('change', handleFileSelect, false);
		document.getElementById('url-button').addEventListener('click', clickHandler, false);
		_lawnchair = new Lawnchair(function() {
			this.all(function(all) {
				addLibraryBooks(all);				
			});
		});
	});

})();


