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
		html  = "<div class='book-item clearfix' id='" + book.key + "'>";
		html += "<div class='info-wrap clearfix'><div class='caption book-info'>";
		html += "<h3 class='green'>"+ book.title +"</h3>";
		html += "<h6>"+ book.author +"</h6>";
		html += "</div>";
		html += "<img class='cover-image' src='" + book.cover_href + "' width='150' height='220' >";
		html += "</div>";
		html += '<div class="caption clearfix buttons">';
		html +=	'<a href="' + getViewBookUrl(book) + '" class="btn read">Read</a>'; 
		html +=	'<a href="' + getDeleteLink(book) + '" class="btn details">Details</a>';
		html += "</div>";
		html += "</div>";
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
		$("#block-view-btn").click(function(e) {
			$('#library-items-container').addClass("block-view").removeClass("row-view")
		});
		$("#row-view-btn").click(function(e) {
			$('#library-items-container').addClass("row-view").removeClass("block-view")
		})
		
	});

})();


