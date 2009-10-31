<?php
// Copyright 2009 Simon Zerner, Toby Zerner
// This file is part of esoTalk. Please see the included license file for usage information.

// esoTalk controller: Handles global actions such as logging in/out, preparing the bar, and collecting messages.

if (!defined("IN_ESOTALK")) exit;

class esoTalk extends Controller {

var $db;
var $user;
var $action;
var $allowedActions = array("conversation", "feed", "forgot-password", "join", "online", "plugins", "post", "profile", "search", "settings", "skins");
var $controller;
var $view = "wrapper.php";
var $language;
var $skin;
var $head = "";
var $scripts = array();
var $jsLanguage = array();
var $jsVars = array();
var $styleSheets = array();
var $footer = array();
var $labels = array(
	"sticky" => "IF(sticky=1,1,0)",
	"private" => "IF(private=1,1,0)",
	"locked" => "IF(locked=1,1,0)",
	"draft" => "IF(s.draft IS NOT NULL,1,0)"
);
var $memberGroups = array("Administrator", "Moderator", "Member", "Suspended");
var $bar = array("left" => array(), "right" => array());
var $plugins = array();

// Class constructor: connect to the database and perform other initializations.
function esoTalk()
{	
	global $config;

	// Connect to the database by setting up the database class.
	$this->db = new Database();
	$this->db->esoTalk =& $this;
	if (!$this->db->connect($config["mysqlHost"], $config["mysqlUser"], $config["mysqlPass"], $config["mysqlDB"]))
		$this->fatalError($config["verboseFatalErrors"] ? $this->db->error() : "");
	
	// Clear messages in the SESSION messages variable.
	if (!isset($_SESSION["messages"]) or !is_array($_SESSION["messages"])) $_SESSION["messages"] = array();
	
	// Create an instance of the Formatter class.
	$this->formatter = new Formatter();
}

// Initialize: set up the user and initialize the bar and other components of the page.
function init()
{
	global $language, $config;

	// Log out if necessary.
	if (@$_GET["q1"] == "logout") $this->logout();
		
	// Attempt to log in, and user assign data to the user array.
	if ($this->login(@$_POST["login"]["name"], @$_POST["login"]["password"])) {
		$this->user = $_SESSION["user"] + array(
			"admin" => $_SESSION["user"]["account"] == "Administrator",
			"moderator" => $_SESSION["user"]["account"] == "Moderator" or $_SESSION["user"]["account"] == "Administrator",
			"member" => $_SESSION["user"]["account"] == "Member",
			"suspended" => $_SESSION["user"]["account"] == "Suspended" ? true : null
		);
		$this->user["color"] = min($this->user["color"], $this->skin->numberOfColors);
	}
	
	// Set the default avatarAlignment for logged out users.
	if (!isset($_SESSION["avatarAlignment"])) $_SESSION["avatarAlignment"] = $config["avatarAlignment"];
	
	// Star a conversation if necessary.
	if (isset($_GET["star"])) $this->star($_GET["star"]);
	
	// If config/custom.css contains something, add it to be included in the page.
	if (filesize("config/custom.css") > 0) $this->addCSS("config/custom.css");

	// Only do the following for non-ajax requests.
	if (!defined("AJAX_REQUEST")) {
		
		// Check for updates, but only for the root admin.
		if ($this->user["memberId"] == $config["rootAdmin"]) {
			// How long ago was the last update check? If it was any more than 1 day ago, check again now.
			if (file_exists("config/lastUpdateCheck.php")) include "config/lastUpdateCheck.php";
			if (!isset($lastUpdateCheck) or time() - $lastUpdateCheck >= 86400) $this->checkForUpdates();
		}
	
		// If the user IS NOT logged in, add the login form and 'Join this forum' link to the bar.
		if (!$this->user) {
			$this->addToBar("left", "<form action='" . curLink() . "' method='post' id='login'><div>
<input id='loginName' name='login[name]' type='text' class='text' value='" . (!empty($_POST["login"]["name"]) ? $_POST["login"]["name"] : $language["Username"]) . "'/>
<input id='loginPassword' name='login[password]' type='password' class='text' value='********'/>
<input id='rememberMe' name='login[rememberMe]' type='checkbox' class='checkbox'/> <label for='rememberMe'>{$language["Remember me"]}</label>
" . $this->skin->button(array("value" => $language["Log in"])) . "
</div></form><script type='text/javascript'>" .
(empty($_POST["login"]["name"]) ? "makePlaceholder($('loginName'), '{$language["Username"]}');" : "") . "
makePlaceholder($('loginPassword'), '********');" . 
(!empty($_POST["login"]["name"]) ? "$('loginPassword').focus()" : "") . "
</script>", 100);
			$this->addToBar("left", "<a href='" . makeLink("join") . "'>{$language["Join this forum"]}</a>", 200);
			$this->addToBar("left", "<a href='" . makeLink("forgot-password") . "'>{$language["Forgot your password"]}</a>", 300);
		}
		
		// If the user IS logged in, we want to display their name and appropriate links.
		else {
			$this->addToBar("left", "<strong><a href='" . makeLink("profile") . "'>{$this->user["name"]}</a>:</strong>", 100);
			$this->addToBar("left", "<a href='" . makeLink("") . "'>{$language["Home"]}</a>", 200);
			$this->addToBar("left", "<a href='" . makeLink("conversation", "new") . "'>{$language["Start a conversation"]}</a>", 300);
			$this->addToBar("left", "<a href='" . makeLink("settings") . "'>{$language["My settings"]}</a>", 400);
			$this->addToBar("left", "<a href='" . makeLink("logout") . "'>{$language["Log out"]}</a>", 1000);
			if ($this->user["admin"]) {
				$this->addToBar("left", "<a href='" . makeLink("skins") . "'>{$language["Skins"]}</a>", 700);
				$this->addToBar("left", "<a href='" . makeLink("plugins") . "'>{$language["Plugins"]}</a>", 800);
			}
		}
		
		// Add the "Donate to esoTalk" link to the footer.
		$this->addToFooter("<a href='http://esotalk.com'>{$language["Donate to esoTalk"]}</a>");
		
		// Set up some default JavaScript files and language definitions.
		$this->addScript("js/esotalk.js", 100);
		$this->addLanguageToJS("ajaxRequestPending", "ajaxDisconnected");
				
	}
	
	$this->callHook("init");
}

// Run AJAX actions.
function ajax()
{
	global $config;
	
	if ($return = $this->callHook("ajax")) return $return;
	
	switch (@$_POST["action"]) {
		// Star/unstar a conversation.
		case "star": $this->star((int)$_POST["conversationId"]);
	}
}

// Attempt to login with argument data ($name and $password), with a cookie, or with a password hash ($hash).
function login($name = false, $password = false, $hash = false)
{
	global $config;
	
	// Are we already logged in?
	if (isset($_SESSION["user"])) return true;

	// If a raw password was passed, convert it into a hash.
	if ($name and $password) $hash = md5($config["salt"] . $password);
	
	// Otherwise attempt to get the member ID and password hash from a cookie.
	elseif ($hash === false) {
		$cookie = @$_COOKIE[$config["cookieName"]];
		$memberId = substr($cookie, 0, strlen($cookie) - 32);
		$hash = substr($cookie, -32);
	}
	
	// If we successfully have a name or member ID, and a hash, then we attempt to login.
	if (($name or $memberId = (int)$memberId) and $hash !== false) {
		
		// Construct the query components to select user data from the members table.
		$components = array(
			"select" => array("*"),
			"from" => array("{$config["tablePrefix"]}members"),
			"where" => array($name ? "name='" . $this->db->escape($name) . "'" : "memberId=$memberId", "password='" . $this->db->escape($hash) . "'")
		);
		
		// Get the user's IP address, and validate it against the cookie IP address if they're logging in via cookie.
		$ip = (int)ip2long($_SESSION["ip"]);
		if (isset($cookie)) $components["where"][] = "cookieIP=" . ($ip ? $ip : "0");
		
		$this->callHook("beforeLogin", array(&$components));

		// Run the query and get the data if there is a matching user.
		$result = $this->db->query($this->db->constructSelectQuery($components));
		if ($data = $this->db->fetchAssoc($result)) {
			
			$this->callHook("afterLogin", array(&$data));
			
			// If their account is unvalidated, show a message with a link to resend a verification email.
			if ($data["account"] == "Unvalidated") {
				$this->message("accountNotYetVerified", false, makeLink("join", "sendVerification", $data["memberId"]));
				return false;
			}
			
			// Assign the user data to a SESSION variable, and as a property of the esoTalk class.
			$_SESSION["user"] = $this->user = $data;
			
			// Regenerate the session ID and token.
			session_regenerate_id();
			regenerateToken();
			
			// If the "remember me" box was checked, set a cookie, and set the cookieIP field in the database.
			if (@$_POST["login"]["rememberMe"]) {
				$this->esoTalk->db->query("UPDATE {$config["tablePrefix"]}members SET cookieIP=$ip WHERE memberId={$_SESSION["user"]["memberId"]}");
				setcookie($config["cookieName"], $_SESSION["user"]["memberId"] . sanitizeForHTTP($hash), time() + $config["cookieExpire"], "/", $config["cookieDomain"]);
			}
			
			if (!$this->ajax) refresh();
			return true;
		}

		// If the user was intentionally logging in but it didn't work, show an incorrect login details error.
		if (!isset($cookie)) $this->message("incorrectLogin", false);

	}
	
	// Didn't completely fill out the login form? Return an error.
	elseif ($name or $password)	$this->message("incorrectLogin", false);
		
	return false;
}

// Log the user out.
function logout()
{
	global $config;
	
	// Destroy session data and regenerate the unique token.
	unset($_SESSION["user"]);
	regenerateToken();

	// Eat the cookie. OM NOM NOM
	if (isset($_COOKIE[$config["cookieName"]])) setcookie($config["cookieName"], "", -1, "/");
	
	$this->callHook("logout");

	// Redirect to the home page.
	redirect("");
}

// Validate $token against the actual token, $_SESSION["token"]. If it's incorrect, show a message.
function validateToken($token)
{
	if ($token != $_SESSION["token"]) {
		$this->message("noPermission");
		return false;
	} else return true;
}

// Fetch forum statistics, returning them in an array of key => statistic_text.
function getStatistics()
{
	global $config, $language;
	$result = $this->db->query("SELECT (SELECT COUNT(*) FROM {$config["tablePrefix"]}posts),
		(SELECT COUNT(*) FROM {$config["tablePrefix"]}conversations),
		(SELECT COUNT(*) FROM {$config["tablePrefix"]}members WHERE UNIX_TIMESTAMP()-{$config["userOnlineExpire"]}<lastSeen)");
	list($posts, $conversations, $membersOnline) = $this->db->fetchRow($result);
	$result = array(
		"posts" => number_format($posts) . " {$language["posts"]}",
		"conversations" => number_format($conversations) . " {$language["conversations"]}",
		"membersOnline" => number_format($membersOnline) . " " . $language[$membersOnline == 1 ? "member online" : "members online"]
	);
	$this->callHook("getStatistics", array(&$result));
	
	return $result;
}

// Check for updates to the esoTalk software.
function checkForUpdates()
{
	if ($this->ajax) return;
	
	// Write this as the latest update check time, so that another update check will not be performed for 24 hours.
	writeConfigFile("config/lastUpdateCheck.php", '$lastUpdateCheck', time());
	
	// Get the latest version from get.esotalk.com.
	if (($handle = @fopen("http://get.esotalk.com/latestVersion.txt", "r")) === false) return;
	$latestVersion = fread($handle, 8192);
	fclose($handle);
	
	// Compare the installed version and the latest version. Show a message if there is a new version.
	if (version_compare(ESOTALK_VERSION, $latestVersion) == -1) $this->message("updatesAvailable", false, $latestVersion);
}

// Check the first parameter of the URL against $name, and instigate the controller it refers to if they match.
function registerController($name, $file)
{
	if (@$_GET["q1"] == $name) {
		require_once $file;
		$this->action = $name;
		$this->controller = new $name;
		$this->controller->esoTalk =& $this;
	}
}

// Halt page execution and show a fatal error message.
function fatalError($message)
{
	global $language, $config;
	$this->callHook("fatalError", array(&$message));
	if ($this->ajax) {
		header("HTTP/1.0 500 Internal Server Error");
		echo strip_tags("{$language["Fatal error"]} - $message");
	} else {
		$messageTitle = isset($language["Fatal error"]) ? $language["Fatal error"] : "Fatal error";
		$messageBody = $language["fatalErrorMessage"] . ($message ? "<div>$message</div>" : "");
		include "views/message.php";
	}
	exit;
}

// Add a message to the messages language definition array.
function addMessage($key, $class, $message)
{
	global $messages;
	if (!isset($messages[$key])) $messages[$key] = array("class" => $class, "message" => $message);
	return $key;
}

// Display a message (referred to by $key) on the page. $arguments will be used to fill out placeholders in a message.
function message($key, $disappear = true, $arguments = false)
{
	$this->callHook("message", array(&$key, &$disappear, &$arguments));
	$_SESSION["messages"][] = array("message" => $key, "arguments" => $arguments, "disappear" => $disappear);
}

// Generate the HTML of a single message.
function htmlMessage($key, $arguments = false)
{
	global $messages;
	$m = $messages[$key];
	if (!empty($arguments)) $m["message"] = is_array($arguments) ? vsprintf($m["message"], $arguments) : sprintf($m["message"], $arguments);
	return "<div class='msg {$m["class"]}'>{$m["message"]}</div>";
}

// Generate the HTML of all of the collected messages to be displayed at the top of the page.
function getMessages()
{
	global $messages;
	
	// Loop through the messages and append the HTML of each one.
	$html = "<div id='messages'>";
	foreach ($_SESSION["messages"] as $m) $html .= $this->htmlMessage($m["message"], $m["arguments"]) . "\n";
	$html .= "</div>";
	
	// Add JavaScript code to register the messages individually in the Messages object.
	$html .= "<script type='text/javascript'>
Messages.init();";
	foreach ($_SESSION["messages"] as $m) {
		if (!empty($m["arguments"])) $text = is_array($m["arguments"]) ? vsprintf($messages[$m["message"]]["message"], $m["arguments"]) : sprintf($messages[$m["message"]]["message"], $m["arguments"]);
		else $text = $messages[$m["message"]]["message"];
		$html .= "Messages.showMessage(\"{$m["message"]}\", \"{$messages[$m["message"]]["class"]}\", \"" . escapeDoubleQuotes($text) . "\", " . ($m["disappear"] ? "true" : "false") . ");\n";
	}
	$html .= "</script>";
	
	return $html;
}

// Add a definition to the language array, but only if it has not already been defined.
function addLanguage($key, $value)
{
	global $language;
	$definition =& $language;
	foreach ((array)$key as $k) $definition =& $definition[$k];
	if (isset($definition)) return false;
	$definition = $value;
}

// Set a language definition(s) to be accessible by JavaScript code on the page.
function addLanguageToJS()
{
	global $language;
	$args = func_get_args();
	foreach ($args as $key) {
		$definition =& $language;
		foreach ((array)$key as $k) $definition =& $definition[$k];
		$this->jsLanguage[$k] =& $definition;
	}
}

// Set a JavaScript variable so it can be accessed by JavaScript code on the page.
function addVarToJS($key, $val)
{
	$this->jsVars[$key] = $val;
}

// Add a JavaScript file to be included in the page.
function addScript($script, $position = false)
{
	if (in_array($script, $this->scripts)) return false;
	addToArray($this->scripts, $script, $position);
}

// Add a string of HTML to be outputted inside of the <head> tag.
function addToHead($string)
{
	$this->head .= "\n$string";
}

// Generate all of the HTML to be outputted inside of the <head> tag.
function head()
{
	global $config, $language;
	
	$head = "<!-- This page was generated by esoTalk (http://esotalk.com) -->\n";
	
	// Base URL and RSS Feeds.
	$head .= "<base href='{$config["baseURL"]}'/>\n";
	$head .= "<link href='{$config["baseURL"]}" . makeLink("feed") . "' rel='alternate' type='application/rss+xml' title='{$language["Recent posts"]}'/>\n";
	if ($this->action == "conversation" and !empty($this->controller->conversation["id"]))
		$head .= "<link href='{$config["baseURL"]}" . makeLink("feed", "conversation", $this->controller->conversation["id"]) . "' rel='alternate' type='application/rss+xml' title='\"{$this->controller->conversation["title"]}\"'/>";

	// Stylesheets.
	ksort($this->styleSheets);
	foreach ($this->styleSheets as $styleSheet) {
		// If media is ie6 or ie7, use conditional comments.
		if ($styleSheet["media"] == "ie6" or $styleSheet["media"] == "ie7")
			$head .= "<!--[if " . ($styleSheet["media"] == "ie6" ? "lte IE 6" : "IE 7") . "]><link rel='stylesheet' href='{$styleSheet["href"]}' type='text/css'/><![endif]-->\n";
		// If not, use media as an attribute for the link tag.
		else $head .= "<link rel='stylesheet' href='{$styleSheet["href"]}' type='text/css'" . (!empty($styleSheet["media"]) ? " media='{$styleSheet["media"]}'" : "") . "/>\n";
	}

	// JavaScript: output all necessary config variables and language definitions, as well as other variables.
	$esoTalkJS = array(
		"baseURL" => $config["baseURL"],
		"user" => $this->user ? $this->user["name"] : false,
		"skin" => $config["skin"],
		"disableAnimation" => !empty($this->esoTalk->user["disableJSEffects"]),
		"avatarAlignment" => !empty($this->esoTalk->user["avatarAlignment"]) ? $this->esoTalk->user["avatarAlignment"] : $_SESSION["avatarAlignment"],
		"messageDisplayTime" => $config["messageDisplayTime"],
		"language" => $this->jsLanguage,
		"token" => $_SESSION["token"]
	) + $this->jsVars;
	$head .= "<script type='text/javascript'>// <![CDATA[
var esoTalk=" . json($esoTalkJS) . ",isIE6,isIE7// ]]></script>\n";
	
	// Add the scripts collected in the $this->scripts array (via $this->addScript()).
	ksort($this->scripts);
	foreach ($this->scripts as $script) $head .= "<script type='text/javascript' src='$script'></script>\n";
	
	// Conditional browser comments to detect IE.
	$head .= "<!--[if lte IE 6]><script type='text/javascript' src='js/ie6TransparentPNG.js'></script><script type='text/javascript'>var isIE6=true</script><![endif]-->\n<!--[if IE 7]><script type='text/javascript'>var isIE7=true</script><![endif]-->";
	
	// Finally, append the custom HTML string constructed via $this->addToHead().
	$head .= $this->head;
	
	$this->callHook("head", array(&$head));

	return $head;
}

// Add a string of HTML to the bar.
function addToBar($side, $html, $position = false)
{
	addToArray($this->bar[$side], $html, $position);
}

// Add a string of HTML to the page footer.
function addToFooter($html, $position = false)
{
	addToArray($this->footer, $html, $position);
}

// Add a CSS file to be included on the page.
function addCSS($styleSheet, $media = false) 
{
	if (in_array(array("href" => $styleSheet, "media" => $media), $this->styleSheets)) return false;
	addToArray($this->styleSheets, array("href" => $styleSheet, "media" => $media));
}

// Star/unstar a conversation.
function star($conversationId)
{
	if (!$this->user) return false;

	global $config;	
	$conversationId = (int)$conversationId;
	
	// If this is a new conversation (ie. no ID is specified), toggle the SESSION star variable.
	if (!$conversationId) $_SESSION["starred"] = !@$_SESSION["starred"];
	
	// Otherwise, toggle the database star field.
	else {
		$query = "INSERT INTO {$config["tablePrefix"]}status (conversationId, memberId, starred) VALUES ($conversationId, {$this->user["memberId"]}, 1) ON DUPLICATE KEY UPDATE starred=IF(starred=1,0,1)";
		$this->db->query($query);
		
		$this->callHook("star", array($conversationId));
	}
}

// Generate the HTML for a star.
function htmlStar($conversationId, $starred)
{
	global $language;
	
	// If the user is not logged in, return an unclickable star.
	if (!$this->user) return "<span class='star0'>{$language["*"]}</span>";
	
	// Otherwise, return a clickable star, depending on the starred state.
	else {
		$conversationId = (int)$conversationId;
		return "<a href='" . makeLink(@$_GET["q1"], @$_GET["q2"], @$_GET["q3"], "?star=$conversationId") . "' onclick='toggleStar($conversationId, this);return false' class='star" . ($starred ? "1" : "0") . "'>{$language["*"]}<span> " . ($starred ? $language["Starred"] : $language["Unstarred"]) . "</span></a>";
	}
}

// Return the path to a user's avatar, depending on its format.
function getAvatar($memberId, $avatarFormat, $type = false)
{
	if ($return = $this->callHook("getAvatar", array($memberId, $avatarFormat, $type))) return $return;
	
	// If this is a full-sized gif avatar, we need to render it via gif.php for security purposes.
	if ($avatarFormat == "gif" and $type != "thumb" and file_exists("avatars/$memberId.gif")) {
	 	return "avatars/gif.php?id=$memberId";
	}
	
	// Otherwise, construct the avatar path from the provided information.
	elseif ($avatarFormat) {
		$file = "avatars/$memberId" . ($type == "thumb" ? "_thumb" : "") . ".$avatarFormat";
		if (file_exists($file)) return $file;
	}
	
	// If the user doesn't have an avatar, return the default one.
	if (!$avatarFormat) {
		global $config;
		switch ($type) {
			case "l": return "skins/{$config["skin"]}/avatarLeft.png";
			case "r": return "skins/{$config["skin"]}/avatarRight.png";
			case "thumb": return "skins/{$config["skin"]}/avatarThumb.png";
		}
	}
}

// Update the user's last action.
function updateLastAction($action)
{
	if (!$this->user) return false;
	
	$this->callHook("updateLastAction", array(&$action));
	
	global $config;
	$action = $this->db->escape(substr($action, 0, 255));
	$query = "UPDATE {$config["tablePrefix"]}members SET lastAction='$action', lastSeen=" . time() . " WHERE memberId={$this->user["memberId"]}";
	$this->user["lastSeen"] = $_SESSION["user"]["lastSeen"] = time();
	$this->user["lastAction"] = $_SESSION["user"]["lastAction"] = $action;
	$this->db->query($query);
}

// Change a member's group.
function changeMemberGroup($memberId, $newGroup, $currentGroup = false)
{
	global $config;
	$memberId = (int)$memberId;
	
	// Make sure we have the member's current group (if it wasn't passed as an argument.)
	if (!$currentGroup) $currentGroup = $this->db->result($this->db->query("SELECT account FROM {$config["tablePrefix"]}members WHERE memberId=$memberId"), 0);
	
	// Determine which groups the member can be changed to.
	if (!($possibleGroups = $this->canChangeGroup($memberId, $currentGroup)) or !in_array($newGroup, $possibleGroups)) return false;
	
	$this->callHook("changeMemberGroup", array(&$newGroup));
	
	// Change the group!
	$this->db->query("UPDATE {$config["tablePrefix"]}members SET account='$newGroup' WHERE memberId=$memberId");
}

// To change $member's group $this->user must be an admin and $member != rootAdmin and $member != $this->user.
// If $this->user is a moderator and $member's $group is member or suspended, the group can be changed between member/suspended.
// This function will return an array of groups $member can be changed to.
function canChangeGroup($memberId, $group)
{
	global $config;
	if (!$this->user or !$this->user["moderator"] or $memberId == $this->user["memberId"] or $memberId == $config["rootAdmin"]) return false;
	if ($this->user["admin"]) return $this->memberGroups;
	if ($this->user["moderator"] and ($group == "Member" or $group == "Suspended")) return array("Member", "Suspended");
}

// Returns whether or not the logged in user is suspended.
function isSuspended()
{
	global $config;
	if (!$this->user) return false;
	
	// If the user's suspension is unknown, get it from the database and cache it for later.
	if ($this->user["suspended"] !== true and $this->user["suspended"] !== false) {
		$account = $this->db->result("SELECT account FROM {$config["tablePrefix"]}members WHERE memberId={$this->user["memberId"]}", 0);
		$this->user["account"] = $_SESSION["user"]["account"] = $account;
		$this->user["suspended"] = $account == "Suspended";
	}
	return $this->user["suspended"];
}

}

?>