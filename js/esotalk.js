// Copyright 2009 Simon Zerner, Toby Zerner
// This file is part of esoTalk. Please see the included license file for usage information.

// document.getElementById shortcut.
function getById(id) {
	return document.getElementById(id) || null;
};

// Get elements by their class name.
function getElementsByClassName(parent, className) {
	var found = [];
	var elements = parent.getElementsByTagName("*");
	for (var i = 0; i < elements.length; i++) {
		var classes = elements[i].className.split(" ");
		for (var j in classes) if (classes[j] == className) found.push(elements[i]);
	}
	return found;
};

// Determine whether an object is an array or not.
function isArray(array) {
  return Object.prototype.toString.call(array) === "[object Array]";
};

/*
Easing Equations v1.5
May 1, 2003
(c) 2003 Robert Penner, all rights reserved. 
This work is subject to the terms in http://www.robertpenner.com/easing_terms_of_use.html.  
*/
Math.easeOutQuart = function (t, b, c, d) {
	return -c * ((t=t/d-1)*t*t*t - 1) + b;
};


// Animation class: enables quick and easy animations. Example usage:
// (new Animation(function(height) {element.height = height + "px";}, {begin: 0, end: 100})).start();
var Animation = function(callback, parameters) {
	parameters = parameters || {};
	this.callback = callback;
	this.timeout = null;
	this.begin = parameters.begin || 0;
	this.end = parameters.end || 0;
	this.duration = parameters.duration || 20;
	this.easing = parameters.easing || Math.easeOutQuart;
	this.frame = 0;
	this.stopped = true;	
};

// Stop the animation.
Animation.prototype.stop = function() {
	clearTimeout(this.timeout);
	this.stopped = true;
};

// Start the animation.
Animation.prototype.start = function() {
	if (!this.stopped) return;
	
	// If the user has disabled animations, skip straight to the final frame.
	if (typeof esoTalk != "undefined" && esoTalk.disableAnimation) this.finalize();
	
	// Otherwise, proceed to the first frame of animation.
	else {
		this.stopped = false;
		this.nextFrame();
	}
};

// Apply the next frame in the animation.
Animation.prototype.nextFrame = function() {
	var animation = this;
	
	// If the begin and end parameters are arrays, progress each of the elements individually.
	if (isArray(this.begin) && isArray(this.end)) {
		this.frame++;
		var result = [];
		for (var i in this.begin) result.push(this.easing(this.frame, this.begin[i], this.end[i] - this.begin[i], this.duration));
	}
	// Otherwise, progress the value normally. 
	else var result = this.easing(this.frame++, this.begin, this.end - this.begin, this.duration);
	
	// Call the animation callback with the new value(s).
	this.callback(result);
	
	// Set a timeout for the next frame, or finalize the animation if finished.
	if (this.frame <= this.duration) this.timeout = setTimeout(function(){animation.nextFrame();}, 10);
	else this.finalize();
};

// Finalize the animation; call the animation callback with the final value.
Animation.prototype.finalize = function() {
	this.stopped = true;
	this.callback(this.end, true);
};


// Wrap a new div around an element with overflow:hidden, so we can change the height of the element for animations.
function createOverflowDiv(element) {
	if (!element) return false;
	
	// If there's already an overflow div, use that.
	if (element.parentNode.className.indexOf("overflowDiv") != -1) return element.parentNode;
	
	// Otherwise, create one, insert it before the post, and move the post inside it.
	overflowDiv = document.createElement("div");
	overflowDiv.style.overflow = "hidden";
	overflowDiv.className = "overflowDiv";
	element.parentNode.insertBefore(overflowDiv, element);
	overflowDiv.appendChild(element);
	return overflowDiv;
};

// Show/hide an element. An animation can be applied using options = {animation: type}.
function toggle(element, options) {
	if (typeof element.showing == "undefined") element.showing = element.style.display != "none";
	element.showing ? hide(element, options) : show(element, options);
};
function show(element, options) {
	element.style.display = "";
	element.showing = true;
	animate(element, options);
};
function hide(element, options) {
	element.style.display = "none";
	element.showing = false;
	animate(element, options);
};

// Animate the showing/hiding of an element.
function animate(element, options) {
	if (!options) return;
	switch (options.animation) {
		case "verticalSlide":
		case "horizontalSlide":
			// Create an overflow div to perform the animation on. Set some default attributes.
			var overflowDiv = createOverflowDiv(element);
			if (!overflowDiv.style.display) overflowDiv.style.display = element.showing ? "none"
				: (options["animation"] == "horizontalSlide" ? "inline-block" : "block");
			if (!overflowDiv.style.opacity) overflowDiv.style.opacity = element.showing ? 0 : 1;
			
			// Get the starting height/width and opacity of the overflow div.
			element.style.display = "";
			var initLength = options["animation"] == "verticalSlide" ? overflowDiv.offsetHeight : overflowDiv.offsetWidth;
			var initOpacity = parseFloat(overflowDiv.style.opacity);
			
			// Now show the overflow div and get the final length from it.
			overflowDiv.style.display = options["animation"] == "horizontalSlide" ? "inline-block" : "block";
			overflowDiv.style.overflow = "hidden";
			var finalLength = options["animation"] == "verticalSlide" ? overflowDiv.offsetHeight : overflowDiv.offsetWidth;
			
			// If it's a horizontal slide, save the element's width to go back to when the animation is finished.
			if (options["animation"] == "horizontalSlide") {
				element.oldWidth = element.style.width;
				element.style.width = finalLength + "px";
				overflowDiv.style.verticalAlign = "bottom";
			}
			
			// Set up the animation on the overflow div.
			if (overflowDiv.animation) overflowDiv.animation.stop();
			overflowDiv.animation = new Animation(function(values, final) {
				overflowDiv.style[options["animation"] == "verticalSlide" ? "height" : "width"] = Math.round(values[0]) + "px";
				overflowDiv.style.opacity = values[1];
				
				// If this is the final frame, let the width/height be automatic and hide the overflow div if necessary.
				if (final) {
					overflowDiv.style[options["animation"] == "verticalSlide" ? "height" : "width"] = "";
					if (!element.showing) {
						overflowDiv.style.display = "none";
						if (options["animation"] == "horizontalSlide") element.style.width = element.oldWidth;
					}
				}
			}, {begin: [initLength, initOpacity], end: [element.showing ? finalLength : 0, element.showing ? 1 : 0]});
			overflowDiv.animation.start();
			break;
			
		case "fade":
			element.style.display = "";
			var initOpacity = parseFloat(element.style.opacity);
			if (element.animation) element.animation.stop();
			element.animation = new Animation(function(opacity, final) {
				element.style.opacity = opacity;
				element.style.filter = "alpha(opacity=" + Math.round(opacity * 100) + ")";
				if (final && !element.showing) element.style.display = "none";
			}, {begin: initOpacity, end: element.showing ? 1 : 0});
			element.animation.start();
	}
}

// Make an input a placeholder (grey text that disappears when you click on it.)
function makePlaceholder(element, text) {
	element.onfocus = function() {
		if (element.placeholderFlag) {
			element.value = "";
			element.placeholderFlag = false;
			element.className = element.className.replace("placeholder", "");
		}
	};
	element.onblur = function() {
		if (element.value == "") {
			element.placeholderFlag = true;
			element.value = text;
			if (element.className.indexOf("placeholder") < 0) element.className += " placeholder";
		}
	};
	element.value = "";
	element.onblur();
};

// Disable a button (add the [big]disabled class.)
function disable(button) {
	if (button.className.indexOf("big") != -1 && button.className.indexOf("bigDisabled") == -1) button.className += " bigDisabled";
	else if (button.className.indexOf("button") != -1 && button.className.indexOf("buttonDisabled") == -1) button.className += " buttonDisabled";
	else if (button.className.indexOf("disabled") == -1) button.className += " disabled";
	if (button.getElementsByTagName("input")[0]) button.getElementsByTagName("input")[0].disabled = "true";
	else button.disabled = "true";
};

// Enable a button (remove the [big]disabled class.)
function enable(button) {
	button.className = button.className.replace(/(buttonD|bigD|d)isabled/g, "");
	if (button.getElementsByTagName("input")[0]) button.getElementsByTagName("input")[0].disabled = "";
	else button.disabled = "";
};

// Show the login form (we're really just scrolling up to it.)
function showLogin() {
	if (!getById("loginName")) window.location = window.location;
	var top = getScrollTop();
	getById("loginName").focus();
	window.scroll(0, top);
	animateScroll(0);
}

// Animate a scroll.
var scrollAnimation;
function animateScroll(scrollDest) {
	if (scrollAnimation) scrollAnimation.stop();
	(scrollAnimation = new Animation(function(top) {window.scroll(0, top);}, {begin: getScrollTop(), end: scrollDest})).start();
}

// Toggle the state of a star.
function toggleStar(conversationId, star) {
	Ajax.request({
		"url": esoTalk.baseURL + "ajax.php",
		"post": "action=star&conversationId=" + conversationId
	});
	star.className = star.className == "star0" ? "star1" : "star0";
	star.getElementsByTagName("span")[0].innerHTML = esoTalk.language[star.className == "star1" ? "Starred" : "Unstarred"];
	if (getById("c" + conversationId)) getById("c" + conversationId).className = star.className == "star1" ? "starred" : "";
};

// Functions to get the scrollTop, scrollHeight/Width, and clientHeight/Width (as different browsers make this
// difficult!)
function getScrollTop() {
	if (typeof window.pageYOffset == "number") return window.pageYOffset;
	else if (typeof document.documentElement.scrollTop == "number") return document.documentElement.scrollTop;
	else if (typeof document.body.scrollTop == "number") return document.body.scrollTop;
	return 0;
};
function getScrollDimensions() {
	if (typeof document.documentElement.scrollHeight == "number") return [document.documentElement.scrollWidth, document.documentElement.scrollHeight];
	else if (typeof document.body.scrollHeight == "number") return [document.body.scrollWidth, document.body.scrollHeight];
	return [0, 0];
};
function getClientDimensions() {
	if (typeof window.innerHeight == "number") return [window.innerWidth, window.innerHeight];
	else if (typeof document.documentElement.clientHeight == "number") return [document.documentElement.clientWidth, document.documentElement.clientHeight];
	return [0, 0];
};

// Get the offsetTop of an element that is embedded in relatively positioned elements.
function getOffsetTop(obj) {
	var top = 0;
	if (obj.offsetParent) {
		do {top += obj.offsetTop}
		while (obj = obj.offsetParent);
	}
	return top;
};


// Messages system.
var Messages = {

container: null,
messages: {},

// Initialize: set up the messages container.
init: function() {
	this.container = getById("messages");
	this.container.innerHTML = "";
	// Vegeta, what does the scouter say about his power level?
	this.container.style.display = "";
	this.container.style.position = "fixed";
	this.container.style.top = "0";
	this.container.style.width = "100%";
	this.container.style.zIndex = /*IT'S OVER*/"9000";/*!!!!!*/
	
	// If we're using IE6, we need to emulate position:fixed. What fun.
	if (isIE6) {
		this.container.style.position = "absolute";
		this.container.runtimeStyle.setExpression("top", "eval(document.documentElement.scrollTop)");
		// The fixed element will flicker when the page is scrolled. Fix this by applying a "background image" to the
		// body. Thanks http://ie7-js.googlecode.com/svn/trunk/src/ie7-fixed.js!
		document.body.runtimeStyle.backgroundRepeat = "no-repeat";
		document.body.runtimeStyle.backgroundImage = "url(iTrickedYouIE.gif)";
		document.body.runtimeStyle.backgroundAttachment = "fixed";
	}
},

// Show a message in the message container.
showMessage: function(key, type, text, disappear, hideX) {
	
	// If this message is not already in the messages array, create an entry for it.
	if (!this.messages[key]) {
		this.messages[key] = {div: document.createElement("div")};
		this.container.appendChild(this.messages[key].div);
	}
	
	// Update the message details.
	this.messages[key].div.className = "msg " + type;
	this.messages[key].div.innerHTML = (!hideX ? "<a href='javascript:Messages.hideMessage(\"" + key + "\")' class='close'>x</a>" : "") + text;
	this.messages[key].type = type;
	this.messages[key].text = text;
	clearTimeout(this.messages[key].timeout);
	
	// Set a timeout if this message is supposed to automatically disappear.
	if (disappear) this.messages[key].timeout = setTimeout(function(){Messages.hideMessage(key);}, esoTalk.messageDisplayTime * 1000);
	this.messages[key].div.style.top = -this.messages[key].div.offsetHeight + "px";
	
	// Animate the message.
	this.animateMessage(key, "show");
},

// Hide a specific message.
hideMessage: function(key) {
	if (!this.messages[key]) return false;
	this.animateMessage(key, "hide");
},

// Animate an individual message. type can be "show" or "hide".
animateMessage: function(key, type) {
	if (this.messages[key].animation) this.messages[key].animation.stop();
	var inside = this.messages[key].div;
	var outside = createOverflowDiv(inside);
	var container = this.container;
	inside.style.position = "relative";
	switch (type) {
		case "show":
			this.messages[key].animation = new Animation(function(top, final) {
				inside.style.top = top + "px";
				outside.style.height = inside.offsetHeight + top + "px";
				document.body.style.paddingTop = container.offsetHeight + "px";
				if (final) outside.style.height = inside.style.top = "";
			}, {begin: parseFloat(inside.style.top), end: 0, duration: 10});
			break;
			
		case "hide":
			this.messages[key].animation = new Animation(function(top, final) {
				inside.style.top = top + "px";
				outside.style.height = inside.offsetHeight + top + "px";
				document.body.style.paddingTop = container.offsetHeight + "px";
				if (final) {
					outside.parentNode.removeChild(outside);
					clearTimeout(Messages.messages[key].timeout);
					delete Messages.messages[key];
				}
			}, {begin: 0, end: -inside.offsetHeight, duration: 10});
			break;
			
		default: return false;
	}
	this.messages[key].animation.start();
},

// Hide all messages.
clearMessages: function() {
	for (var i in this.messages) this.hideMessage(i);
}

};


// Ajax system.
var Ajax = {

activeRequests: 0, // Number of currently running requests.
beenLoggedOut: false, // Has the user been logged out since we loaded the page? If so, disable ajax until it's resolved.
disconnected: false, // If we've been disconnected from the server...
disconnectedRequest: false, // The request to repeat after being disconnected from the server.
maxSimultaneousRequests: 3, // Maximum number of ajax requests going at the same time.
queue: [], // A queue of requests waiting to be started or waiting to finish.

// Add a request to the request queue.
request: function(request) {
	if (!request || this.beenLoggedOut) return false;
	if (!request.success) request.success = function() {};
	this.queue.push(request);
	this.doNextRequest();
},

// Do the next request in the queue.
// Because we are doing simultaneous requests, requests must wait for their predecessors to finish before they can fire
// their success event. This function fires the first request in the queue's success event if it is completed, and then
// starts as many requests as it can.
doNextRequest: function() {
	if (!this.queue.length) return;
	while (this.queue.length && this.queue[0].completed) {
		this.queue.shift().success();
		if (Ajax.activeRequests < 1) hide(getById("loading"), {animation: "fade"});
	}
	for (var i in this.queue) {
		if (this.activeRequests >= this.maxSimultaneousRequests) break;
		if (!this.queue[i].http || this.queue[i].repeat) this.doRequest(this.queue[i]);
	}
},

// Start a request.
doRequest: function(request) {
	this.activeRequests++;
	request.repeat = false;
	request.http = window.ActiveXObject ? new ActiveXObject("Microsoft.XMLHTTP") : new XMLHttpRequest();
	// Open a connection.
	request.http.open("POST", request.url, true);
	request.http.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	
	// If we're not loading, change the window onbeforeunload
	// Add an onbeforeunload to prevent the user from quitting during a request, but only if it's not a background
	// request.
	if (!this.loading && !request.background && typeof window._onbeforeunload == "undefined") {
		window._onbeforeunload = window.onbeforeunload;
		window.onbeforeunload = function onbeforeunload() {return esoTalk.language["ajaxRequestPending"];};
	}
	
	// Set the onreadystatechange function to check for errors, messages, and then run the request's success function.
	request.http.onreadystatechange = function() {
		
		// (readyState 4 = completed loading)
		if (request.http.readyState == 4) {
		
			// We're not loading anymore. If there's an element with the id "loading", hide it.
			Ajax.activeRequests--;
			if (Ajax.activeRequests < 1) {
				Ajax.loading = false;
				if (!request.background) {
					if (getById("loading")) hide(getById("loading"), {animation: "fade"});
					window.onbeforeunload = window._onbeforeunload || null;
					if (window._onbeforeunload) window._onbeforeunload = undefined;
				}
			}
			
			// First, check the status code to see if the request went OK (200). If we had problems, alert the user.
			if (request.http.status == 0) return;
			if (request.http.status != 200) {
				Ajax.disconnect(request);
				return false;
			} else if (Ajax.disconnected && !request.background) {
				Ajax.disconnected = false;
				Messages.clearMessages();
			}
			
			// Make the result into a nice JSON array.
			try {request.json = eval("(" + request.http.responseText + ")");}
			catch (e) {
				Ajax.disconnect(request);
				return false;
			}
			request.result = request.json.result;
			request.messages = request.json.messages;
			Ajax.beenLoggedOut = false;
						
			// Did we get any messages?
			for (var i in request.messages) {
				Messages.showMessage(i, request.messages[i][0], request.messages[i][1], request.messages[i][2], i == "beenLoggedOut" ? true : false);
				// If the message is the "beenLoggedOut" one (i.e. user has been logged out), we'll have to deal with it later.
				if (i == "beenLoggedOut") Ajax.beenLoggedOut = true;
			}
		
			// Display the messages.
			if (request.messages.length < 1) request.messages = false;
			
			// Has the token changed? If so, update all hidden token inputs/links on the page.
			if (request.json.token) {
				esoTalk.token = request.json.token;
				var links = document.getElementsByTagName("a");
				for (var i = 0; i < links.length; i++) {
					if (links[i].href.indexOf("token=") != -1)
						links[i].href = links[i].href.replace(/token=[^&]+/i, "token=" + esoTalk.token);
				}
				var inputs = document.getElementsByTagName("input");
				for (var i = 0; i < inputs.length; i++) {
					if (inputs[i].type == "hidden" && inputs[i].name == "token") inputs[i].value = esoTalk.token;
				}
			}

			// If the user has been logged out and our "beenLoggedOut" message is displaying...
			if (Ajax.beenLoggedOut) {
				// Show a big shadow over the page.
				if (!getById("beenLoggedOutShadow")) {
					var div = document.createElement("div");
					div.id = "beenLoggedOutShadow";
					div.style.background = "#000";
					div.style.opacity = "0.75";
					div.style.position = "fixed";
					div.style.top = div.style.left = "0px";
					var d = getClientDimensions();
					div.style.width = d[0] + "px";
					div.style.height = d[1] + "px";
					div.style.zIndex = "8999";
					document.body.appendChild(div);
					// If we're using IE6, we need to emulate position:fixed.
					if (isIE6) {
						div.style.position = "absolute";
						div.runtimeStyle.setExpression("top", "eval(document.documentElement.scrollTop)");
						// The fixed element will flicker when the page is scrolled. Fix this by applying a "background image" to the body.
						// Thanks http://ie7-js.googlecode.com/svn/trunk/src/ie7-fixed.js!
						document.body.runtimeStyle.backgroundRepeat = "no-repeat";
						document.body.runtimeStyle.backgroundImage = "url(x.gif)";
						document.body.runtimeStyle.backgroundAttachment = "fixed";
						div.style.filter = "alpha(opacity=75)";
					}
				}
				// Focus on the password input.
				getById("loginMsgPassword").focus();
				request.repeat = true;
			}

			// Everything went OK.
			else {
				request.completed = true;
				Ajax.doNextRequest();
			}
		}
	};
		 
	// Send the request data - the currently logged in user (so we can check if we're still logged in), and the request-specific post data.
	request.http.send("loggedInAs=" + (esoTalk.user ? esoTalk.user : "") + "&token=" + esoTalk.token + "&" + (request.post ? request.post : ""));
	// Now we're loading... If there's an element with the id "loading", show it
	this.loading = true;
	if (!request.background && getById("loading")) show(getById("loading"), {animation: "fade"});

},

// Resume normal activity after recovering from a disconnection
resumeAfterDisconnection: function() {
	Messages.clearMessages();
	Ajax.request(Ajax.disconnectedRequest);
	Ajax.disconnectedRequest = false;
},

// Show a disconnection message
disconnect: function(request) {
	this.disconnected = true;
	request.repeat = true;
	if (!this.disconnectedRequest || !request.background) this.disconnectedRequest = request;
	this.queue = [];
	Messages.showMessage("ajaxDisconnected", "warning", esoTalk.language["ajaxDisconnected"], false);
},

// Dismiss the "beenLoggedOut" message, by pressing cancel or successfully logging in.
dismissLoggedOut: function(loggedInAs) {
	this.beenLoggedOut = false;
	// Hide the message and the shadow.
	Messages.clearMessages();
	if (getById("beenLoggedOutShadow")) document.body.removeChild(getById("beenLoggedOutShadow"));
	// Set the new 'logged in' user. If we ended up pressing cancel, proceed with the ajax request that caused this mess...
	esoTalk.user = loggedInAs ? loggedInAs : "";
},

// Login from the form in the "beenLoggedOut" message.
login: function(password) {
	this.queue.unshift({
		"url": esoTalk.baseURL + "ajax.php",
		"post": "login[name]=" + esoTalk.user + "&login[password]=" + password,
		"success": function(){Ajax.dismissLoggedOut(esoTalk.user)}
	});
	this.doRequest(this.queue[0]);
}
 
};




// Conversation JavaScript

var Conversation = {

// Pagination bar variables
dragging: false, // Are we dragging a pagination bar? Which one?
mouseStart: null, // The start position of the mouse (onmousedown). Used to calculate the relative position of the handle.
handleWidth: 0, // The width of the handle (%).
handlePos: 0, // The position of the handle (%) - i.e. the handle's marginLeft.
unreadWidth: 0, // The width of the unread area (%).
paginations: [], // An array of the pagination bars (0 => top bar, 1 => bottom bar)

// Conversation details
id: false, // The conversation id
title: "", // The title of the conversation
posts: [], // Array of all the posts we have data for - the post cache.
startFrom: 0, // What post are we starting from?
postCount: 0, // The total number of posts in the conversation
lastActionTime: null, // The conversation's last action time
lastRead: 0, // The last post in the conversation the user has read (start of the unread bar)
updateLastRead: false, // A flag for whether or not to make an AJAX request to update the last read when fetching posts.

autoReloadInterval: 4, // The number of seconds in which to check for new posts.
timeout: null, // A timeout to periodically check for new posts
disableJumpTo: false, // A flag for when the [viewing] part of the pagination bar is moused-over.
editingReply: false, // Are we typing a reply?
editingPosts: 0, // Number of posts being edited.
multiQuote: false, // If this flag is true, we won't scroll to the reply area when the user clicks 'quote' on a post.

// Initialize: set up a timeout to check for new posts, watch window.location.hash, etc.
init: function() {
	
	// Get conversation information from the esoTalk variable.
	if (esoTalk.conversation) {
		this.id = esoTalk.conversation.id;
		this.postCount = esoTalk.conversation.postCount;
		this.startFrom = esoTalk.conversation.startFrom;
		this.lastActionTime = esoTalk.conversation.lastActionTime;
		this.lastRead = esoTalk.conversation.lastRead;
		this.autoReloadInterval = esoTalk.conversation.autoReloadInterval;
	}

	// Hide the save title/tags button
	if (getById("saveTitleTags")) getById("saveTitleTags").style.display = "none";
	
	// If we're not starting a new conversation...
	if (this.id) {
		
		this.setReloadTimeout(this.autoReloadInterval = esoTalk.autoReloadIntervalStart);
		
		// Keep watch for any changes to the hash in the url - reload the posts if it does change.
		setInterval(function() {
			var newHash = window.location.hash.replace("#", "");
			if (isNaN(newHash) || Conversation.startFrom == newHash) return;
			Conversation.moveTo(parseInt(newHash) || 0);
		}, 500);
	
	}
	
	// Initialize the add member form
	if (getById("addMemberSubmit")) {
		getById("addMemberSubmit").onclick = function onclick() {Conversation.addMember(getById("addMember").value); return false;};
		getById("addMember").onkeypress = function(e) {
			if (!e) e = window.event;
			if (e.keyCode == 13) {Conversation.addMember(getById("addMember").value); return false;}
			else enable(getById("addMemberSubmit"));
		};
		disable(getById("addMemberSubmit"));
	}
	
	// Initialize the title/tag inputs (only if it's not a new conversation).
	if (this.id) {
		if (getById("cTitle").tagName.toLowerCase() == "input") {
			getById("cTitle").onfocus = function(){this.initValue=this.value;};
			getById("cTitle").onblur = function(){if(this.value!=this.initValue)Conversation.saveTitle(this.value);};
			getById("cTitle").onkeypress = function(e){if(!e)e=window.event;if(e.keyCode==13){this.blur();return false;}};
		}
		if (getById("cTags").tagName.toLowerCase() == "input") {
			getById("cTags").onfocus = function(){this.initValue=this.value;};
			getById("cTags").onblur = function(){if(this.value!=this.initValue)Conversation.saveTags(this.value);};
			getById("cTags").onkeypress = function(e){if(!e)e=window.event;if(e.keyCode==13){this.blur();return false;}};
		}
	}
	Conversation.title = typeof getById("cTitle").value != "undefined" ? getById("cTitle").value : getById("cTitle").innerHTML;
	
	// Initialize the pagination
	Conversation.initPagination();
	
	// If there's a reply box, initilize it.
	if (getById("reply")) Conversation.initReply();
	
	// Onbeforeunload handler
	window.onbeforeunload = Conversation.beforeUnload;
	
	// Add key events to tell whether the shift key is being held down. If so, don't scroll when the user clicks 'quote'.
	document.onkeydown = function(e) {
		if (!e) e = window.event;
		if (e.keyCode == 16) Conversation.multiQuote = true;
	};
	document.onkeyup = function(e) {
		if (!e) e = window.event;
		if (e.keyCode == 16) Conversation.multiQuote = false;
	};
},

// Initialize the pagination bars - add click events, etc.
initPagination: function() {
	
	// Loop through the bars and create an easy-to-access array of their child elements
	paginations = [getById("pagination"), getById("paginationBottom")];
	for (var i in paginations) {
		pg = {
			"bar": paginations[i],
			"viewingPosts": getElementsByClassName(paginations[i], "viewing")[0],
			"middle": getElementsByClassName(paginations[i], "middle")[0],
			"previous": getElementsByClassName(paginations[i], "previous")[0],
			"first": getElementsByClassName(paginations[i], "first")[0],
			"last": getElementsByClassName(paginations[i], "last")[0],
			"next": getElementsByClassName(paginations[i], "next")[0],
			"unread": getElementsByClassName(paginations[i], "unread")[0],
			"from": getElementsByClassName(paginations[i], "pgFrom")[0],
			"to": getElementsByClassName(paginations[i], "pgTo")[0],
			"count": getElementsByClassName(paginations[i], "pgCount")[0]
		};
		// Disable selection on the handle
		pg.viewingPosts.onselectstart = function() {return false;};
		pg.viewingPosts.unselectable = "on";
		pg.viewingPosts.style.MozUserSelect = "none";
		// Add some mouse handlers
		pg.middle.onclick = Conversation.jumpTo;
		pg.unread.onclick = function() {Conversation.moveTo(Conversation.lastRead);};
		pg.viewingPosts.onmousedown = Conversation.mouseDown;
		pg.viewingPosts.onmouseup = Conversation.mouseUp;
		// When the mouse is over viewingPosts or unread, prevent the jumpTo click from being activated
		Conversation.disableJumpTo = false;
		pg.viewingPosts.onmouseover = pg.unread.onmouseover = function(){Conversation.disableJumpTo=true;};
		pg.viewingPosts.onmouseout = pg.unread.onmouseout = function(){Conversation.disableJumpTo=false;};
		// Add click events to the buttons
		pg.previous.onclick = Conversation.prevPage;
		pg.next.onclick = Conversation.nextPage;
		pg.first.onclick = Conversation.firstPage;
		pg.last.onclick = Conversation.lastPage;
		this.paginations[i] = pg;
	}
	
	// Make sure we have the handle/unread position/width.
	this.handlePos = parseFloat(this.paginations[0].viewingPosts.style.marginLeft);
	this.handleWidth = parseFloat(this.paginations[0].viewingPosts.style.width);
	this.unreadWidth = parseFloat(this.paginations[0].unread.style.width);
	// Add document mouse handlers.
	document.onmousemove = Conversation.mouseMove;
	document.onmouseup = Conversation.mouseUp;
},

// Initialize the reply section - disable/enable buttons, add click events, etc.
initReply: function() {
	
	Conversation.editingReply = false;
	
	// Disable the post reply button if there's not a draft. Disable the save draft button regardless.
	if (!getById("reply-textarea").value) {disable(getById("postReply")); disable(getById("discardDraft"));}
	disable(getById("saveDraft"));
	
	// Add event handlers on the textarea to enable/disable buttons
	getById("reply-textarea").onkeyup = function onkeyup() {
		if (this.value) {enable(getById("saveDraft")); enable(getById("postReply")); Conversation.editingReply = true;}
		else {disable(getById("saveDraft")); disable(getById("postReply")); Conversation.editingReply = false;}
	};
	getById("reply-previewCheckbox").checked = false;
	
	// Add click events to the buttons
	if (getById("saveDraft")) getById("saveDraft").getElementsByTagName("input")[0].onclick = function onclick() {Conversation.saveDraft(); return false;};
	if (getById("discardDraft")) getById("discardDraft").getElementsByTagName("input")[0].onclick = function onclick() {Conversation.discardDraft(); return false;};
	if (getById("postReply")) getById("postReply").getElementsByTagName("input")[0].onclick = function onclick() {
		if (Conversation.id) Conversation.addReply();
		else Conversation.startConversation();
		return false;
	};
	
	// Register the Ctrl+Enter shortcut.
	getById("reply-textarea").onkeypress = function onkeypress(e) {
		if (!e) e = window.event;
		if (e.ctrlKey && e.keyCode == 13) {
			if (Conversation.editingReply) {
				if (Conversation.id) Conversation.addReply();
				else Conversation.startConversation();
			}
			return false;
		}
	}
},

// Reload the posts
reloadPosts: function(startFrom, scrollTo, dontDisplay) {
	// Make sure startFrom is a number within range
	startFrom = Math.max(0, Math.min(Conversation.postCount, parseInt(startFrom)));
	
	// Update the window hash
	Conversation.startFrom = window.location.hash = startFrom;
	
	// Do we need to make an ajax request to get more post information?
	// Within the posts we will be viewing, what are the first and last ones we _don't_ have? We'll need to fetch those ones. 
	var min, max;
	maxPost = Math.min(startFrom + esoTalk.postsPerPage, Conversation.postCount);
	for (var i = startFrom; i < maxPost; i++) {
		if (typeof Conversation.posts[i] == "undefined") {
			if (typeof min == "undefined") min = i;
			max = i;
		}
	}

	// If we do need to fetch some posts from the server...
	if (typeof min != "undefined") {
			
		// Make the ajax request.
		Ajax.request({
			"url": esoTalk.baseURL + "ajax.php?controller=conversation",
			"success": function() {
				// Update our post cache with this new data.
				if (posts = this.result) for (var i in posts) Conversation.posts[i] = posts[i];
				// Only update the post display if the first/last post numbers of these ajax results are consistent with where we should be viewing.
				// (Prevents blank display when a user clicks 'Next' or 'Previous' multiple times in a row.)
				if (min >= Conversation.startFrom && max <= Conversation.startFrom + esoTalk.postsPerPage && !dontDisplay) Conversation.displayPosts(scrollTo);
			},
			"post": "action=getPosts&id=" + Conversation.id + "&start=" + min + "&end=" + max + (Conversation.updateLastRead ? "&updateLastRead=" + maxPost : "")
		});
	
	// If we don't need to get any more data, just display the data we already have.
	} else {
		if (!dontDisplay) Conversation.displayPosts(scrollTo);
		if (Conversation.updateLastRead) {
			Ajax.request({
				"url": esoTalk.baseURL + "ajax.php?controller=conversation",
				"post": "action=updateLastRead&id=" + Conversation.id + "&updateLastRead=" + maxPost
			});
		}
	}
	Conversation.updateLastRead = false;
},

// Return a timeout to check for new posts.
setReloadTimeout: function(seconds) {
	seconds = Math.max(1, seconds);
	if (esoTalk.autoReloadIntervalLimit > 0) seconds = Math.min(seconds, esoTalk.autoReloadIntervalLimit);
	clearTimeout(Conversation.timeout);
	Conversation.timeout = setTimeout(function() {Conversation.checkForNewPosts();}, seconds * 1000);
},

changeAvatarAlignment: function(alignment) {
	esoTalk.avatarAlignment = alignment;
	this.moveTo(this.startFrom);
	Ajax.request({
		"url": esoTalk.baseURL + "ajax.php?controller=conversation",
		"post": "action=saveAvatarAlignment&avatarAlignment=" + alignment,
		"background": true
	});
},

checkForNewPosts: function() {
	if (Conversation.editingPosts > 0) return;
	Ajax.request({
		"url": esoTalk.baseURL + "ajax.php?controller=conversation",
		"post": "action=getNewPosts&id=" + Conversation.id + "&lastActionTime=" + Conversation.lastActionTime + (Conversation.startFrom + esoTalk.postsPerPage >= Conversation.postCount ? "&oldPostCount=" + Conversation.postCount : ""),
		"background": true,
		"success": function() {
			if (!this.result) {
				Conversation.setReloadTimeout(Conversation.autoReloadInterval *= esoTalk.autoReloadIntervalMultiplier);
				return;
			}
			// Update our cache with this new data.
			for (var i in this.result.newPosts) Conversation.posts[i] = this.result.newPosts[i];
			var oldPostCount = Conversation.postCount;
			Conversation.postCount = this.result.postCount;
			Conversation.lastActionTime = this.result.lastActionTime;
			var newPosts = Conversation.postCount - oldPostCount;
			if (!newPosts) Conversation.setReloadTimeout(Conversation.autoReloadInterval *= esoTalk.autoReloadIntervalMultiplier);
			else Conversation.setReloadTimeout(Conversation.autoReloadInterval = esoTalk.autoReloadIntervalStart);
			Conversation.scrollStart = getOffsetTop(Conversation.paginations[1].bar) - getScrollTop();
			// Show the unread area.
			Conversation.unreadWidth += newPosts * (100 / Conversation.postCount);
			// Mark the new posts for animation.
			for (var i = oldPostCount; i < Conversation.postCount; i++) Conversation.posts[i].animateNew = true;
			// If we were viewing the last post, move to the _new_ last post.
			if (Conversation.startFrom + esoTalk.postsPerPage >= oldPostCount) {
				// If the amount of new posts is greater than the posts per page, go to the first new post.
				if (newPosts > esoTalk.postsPerPage) Conversation.moveTo(oldPostCount, "top");
				// If we're _just_ on the edge of the conversation, move forward the amount of new posts
				else if (Conversation.startFrom + esoTalk.postsPerPage <= Conversation.postCount) Conversation.moveTo(Conversation.postCount - esoTalk.postsPerPage, "newReply");
				// Otherwise, just display from where we currently are.
				else Conversation.moveTo(Conversation.startFrom);
			} else Conversation.moveTo(Conversation.startFrom);
		}
	});
},

displayPosts: function(scrollTo) {
	var max = Math.min(Conversation.startFrom + esoTalk.postsPerPage, Conversation.postCount);
	var side = false;
	switch (esoTalk.avatarAlignment || "alternate") {
		case "alternate": side = Conversation.startFrom % 2 ? "l" : "r"; break;
		case "right": side = "r"; break;
		case "left": side = "l"; break;
	}
	var html = [];
	for (var k = Conversation.startFrom; k < max; k++) {

		if (typeof Conversation.posts[k] == "undefined") {
			html.push("<div class='p deleted'><div class='hdr'><h3>Missing data</h3></div></div>");
			continue;
		}

		var post = Conversation.posts[k];
		var singlePost = false;

		// If this post is deleted...
		if (post.deleteMember) {
			html.push("<hr/><div class='p deleted' id='p", post.id, "'><div class='hdr'>",
				"<div class='pInfo'>",
				"<h3>" + post.name + "</h3> ",
				"<span title='", post.date, "'><a href='", makePermalink(post.id), "'>", post.relativeTime, "</a></span> ",
				"<span>", makeDeletedBy(post.deleteMember), "</span> ",
				"</div>",
				"<div class='controls'>");
			if (post.canEdit) html.push("<span>", window[!post.body ? "makeShowDeletedLink" : "makeHideDeletedLink"](post.id), "</span> <span>", makeRestoreLink(post.id), "</span> ");
			html.push("</div></div>");
			if (post.body) html.push("<div class='body'>", post.body, "</div>");
			html.push("</div>");
			continue;
		}

		// If the post before this one is by a different member to this one, start a new post 'group'.
		if (k == Conversation.startFrom || typeof Conversation.posts[k - 1] == "undefined" || Conversation.posts[k - 1]["name"] != post.name || Conversation.posts[k - 1]["deleteMember"]) {
			html.push("<hr/><div class='p "); if (side) html.push(side); html.push(" c", post.color, "'");
			// If this post is in its own group, assign the id to the whole post (not just the post 'part').
			if (typeof Conversation.posts[k + 1] == "undefined" || Conversation.posts[k + 1]["name"] != post.name || Conversation.posts[k + 1]["deleteMember"]) {
				singlePost = true;
				html.push(" id='p", post.id, "'");
			}
			html.push("><div class='parts'>");
		}

		// Regardless of post 'groups', output this individual post.
		html.push("<div", (!singlePost ? " id='p" + post.id + "'" : ""), ">",
			"<div class='hdr'>",
			"<div class='pInfo'>",
			"<h3>", makeMemberLink(post.memberId, post.name), "</h3> ",
			"<span title='", post.date, "'><a href='", makePermalink(post.id), "'>", post.relativeTime, "</a></span> ");
		if (post.editTime) html.push("<span>", makeEditedBy(post.editMember, post.editTime), "</span> ");
		if (post.accounts.length > 0) {
			html.push("<span><select onchange='Conversation.changeMemberGroup(", post.memberId, ",this.value)' name='group'>");
			for (var i in post.accounts) {
				html.push("<option value='", post.accounts[i], "'");
				if (post.accounts[i] == post.account) html.push(" selected='selected'");
				html.push(">", esoTalk.language[post.accounts[i]], "</option>");
			}
			html.push("</select></span> ");
		} else if (post.account != "Member") html.push("<span>", esoTalk.language[post.account], "</span> ");
		if (post.lastAction) html.push("<span>", makeLastAction(post.lastAction), "</span> ");
		for (var i in post.info) html.push("<span>", post.info[i], "</span> ");
		html.push("</div><div class='controls'>");
		if (getById("reply")) html.push(makeQuoteLink(post.id), " ");
		if (post.canEdit) html.push(makeEditLink(post.id), " ", makeDeleteLink(post.id), " ");
		for (var i in post.controls) html.push(post.controls[i], " ");
		html.push("</div></div><div class='body'>", post.body, "</div></div>");

		// If the post after this one is by a different member to this one, end the post 'group'.
		if (k == max - 1 || typeof Conversation.posts[k + 1] == "undefined" || Conversation.posts[k + 1]["name"] != post.name || Conversation.posts[k + 1]["deleteMember"]) {
			html.push("</div>"); if (side) html.push("<div class='avatar'>", makeMemberLink(post.memberId, "<img src='" + (post.avatar || ("skins/" + esoTalk.skin + "/avatar" + (side == "l" ? "Left" : "Right") + ".png")) + "' alt=''/>"), "</div>");
			html.push("<div class='clear'></div></div>");
			// Switch sides now that we're at the end of the group - only if the next post is not deleted!
			if (esoTalk.avatarAlignment == "alternate" && typeof Conversation.posts[k + 1] != "undefined" && !Conversation.posts[k + 1]["deleteMember"]) side = side == "r" ? "l" : "r";
		}
	}

	getById("cPosts").innerHTML = html.join("");
	
	// Loop through all post links (i.e. "go to this post" links) and add a click handler
	// to check if the post they are directed at is in the current conversation post cache.
	// If it is, just scroll up to it.
	var postLinks = getElementsByClassName(getById("cPosts"), "postLink");
	for (var i = 0; i < postLinks.length; i++) {
		var linkParts = postLinks[i].href.split("/");
		// If we can get a proper postId from the link...
		if (postLinks[i].postId = parseInt(linkParts[linkParts.length - 2])) {
			postLinks[i].onclick = function onclick() {
				for (var i in Conversation.posts) {
					if (Conversation.posts[i].id == this.postId) {
						// If the post is on the current page, scroll up to it.
						if (i >= Conversation.startFrom - esoTalk.postsPerPage) Conversation.scrollTo(getById("p" + this.postId).offsetTop);
						// Otherwise, move the pagination to where this post is.
						else Conversation.moveTo(i, "top");
						return false;
					}
				}
			}
		}
	}
	
	// Run the IE6 PNG transparency script (because we have updated the page content.)
	if (isIE6 && supersleight) {
		supersleight.limitTo("cPosts");
		supersleight.run();
	}
	
	if (scrollTo == "bottom") {
		Conversation.scrollTo(scrollTo);
		scrollTo = undefined;
	}
	
	// Animate new posts
	for (var i = Conversation.startFrom; i < max; i++) {
		if (Conversation.posts[i].animateNew) {
			Conversation.animateNewPost(getById("p" + Conversation.posts[i].id));
			Conversation.posts[i].animateNew = false;
		}
	}
		
	Conversation.scrollTo(scrollTo);
},

scrollTo: function(scrollTo) {
	if (typeof scrollTo == "undefined" || scrollTo == null) return false;
	Conversation.scrollDest = false;
	switch (scrollTo) {
		// Scroll to the top pagination bar.
		case "top":	if (getScrollTop() > getOffsetTop(Conversation.paginations[0].bar) - 10) Conversation.scrollDest = getOffsetTop(Conversation.paginations[0].bar) - 10; break;
		// Scroll to the bottom pagination bar.
		case "bottom": if (getScrollTop() < getOffsetTop(Conversation.paginations[1].bar) + Conversation.paginations[1].bar.offsetHeight + 10 - getClientDimensions()[1]) Conversation.scrollDest = getOffsetTop(Conversation.paginations[1].bar) + Conversation.paginations[1].bar.offsetHeight + 10 - getClientDimensions()[1]; break;
		// Scroll back to where the bottom pagination bar was on the screen (when content height above it changes)
		case "pagination":
			window.scroll(0, getOffsetTop(Conversation.paginations[1].bar) - Conversation.scrollStart);
			return;
		// Scroll to the position where the user was before adding a reply, minus the height of the new reply (so as to push the reply area down.)
		// Confused? I am.
		case "newReply":
			if (Conversation.postCount <= esoTalk.postsPerPage) return;
			window.scroll(0, getOffsetTop(Conversation.paginations[1].bar) - Conversation.scrollStart);
			return;
		// Scroll to the reply area
		case "reply": Conversation.scrollDest = getOffsetTop(getById("reply")) + getById("reply").offsetHeight - getClientDimensions()[1] + 10; break;
		default: Conversation.scrollDest = parseInt(scrollTo);
	}
	if (Conversation.scrollDest) animateScroll(Conversation.scrollDest);
},

// On page exit, display a confirmation message if the user is editing posts or hasn't saved their reply.
beforeUnload: function onbeforeunload() {
	if (Conversation.editingPosts > 0) return esoTalk.language["confirmLeave"];
	else if (Conversation.editingReply) return esoTalk.language["confirmDiscard"];
},

// Start dragging
mouseDown: function(e) {
	if (!e) e = window.event;
	document.body.style.cursor = "col-resize";
	Conversation.draggingHandle = this;
	Conversation.mouseStart = e.clientX;
	Conversation.marginLeft = parseFloat(Conversation.paginations[0].viewingPosts.style.marginLeft);
	Conversation.scrollStart = getOffsetTop(Conversation.paginations[1].bar) - getScrollTop();
	if (Conversation.paginationAnimation) Conversation.paginationAnimation.stop();
},

// Stop dragging
mouseUp: function(e) {
	if (!e) e = window.event;
	document.body.style.cursor = "auto";
	if (Conversation.draggingHandle) Conversation.moveToPercent(parseFloat(Conversation.paginations[0].viewingPosts.style.marginLeft), Conversation.draggingHandle == Conversation.paginations[1].viewingPosts ? "pagination" : null);
	Conversation.draggingHandle = false;
	Conversation.mouseStart = null;
},

// Drag the handle
mouseMove: function(e) {
	if (!e) e = window.event;
	if (Conversation.draggingHandle && e.clientX) {
		var offsetPixels = e.clientX - Conversation.mouseStart;
		var offsetPercent = (offsetPixels / Conversation.paginations[0].middle.offsetWidth) * 100;
		Conversation.moveHandle(parseFloat(Conversation.marginLeft) + offsetPercent);
		// Update the numbers in '1-20 of 38 posts'.
		var startFrom = Math.round(parseFloat(Conversation.paginations[0].viewingPosts.style.marginLeft)
			* (Conversation.postCount - esoTalk.postsPerPage) / Math.max(100 - Conversation.handleWidth, 1));
		for (var i in Conversation.paginations) {
			Conversation.paginations[i].from.innerHTML = Math.max(parseInt(startFrom) + 1, 1);
			Conversation.paginations[i].to.innerHTML = Math.min(Math.max(startFrom, 0) + esoTalk.postsPerPage, Conversation.postCount);
			Conversation.paginations[i].viewingPosts.title = Conversation.paginations[i].viewingPosts.firstChild.innerHTML.replace(/<.+?>/g, "");
		}
	}
},

// Animate the pagination bar.
animatePagination: function() {
	if (this.paginationAnimation) this.paginationAnimation.stop();
	(this.paginationAnimation = new Animation(function(data) {
		Conversation.moveHandle(data[0]);
		Conversation.resizeHandle(data[1]);
		Conversation.resizeUnread(data[2]);
	}, {
		begin: [parseFloat(this.paginations[0].viewingPosts.style.marginLeft), parseFloat(this.paginations[0].viewingPosts.style.width), parseFloat(this.paginations[0].unread.style.width)],
		end: [this.handlePos, this.handleWidth, this.unreadWidth]
	})).start();
},

// Move the handle to a specific position - update the handle's marginLeft/Right.
moveHandle: function(marginLeft) {
	marginLeft = Math.max(0, Math.min(100 - parseFloat(this.paginations[0].viewingPosts.style.width), marginLeft));
	var marginRight = 100 - marginLeft - parseFloat(this.paginations[0].viewingPosts.style.width);
	for (i in Conversation.paginations) {
		Conversation.paginations[i].viewingPosts.style.marginLeft = marginLeft + "%";
		Conversation.paginations[i].viewingPosts.style.marginRight = marginRight + "%";
	}
},

// Resize the handle - change the handle's width.
resizeHandle: function(width) {
	width = Math.max(0, Math.min(100, width));
	for (i in Conversation.paginations) Conversation.paginations[i].viewingPosts.style.width = width + "%";
},

// Resize the unread area
resizeUnread: function(width) {
	width = Math.max(0, Math.min(100, width));
	for (i in Conversation.paginations) {
		Conversation.paginations[i].unread.style.marginLeft = (100 - width) + "%";
		Conversation.paginations[i].unread.style.width = width + "%";
	}
},

// Go to the next page.
nextPage: function() {
	if (!this.className || this.className.indexOf("disabled") == -1)
		Conversation.moveTo(Math.min(Conversation.startFrom + esoTalk.postsPerPage, Conversation.postCount - 1), "top");
	return false;
},

// Go to the previous page.
prevPage: function() {
	if (!this.className || this.className.indexOf("disabled") == -1) {
		Conversation.scrollStart = getOffsetTop(Conversation.paginations[1].bar) - getScrollTop();
		Conversation.moveTo(Math.max(0, Conversation.startFrom - esoTalk.postsPerPage), this == Conversation.paginations[1].previous ? "pagination" : "bottom");
	}
	return false;
},

// Go to the first page.
firstPage: function() {
	Conversation.moveTo(0, "top");
	return false;
},

// Go to the last page.
lastPage: function() {
	Conversation.scrollStart = getOffsetTop(Conversation.paginations[1].bar) - getScrollTop();
	Conversation.moveTo(Math.max(0, Conversation.postCount - esoTalk.postsPerPage), this == Conversation.paginations[1].last ? "pagination" : "bottom");
	return false;
},

// Jump to a specific position on the pagination bar. Works out what post number is associated with the pixel position on the bar.
jumpTo: function(e) {
	if (!e) e = window.event;
	// If the user is clicking on the unread link or dragging the viewing area, we have no business here!
	if (Conversation.disableJumpTo) return false;
	// Where did the user click in terms of pixels?
	pixels = e.clientX - Conversation.paginations[0].middle.offsetLeft;
	// Where did the user click in terms of %?
	clickPercent = (pixels / Conversation.paginations[0].middle.offsetWidth) * 100;
	// Move the handle so its middle is where the user clicked.
	startFromPercent = Math.max(0, Math.min(100 - Conversation.handleWidth, clickPercent - Conversation.handleWidth / 2));
	Conversation.scrollStart = getOffsetTop(Conversation.paginations[1].bar) - getScrollTop();
	Conversation.moveToPercent(startFromPercent, this == Conversation.paginations[1].middle ? "pagination" : null);
},

// Move to a specific post. Takes care of pagination, animation, and reloading the posts.
moveTo: function(startFrom, scrollTo) {
	getById("cBody").style.display = Conversation.postCount ? "block" : "none";
	// Check if we're editing any posts - if we are, confirm it with the user.
	if (Conversation.editingPosts > 0 && !confirm(Conversation.beforeUnload())) startFrom = Conversation.startFrom;
	else Conversation.editingPosts = 0;
	// Update the numbers in '1-20 of 38 posts', and disable/enable previous/next buttons if necessary.
	for (var i in Conversation.paginations) {
		Conversation.paginations[i].from.innerHTML = Math.max(parseInt(startFrom) + 1, 1);
		Conversation.paginations[i].to.innerHTML = Math.min(Math.max(startFrom, 0) + esoTalk.postsPerPage, Conversation.postCount);
		Conversation.paginations[i].count.innerHTML = Conversation.postCount;
		Conversation.paginations[i].viewingPosts.title = Conversation.paginations[i].viewingPosts.firstChild.innerHTML.replace(/<.+?>/g, "");
		if (startFrom <= 0) disable(Conversation.paginations[i].previous);
		else enable(Conversation.paginations[i].previous);
		if (startFrom + esoTalk.postsPerPage >= Conversation.postCount) disable(Conversation.paginations[i].next);
		else enable(Conversation.paginations[i].next);
	}
	
	// Work out where the handle should be in terms of %.
	var minPercent = 125 / Conversation.paginations[0].middle.offsetWidth;
	var curHandleWidth = Math.max(esoTalk.postsPerPage / Conversation.postCount, minPercent) * 100;
	if (Conversation.postCount <= esoTalk.postsPerPage) var percentPerPost = 100 / Conversation.postCount;
	else var percentPerPost = (100 - curHandleWidth) / (Conversation.postCount - esoTalk.postsPerPage);
	// Work out how wide the handle can be.
	Conversation.handleWidth = Math.max(percentPerPost * Math.min(Conversation.postCount - startFrom, esoTalk.postsPerPage), minPercent * 100);
	Conversation.handlePos = Math.min(100 - Conversation.handleWidth, startFrom * percentPerPost);
	
	// Are we overlapping the unread section?
	if (startFrom + esoTalk.postsPerPage > Conversation.lastRead) {
		Conversation.lastRead = Math.min(startFrom + esoTalk.postsPerPage, Conversation.postCount);
		Conversation.unreadWidth = Math.max(100 - Conversation.lastRead * (100 / Conversation.postCount), 0);
		Conversation.updateLastRead = true;
	}
	// Animate the handle - let it slide!
	Conversation.animatePagination();
	// Update the posts that are displaying.
	Conversation.reloadPosts(startFrom, scrollTo);
},

// Move to a specific post, but work out what post from a position (percent) in the bar.
moveToPercent: function(startFromPercent, scrollTo) {
	var postNum = Math.round(startFromPercent * (Conversation.postCount - esoTalk.postsPerPage) / Math.max(100 - Conversation.handleWidth, 1));
	Conversation.moveTo(postNum, scrollTo);
},

// Add a reply
addReply: function() {
	content = getById("reply-textarea").value;
	// Disable the reply/draft buttons.
	disable(getById("postReply")); disable(getById("saveDraft"));
	
	// What is the last post in the conversation we have data for? We'll need to get any posts we don't have.
	var max = 0;
	for (var i in Conversation.posts) {
		i = parseInt(i) + 1;
		if (i > max) max = i;
	}
	
	// Make the ajax request.
	Ajax.request({
		"url": esoTalk.baseURL + "ajax.php?controller=conversation",
		"post": "action=addReply&id=" + Conversation.id + "&content=" + encodeURIComponent(content) + "&postCount=" + Conversation.postCount + "&haveDataUpTo=" + max,
		"success": function() {			
			// Only do all this if we didn't get any messages...
			if (!this.messages) {
				
				Messages.hideMessage("waitToReply");
				Messages.hideMessage("emptyPost");
				
				// Everything went just as planned; initialize the reply area again
				hide(getElementsByClassName(getById("cLabels"), "draft")[0]);
				getById("reply-textarea").value = "";
				Conversation.togglePreview("reply", false);
				Conversation.initReply();
				
				// Update our post cache with this new data.
				for (var i in this.result.posts) Conversation.posts[i] = this.result.posts[i];
				oldPostCount = Conversation.postCount;
				Conversation.postCount = this.result.postCount;
				Conversation.lastActionTime = this.result.lastActionTime;
				newPosts = Conversation.postCount - oldPostCount;
				Conversation.scrollStart = getOffsetTop(Conversation.paginations[1].bar) - getScrollTop();
				
				// Mark the new posts for animation.
				for (i = oldPostCount; i < Conversation.postCount; i++) Conversation.posts[i].animateNew = true;
				
				// Move the to last post.
				// If the amount of new posts is greater than the posts per page, go to the first new post.
				if (newPosts > esoTalk.postsPerPage) Conversation.moveTo(oldPostCount);
				// If we're _just_ on the edge of the conversation, move forward the amount of new posts.
				else if (Conversation.startFrom + esoTalk.postsPerPage <= Conversation.postCount) Conversation.moveTo(Conversation.postCount - esoTalk.postsPerPage, "newReply");
				// Otherwise, just display from where we currently are.
				else Conversation.moveTo(Conversation.startFrom, "newReply");
				
				Conversation.setReloadTimeout(Conversation.autoReloadInterval = esoTalk.autoReloadIntervalStart);
				
			} else {
				// Enable the reply/draft buttons.
				enable(getById("postReply")); enable(getById("saveDraft"));
			}
		}
	});
},

// Animate a new post (e.g. reply), fading it in and expanding its height from 0.
animateNewPost: function(post) {
	var overflowDiv = createOverflowDiv(post);
	(overflowDiv.animation = new Animation(function(values, final) {
		overflowDiv.style.height = final ? "" : values[0] + "px";
		overflowDiv.style.opacity = final ? "" : values[1];
	}, {begin: [0, 0], end: [overflowDiv.offsetHeight, 1]})).start();
},

// Animate a post expanding/shrinking to the correct height when being edited.
animateEditPost: function(post, startHeight) {
	var overflowDiv = createOverflowDiv(post);
	(overflowDiv.animation = new Animation(function(height, final) {
		overflowDiv.style.height = final ? "" : height + "px";
	}, {begin: startHeight, end: overflowDiv.offsetHeight})).start();
},

// Animate a post being deleted, shrinking it from its height when it was not deleted (startHeight).
animateDeletePost: function(post, startHeight) {
	post.style.overflow = "hidden";
	(post.animation = new Animation(function(height, final) {
		post.style.height = final ? "" : height + "px";
	}, {begin: startHeight, end: post.offsetHeight})).start();
},

// Start a new conversation.
startConversation: function(draft) {

	// Prepare the conversation data
	var title = encodeURIComponent(getById("cTitle").placeholderFlag ? "" : getById("cTitle").value);
	var content = encodeURIComponent(getById("reply-textarea").value);
	var tags = encodeURIComponent(getById("cTags").placeholderFlag ? "" : getById("cTags").value);
	
	// Disable the post reply and save draft buttons.
	disable(getById("postReply")); disable(getById("saveDraft"));
	
	// Make the ajax request
	Ajax.request({
		"url": esoTalk.baseURL + "ajax.php?controller=conversation",
		"post": "action=startConversation&content=" + content + "&title=" + title + "&tags=" + tags + (draft ? "&draft=true" : ""),
		"success": function() {
			if (this.messages) {enable(getById("postReply")); enable(getById("saveDraft"));}
			// Redirect to the new conversation page
			else if (!this.messages && this.result.redirect) {
				Conversation.editingReply = false;
				document.location = this.result.redirect;
			}
		}
	});
},

// Delete a conversation
deleteConversation: function onclick() {return confirm(esoTalk.language["confirmDeleteConversation"]);},

// Save a draft
saveDraft: function() {
	// If this is a new conversation, just use the startConversation function
	if (!Conversation.id) {
		Conversation.startConversation(true);
		return;
	}
	Ajax.request({
		"url": esoTalk.baseURL + "ajax.php?controller=conversation",
		"post": "action=saveDraft&id=" + Conversation.id + "&content=" + encodeURIComponent(getById("reply-textarea").value),
		"success": function() {
			if (!this.messages) {
				Messages.hideMessage("emptyPost");
				// Show the draft label, disable the save draft button, and enable the discard draft button.
				show(getElementsByClassName(getById("cLabels"), "draft")[0], {animation: "horizontalSlide"});
				disable(getById("saveDraft")); enable(getById("discardDraft"));
				Conversation.editingReply = false;
			}
		}
	});
},

// Discard a draft
discardDraft: function() {
	if (!this.postCount) {
		window.location = window.location.split("?")[0] + "?delete";
		return;
	}
	Ajax.request({
		"url": esoTalk.baseURL + "ajax.php?controller=conversation",
		"post": "action=discardDraft&id=" + Conversation.id,
		"success": function() {
			// Hide the draft label and reinitialize the reply area
			hide(getElementsByClassName(getById("cLabels"), "draft")[0], {animation: "horizontalSlide"});
			getById("reply-textarea").value = "";
			Conversation.togglePreview("reply", false);
			Conversation.initReply();
		}
	});
},

// Delete a post.
deletePost: function(postId) {
	// Check if we're editing any posts - if we are, confirm it with the user.
	if (Conversation.editingPosts > 0 && !confirm(Conversation.beforeUnload())) return false;
	else Conversation.editingPosts = 0;
	// Reload the posts on this page so we can redisplay them when needed.
	Conversation.reloadPosts(Conversation.startFrom, null, true);
	Ajax.request({
		"url": esoTalk.baseURL + "ajax.php?controller=conversation",
		"post": "action=deletePost&postId=" + postId,
		"success": function() {
			if (!this.messages) {
				// Find the post we just deleted and change its deleteMember to the current user, then redisplay the posts.
				for (var i in Conversation.posts) {
					if (Conversation.posts[i].id == postId) {
						Conversation.posts[i].deleteMember = esoTalk.user;
						Conversation.posts[i].body = "";
						oldHeight = getById("p" + postId).offsetHeight;
						Conversation.displayPosts();
						Conversation.animateDeletePost(getById("p" + postId), oldHeight);
						break;
					}
				}
			}
		}
	});
},

// Restore a delete post
restorePost: function(postId) {
	// Check if we're editing any posts - if we are, confirm it with the user.
	if (Conversation.editingPosts > 0 && !confirm(Conversation.beforeUnload())) return false;
	else Conversation.editingPosts = 0;
	// Reload the posts on this page so we can redisplay them when needed.
	Conversation.reloadPosts(Conversation.startFrom, null, true);
	Ajax.request({
		"url": esoTalk.baseURL + "ajax.php?controller=conversation",
		"success": function() {
			if (!this.messages) {
				for (var i in this.result) Conversation.posts[i] = this.result[i];
				var oldHeight = getById("p" + postId).offsetHeight;
				Conversation.displayPosts();
				Conversation.animateNewPost(getById("p" + postId));
			}
		},
		"post": "action=restorePost&postId=" + postId
	});
},

showDeletedPost: function(postId) {
	// Reload the posts on this page so we can redisplay them when needed.
	Conversation.reloadPosts(Conversation.startFrom, null, true);
	Ajax.request({
		"url": esoTalk.baseURL + "ajax.php?controller=conversation",
		"post": "action=showDeletedPost&postId=" + postId,
		"success": function() {
			if (!this.messages) {
				// Find the post we just deleted and change its deleteMember to the current user, then redisplay the posts.
				for (var i in Conversation.posts) {
					if (Conversation.posts[i].id == postId) {
						Conversation.posts[i].body = this.result;
						oldHeight = getById("p" + postId).offsetHeight;
						Conversation.displayPosts();
						Conversation.animateDeletePost(getById("p" + postId), oldHeight);
						break;
					}
				}
			}
		}
	});
},

hideDeletedPost: function(postId) {
	// Reload the posts on this page so we can redisplay them when needed.
	Conversation.reloadPosts(Conversation.startFrom, null, true);
	for (var i in Conversation.posts) {
		if (Conversation.posts[i].id == postId) {
			Conversation.posts[i].body = "";
			oldHeight = getById("p" + postId).offsetHeight;
			Conversation.displayPosts();
			Conversation.animateDeletePost(getById("p" + postId), oldHeight);
			break;
		}
	}
},

// Edit a post - make the post area into a textarea.
editPost: function(postId) {
	
	// If we're already editing this post, don't do anything.
	if (getById("p" + postId).editing) return;
	getById("p" + postId).editing = true;
	
	// Get the editing controls and textarea templates with an ajax request
	Ajax.request({
		"url": esoTalk.baseURL + "ajax.php?controller=conversation",
		"post": "action=getEditPost&postId=" + postId,
		"success": function() {
			if (this.messages) return;
			Conversation.editingPosts++;
			var controls = getElementsByClassName(getById("p" + postId), "controls")[0];
			var body = getElementsByClassName(getById("p" + postId), "body")[0];
			controls.old = controls.innerHTML;
			body.old = body.innerHTML;
			var startHeight = getById("p" + postId).offsetHeight;
			// Change up the html
			body.className += " edit";
			controls.innerHTML = this.result.controls;
			body.innerHTML = this.result.body;
			Conversation.animateEditPost(getById("p" + postId), startHeight);
			// Scroll
			var scrollTo = getOffsetTop(getById("p" + postId)) + getById("p" + postId).offsetHeight - getClientDimensions()[1] + 10;
			if (getScrollTop() < scrollTo) Conversation.scrollTo(scrollTo);
			// Regsiter the Ctrl+Enter shortcut.
			getById("p" + postId + "-textarea").onkeypress = function onkeypress(e) {
				if (!e) e = window.event;
				if (e.ctrlKey && e.keyCode == 13) {
					Conversation.saveEditPost(postId, this.value);
					return false;
				}
			}
		}
	});
},

// Save an edited post to the database
saveEditPost: function(postId, content) {

	// Disable the buttons
	var buttons = getElementsByClassName(getElementsByClassName(getById("p" + postId), "editButtons")[0], "button");
	for (var i in buttons) disable(buttons[i]);
	
	// Make the ajax request
	Ajax.request({
		"url": esoTalk.baseURL + "ajax.php?controller=conversation",
		"success": function() {
			if (!this.messages) {
				// Success! Revert back to normal
				getElementsByClassName(getById("p" + postId), "body")[0].old = this.result.content;
				Conversation.cancelEdit(postId);
				// Find the post we just edited and change its content to the new content.
				for (var i in Conversation.posts) {
					if (Conversation.posts[i].id == postId) {
						Conversation.posts[i].body = this.result.content;
						break;
					}
				}
			}
			// Enable the buttons
			else for (var i in buttons) enable(buttons[i]);
		},
		"post": "action=editPost&postId=" + postId + "&content=" + encodeURIComponent(content)
	});
},
// Cancel editing a post
cancelEdit: function(postId) {
	Conversation.editingPosts--;
	getById("p" + postId).editing = false;
	var controls = getElementsByClassName(getById("p" + postId), "controls")[0];
	var body = getElementsByClassName(getById("p" + postId), "body")[0];
	body.className = body.className.replace(" edit", "");
	var startHeight = getById("p" + postId).offsetHeight;
	controls.innerHTML = controls.old;
	body.innerHTML = body.old;
	Conversation.animateEditPost(getById("p" + postId), startHeight);
	Conversation.setReloadTimeout(Conversation.autoReloadInterval);
},

// Toggle sticky
toggleSticky: function() {
	var label = getElementsByClassName(getById("cLabels"), "sticky")[0];
	toggle(label, {animation: "horizontalSlide"});
	getById("stickyLink").innerHTML = esoTalk.language[label.showing ? "Unsticky" : "Sticky"];
	Ajax.request({
		"url": esoTalk.baseURL + "ajax.php?controller=conversation",
		"post": "action=toggleSticky&id=" + Conversation.id
	});
},

// Toggle lock
toggleLock: function() {
	label = getElementsByClassName(getById("cLabels"), "locked")[0];
	toggle(label, {animation: "horizontalSlide"});
	getById("lockLink").innerHTML = esoTalk.language[label.showing ? "Unlock" : "Lock"];
	Ajax.request({
		"url": esoTalk.baseURL + "ajax.php?controller=conversation",
		"post": "action=toggleLock&id=" + Conversation.id
	});
},

// Add a member to the members allowed list
addMember: function(name) {
	if (!name) return;
	Ajax.request({
		"url": esoTalk.baseURL + "ajax.php?controller=conversation",
		"success": function() {
			getById("addMember").value = "";
			disable(getById("addMemberSubmit"));
			if (!this.messages) {
				// Update the list/labels
				getById("allowedList").innerHTML = this.result.list;
				show(getElementsByClassName(getById("cLabels"), "private")[0], {animation: "horizontalSlide"});
			}
		}, 
		"post": "action=addMember&member=" + encodeURIComponent(name) + (Conversation.id ? "&id=" + Conversation.id : "")
	});
},

// Remove a member from the members allowed list
removeMember: function(name) {
	Ajax.request({
		"url": esoTalk.baseURL + "ajax.php?controller=conversation",
		"success": function() {
			getById("allowedList").innerHTML = this.result.list;
			if (!this.result.private) hide(getElementsByClassName(getById("cLabels"), "private")[0], {animation: "horizontalSlide"});
		},
		"post": "action=removeMember&member=" + encodeURIComponent(name) + (Conversation.id ? "&id=" + Conversation.id : "")
	});
},

// Save the tags
saveTags: function(tags) {
	if (!Conversation.id) return false;
	Ajax.request({
		"url": esoTalk.baseURL + "ajax.php?controller=conversation",
		"success": function() {getById("cTags").value = this.result;},
		"post": "action=saveTags&id=" + Conversation.id + "&tags=" + encodeURIComponent(tags)
	});
},

// Save the title
saveTitle: function(title) {
	if (!Conversation.id) return false;
	Ajax.request({
		"url": esoTalk.baseURL + "ajax.php?controller=conversation",
		"success": function() {
			document.title = document.title.replace(Conversation.title, this.result);
			getById("cTitle").value = Conversation.title = this.result;
		},
		"post": "action=saveTitle&id=" + Conversation.id + "&title=" + encodeURIComponent(title)
	});
},

// Change a user's group
changeMemberGroup: function(memberId, group) {
	Ajax.request({
		"url": esoTalk.baseURL + "ajax.php?controller=conversation",
		"success": function() {
			if (this.messages) return;
			for (var i in Conversation.posts) {
				if (Conversation.posts[i].memberId == memberId) Conversation.posts[i].account = group;
			}
			Conversation.reloadPosts(Conversation.startFrom);
		},
		"post": "action=changeMemberGroup&memberId=" + encodeURIComponent(memberId) + "&group=" + encodeURIComponent(group)
	});
},

// Formatting buttons
bold: function(id) {Conversation.wrapText(getById(id + "-textarea"), "<b>", "</b>");},
italic: function(id) {Conversation.wrapText(getById(id + "-textarea"), "<i>", "</i>");},
strikethrough: function(id) {Conversation.wrapText(getById(id + "-textarea"), "<s>", "</s>");},
header: function(id) {Conversation.wrapText(getById(id + "-textarea"), "<h1>", "</h1>");},
link: function(id) {Conversation.wrapText(getById(id + "-textarea"), "<a href='http://example.com'>", "</a>", "http://example.com", "link text");},
image: function(id) {Conversation.wrapText(getById(id + "-textarea"), "<img src='", "'>", "", "http://example.com/image.jpg");},
fixed: function(id) {Conversation.wrapText(getById(id + "-textarea"), "<pre>", "</pre>");},

// Quotes
quote: function(id, name, quote) {
	Conversation.wrapText(getById(id + "-textarea"), "<blockquote><cite>" + (name ? name : "Name") + "</cite> " + (quote ? quote : ""), "</blockquote>", (!name ? "Name" : null));
},
// Quote a post
quotePost: function(postId) {
	Ajax.request({
		"url": esoTalk.baseURL + "ajax.php?controller=conversation",
		"success": function() {
			var top = getScrollTop();
			// Quote this post's author and content
			Conversation.insertText(getById("reply-textarea"), "<blockquote><cite>" + this.result.member + "</cite> " + this.result.content + "</blockquote>\n");
			// Scroll to the reply box if the user isn't holding down shift.
			window.scroll(0, top);
			if (!Conversation.multiQuote) Conversation.scrollTo("reply");
		},
		"post": "action=getPost&postId=" + postId
	});
},

// Add text to the reply area at the very end, and move the cursor to the very end.
insertText: function(textarea, text) {
	textarea.focus();
	textarea.value += text;
	textarea.focus();
	// Trigger the textarea's keyup to emulate typing
	getById("reply-textarea").onkeyup();
},

// Add text to the reply area, with the options of wrapping it around a selection and selecting a part of it when it's inserted
wrapText: function(textarea, tagStart, tagEnd, selectArgument, defaultArgumentValue) {
	
	// Save the scroll position of the textarea
	scrollTop = textarea.scrollTop;
	
	// Work out the currently selected text
	if (typeof textarea.selectionStart != "undefined") {
		var start = textarea.selectionStart, end = textarea.selectionEnd;
		// Trim a space off either side
		if (textarea.value.substring(start, start + 1) == " ") start++;
		if (textarea.value.substring(end - 1, end) == " ") end--;
		selection = textarea.value.substring(start, end);
		selectionStart = start;
	} else if (document.selection.createRange) {
		selection = document.selection.createRange().text;
		selectionStart = 0;
	}
	
	// Work out the text to insert over the selection
	selection = selection ? selection : (defaultArgumentValue ? defaultArgumentValue : "");
	text = tagStart + selection + (typeof tagEnd != "undefined" ? tagEnd : tagStart);
	
	// Replace the textarea's value (or the selection's value in IE's case)
	if (typeof textarea.selectionStart != "undefined")
		textarea.value = textarea.value.substr(0, start) + text + textarea.value.substr(end);
	else if (document.selection && document.selection.createRange) {
		textarea.focus();
		range = document.selection.createRange();
		range.text = text.replace(/\r?\n/g, "\r\n");
		range.select();
	} else textarea.value += text;
	// Scroll back down and refocus on the textarea
	textarea.scrollTop = scrollTop;
	textarea.focus();
	
	// If a selectArgument was passed, work out where it is and select it
	// Otherwise, select the text that was selected before this function was called
	// IE - move the cursor position relatively (from the end of the endTag)
	if (typeof textarea.setSelectionRange == "undefined") {
		range = document.selection.createRange();
		tagEndLength = (typeof tagEnd != "undefined" ? tagEnd : tagStart).length;
		if (selectArgument) {
			argStart = tagStart.indexOf(selectArgument);
			argEnd = argStart + selectArgument.length;
			range.moveStart("character", -tagEndLength - selection.length - selectArgument.length - tagStart.length + argEnd);
			range.moveEnd("character", -tagEndLength - selection.length - tagStart.length + argEnd);
		} else {
			range.moveStart("character", -tagEndLength - selection.length);
			range.moveEnd("character", -tagEndLength);
		}
		range.select();
	// Good browsers - move the cursor position easily 
	} else {
		if (selectArgument) {
			newStart = selectionStart + tagStart.indexOf(selectArgument);
			newEnd = newStart + selectArgument.length;
		} else {
			newStart = selectionStart + tagStart.length;
			newEnd = newStart + selection.length;
		}
		textarea.setSelectionRange(newStart, newEnd);
	}

	// Trigger the textarea's keyup to emulate typing
	getById("reply-textarea").onkeyup();
},

// Toggle preview on an editing area
togglePreview: function(id, preview) {
	
	// If the preview box is checked...
	if (preview) {
		// Keep the minimum height - won't work in ie :(
		getById(id + "-preview").style.minHeight = getById(id + "-textarea").offsetHeight + 4 + "px";
		// Hide the formatting buttons and the textarea; show the preview area
		hide(getElementsByClassName(getById(id), "formattingButtons")[0]); hide(getById(id + "-textarea"));
		getById(id + "-preview").innerHTML = "";
		show(getById(id + "-preview"));
		// Get the formatted post and show it
		Ajax.request({
			"url": esoTalk.baseURL + "ajax.php?controller=conversation",
			"success": function() {getById(id + "-preview").innerHTML = this.result;},
			"post": "action=getPostFormatted&content=" + encodeURIComponent(getById(id + "-textarea").value)
		});
	}
	
	// The preview box isn't checked
	else {
		// Show the formatting buttons and the textarea; hide the preview area
		show(getElementsByClassName(getById(id), "formattingButtons")[0]); show(getById(id + "-textarea"));
		hide(getById(id + "-preview"));
	}
}

};



// Search JavaScript

var Search = {

currentSearch: "",
negativeGambit: false,
updateCurrentResultsTimeout: null,
checkForNewResultsTimeout: null,

init: function() {

	// Add an onclick handler to the search button
	getById("submit").getElementsByTagName("input")[0].onclick = function onclick() {
		Search.search(getById("searchText").value);
		return false;
	};
	// Add an onkeydown handler for when you press enter/escape in the search input
	getById("searchText").onkeydown = function onkeydown(e) {
		if (!e) e = window.event;
		if (e.keyCode == 13) { // Enter
			Search.search(getById("searchText").value);
			return false;
		} else if (e.keyCode == 27) { // Escape
			if (getById("searchText").value != "") setTimeout(function(){Search.search("");}, 1);
			return false;
		}
	};
	// Add an onclick handler to the reset link
	getById("reset").onclick = function onclick() {
		Search.search("");
		return false;
	};

	// Set an interval to check on the url hash
	setInterval(function() {
		var hash = window.location.hash.replace("#", "");
		if (hash.length < 1) return;
		var newSearch = decodeURIComponent(hash.substr(7));
		if (Search.currentSearch != newSearch) {Search.search(newSearch);}
	}, 500);
	
	Search.resetUpdateCurrentResultsTimeout();
	Search.resetCheckForNewResultsTimeout();
	
	// Add handlers to all the tags and gambits
	var t = getById("tags").getElementsByTagName("a");
	for (var i = 0; i < t.length; i++) {
		t[i].onclick = function onclick() {Search.tag(Search.desanitize(this.innerHTML)); return false;};
		t[i].ondblclick = function ondblclick() {Search.search((Search.negativeGambit ? "!" : "") + esoTalk.language["tag:"] + Search.desanitize(this.innerHTML)); return false;};
	}
	var g = getById("gambits").getElementsByTagName("a");
	for (var i = 0; i < g.length; i++) {
		g[i].onclick = function onclick() {Search.gambit(Search.desanitize(this.innerHTML)); return false;};
		g[i].ondblclick = function ondblclick() {Search.search((Search.negativeGambit ? "!" : "") + Search.desanitize(this.innerHTML)); return false;};
	}
	
	// Add key events to tell whether the shift key is being held down. If so, set a flag to negate all gambit clicks to true.
	document.onkeydown = function(e) {
		if (!e) e = window.event;
		if (e.keyCode == 16) Search.negativeGambit = true;
	};
	document.onkeyup = function(e) {
		if (!e) e = window.event;
		if (e.keyCode == 16) Search.negativeGambit = false;
	};

},

// Set a timeout to update current results.
resetUpdateCurrentResultsTimeout: function() {
	if (!esoTalk.updateCurrentResultsInterval) return;
	if (this.updateCurrentResultsTimeout) clearInterval(this.updateCurrentResultsTimeout);
	this.updateCurrentResultsTimeout = setInterval(function() {Search.updateCurrentResults();}, Math.max(esoTalk.updateCurrentResultsInterval) * 1000);
},

// Set a timeout to check for new results.
resetCheckForNewResultsTimeout: function() {
	if (!esoTalk.checkForNewResultsInterval) return;
	if (this.checkForNewResultsTimeout) clearInterval(this.checkForNewResultsTimeout);
	this.checkForNewResultsTimeout = setInterval(function() {Search.checkForNewResults();}, Math.max(esoTalk.checkForNewResultsInterval) * 1000);
},

// Get rid of html entities from tags and gambits
desanitize: function(value) {
	return value.replace(/\u00a0|&nbsp;/gi, " ").replace(/&gt;/gi, ">").replace(/&lt;/gi, "<").replace(/&amp;/gi, "&");
},

// Perform a search
search: function(query, hideLoading) {
	Search.currentSearch = getById("searchText").value = query;
	window.location.hash = "search:" + (query ? encodeURIComponent(query) : "");
	Search.resetUpdateCurrentResultsTimeout();
	Search.resetCheckForNewResultsTimeout();
		
	Ajax.request({
		"url": esoTalk.baseURL + "ajax.php?controller=search",
		"post": "action=search&query=" + encodeURIComponent(query),
		"background": hideLoading,
		"success": function() {
			if (this.messages) return;
			getById("searchResults").innerHTML = this.result;
			Messages.hideMessage("waitToSearch");
		}
	});
},

checkForNewResults: function() {
	var conversationIds = "";
	var rows = getById("conversations").getElementsByTagName("tr");
	for (var i = 0; i < rows.length; i++) conversationIds += rows[i].id.substr(1) + ",";
	Ajax.request({
		"url": esoTalk.baseURL + "ajax.php?controller=search",
		"post": "action=checkForNewResults&conversationIds=" + conversationIds + "&query=" + encodeURIComponent(Search.currentSearch),
		"background": true,
		"success": function() {
			if (!this.result.newActivity) return;
			getById("newResults").style.display = "table-row";
			show(getById("newResults").getElementsByTagName("div")[0], {animation: "verticalSlide"});
			clearInterval(Search.checkForNewResultsTimeout);
		}
	});
},

updateCurrentResults: function() {
	var conversationIds = "";
	var rows = getById("conversations").getElementsByTagName("tr");
	var count = Math.min(rows.length, 20);
	for (var i = 0; i < count; i++) conversationIds += rows[i].id.substr(1) + ",";
	if (!conversationIds) return;
	Ajax.request({
		"url": esoTalk.baseURL + "ajax.php?controller=search",
		"post": "action=updateCurrentResults&conversationIds=" + conversationIds,
		"background": true,
		"success": function() {
			if (!this.result) return;
			for (var i in this.result.conversations) {
				if (!getById("c" + i)) continue;
				var row = getById("c" + i);
				var data = this.result.conversations[i];
				if (data.postCount > 1) {
					getElementsByClassName(row, "lastPostMember")[0].innerHTML = data.lastPostMember;
					getElementsByClassName(row, "lastPostTime")[0].innerHTML = data.lastPostTime;
				}
				getElementsByClassName(row, "posts")[0].innerHTML = data.postCount;
				row.getElementsByTagName("strong")[0].className = data.unread ? "" : "read";
				var star;
				if (star = getElementsByClassName(row, "star")[0].getElementsByTagName("a")[0]) {
					star.className = data.starred ? "star1" : "star0";
					star.getElementsByTagName("span")[0].innerHTML = esoTalk.language[data.starred ? "Starred" : "Unstarred"];
					row.className = data.starred ? "starred" : "";
				}
			}
			for (var i in this.result.statistics) {
				if (getById("statistic-" + i)) getById("statistic-" + i).innerHTML = this.result.statistics[i];
			}
		}
	});
},

// View more search results - just search with the "more results" gambit.
viewMore: function() {
	Search.search(getById("searchText").value + (getById("searchText").value ? " + " : "") + esoTalk.language["more results"]);
},

// Show new activity - an alias for reperforming the current search.
showNewActivity: function() {
	Search.search(Search.currentSearch);
	Search.resetCheckForNewResultsTimeout();
},

// Add (or take away) a gambit from the search input.
gambit: function(gambit) {
	// Get the initial length of the search text.
	var initialLength = getById("searchText").value.length;
	// Make a regular expression to find any instances of the gambit already in there.
	var safe = gambit.replace(/([?^():\[\]])/g, "\\$1");
	var regexp = new RegExp(this.negativeGambit
		? "( ?(- *|!)" + safe + " *$|^ *!" + safe + " *\\+ ?| ?(- *|!)" + safe + "|^ *!" + safe + " *$)"
		: "( ?\\+ *" + safe + " *$|^ *" + safe + " *\\+ ?| ?\\+ *" + safe + "|^ *" + safe + " *$)"
	, "i");
	// If there is an instance, take it out.
	if (getById("searchText").value.match(regexp)) getById("searchText").value = getById("searchText").value.replace(regexp, "");
	// Otherwise, insert the gambit with a +, -, or ! before it.
	else {
		var insert = (getById("searchText").value ? (this.negativeGambit ? " - " : " + ") : (this.negativeGambit ? "!" : "")) + gambit;
		getById("searchText").focus();
		getById("searchText").value += insert;
		// If there is an instance of "?" or ":member" in the gambit, we want to select it so the user can type over it.
		var placeholderIndex, placeholder;
		if (insert.indexOf("?") != -1) {
			placeholderIndex = insert.indexOf("?");
			placeholder = "?";
		} else if (insert.indexOf(":" + esoTalk.language["member"]) != -1) {
			placeholderIndex = insert.indexOf(":" + esoTalk.language["member"]) + 1;
			placeholder = esoTalk.language["member"];
		}
		if (placeholderIndex) {
			// IE - move the cursor position relatively.
			if (typeof getById("searchText").setSelectionRange == "undefined") {
				var range = document.selection.createRange();
				range.moveStart("character", -insert.length + placeholderIndex);
				range.moveEnd("character", -insert.length + placeholderIndex + placeholder.length);
				range.select();
			// Good browsers - move the cursor position easily.
			} else getById("searchText").setSelectionRange(initialLength + placeholderIndex, initialLength + placeholderIndex + placeholder.length);
		}
	}
},

// Add (or take away) a tag from the search input
tag: function(tag) {
	Search.gambit(esoTalk.language["tag:"] + tag);
}

};



// "Join this forum" JavaScript.
var Join = {

fieldsValidated: {}, // An array of fields and if they've been validated.
timeouts: {},

// Initialize: disable the join button and set up the fields so they will automatically validate when typed in.
init: function() {
	var disableButton = false;
	for (var i in this.fieldsValidated) {
		getById(i).onkeydown = Join.validateField;
		if (!this.fieldsValidated[i]) disableButton = true;
	}
	if (disableButton) disable(getById("joinSubmit"));
},

// Validate a field with AJAX.
validateField: function() {
	var field = this;
	clearTimeout(Join.timeouts[field.id]);
	
	// Set a timeout so that the validation will only take place after the user has finished typing.
	Join.timeouts[field.id] = setTimeout(function() {
		Ajax.request({
			"url": esoTalk.baseURL + "ajax.php?controller=join",
			"success": function() {
				Join.fieldsValidated[field.id] = this.result.validated;

				// Change the message next to the field.
				message = getById(field.id + "-message");
				message.innerHTML = this.result.message;
				
				// Are all fields in the form validated? If so, enable the submit button.
				var formCompleted = true;
				for (var j in Join.fieldsValidated) {
					if (!Join.fieldsValidated[j]) formCompleted = false;
				}
				if (formCompleted) enable(getById("joinSubmit"));
				else disable(getById("joinSubmit"));
			},
			"post": "action=validate&field=" + field.id + "&value=" + encodeURIComponent(field.value) +
			// If we're validating the confirm password field, we'll need to know the password as well.
			(field.id == "confirm" ? "&password=" + encodeURIComponent(getById("password").value) : "")
		});
			
		// If we're validating the password field, validate the confirm password field too.
		if (field.id == "password") getById("confirm").onkeydown();
	}, 500);			
}

};


// Settings JavaScript.
var Settings = {

// Change the user's color.
changeColor: function(color) {
	
	// If the user's color is already set to this, we don't need to do anything!
	if ((new RegExp("c" + color + "$")).test(getById("preview").className)) return;
	
	// Make an AJAX request to change the color.
	Ajax.request({
		"url": esoTalk.baseURL + "ajax.php?controller=settings",
		"success": function() {
			if (this.messages) return;
			
			// Loop through the colors in the palette and "unselect" them.
			var colors = getById("palette").getElementsByTagName("a");
			for (var i = 0, c; c = colors[i]; i++) c.className = c.className.replace("selected", "");
			
			// Change the classes of the selected color and the preview post.
			getById("color-" + color).className += " selected";
			getById("preview").className = getById("preview").className.replace(/c\d+/, "c" + color);
			
		},
		"post": "action=changeColor&color=" + color,
		"background": false
	});
},

// Toggle the visibility of a fieldset. The fieldset contents must have id='{id}Form'.
toggleFieldset: function(id) {
	toggle(getById(id + "Form"), {animation: "verticalSlide"});
	getById(id).className = getById(id + "Form").showing ? "" : "hidden";
},

// Hide a fieldset (without animation). The fieldset contents must have id='{id}Form'.
hideFieldset: function(id) {
	hide(getById(id + "Form"));
	getById(id).className = "hidden";
}

};