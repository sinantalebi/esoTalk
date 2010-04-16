<?php
// Copyright 2010 Toby Zerner, Simon Zerner
// This file is part of esoTalk. Please see the included license file for usage information.

// Index page: Fires events required for the page to load and display.
// Initializes controllers and plugins, works out what to display, and displays it.

define("IN_ESOTALK", 1);

// Basic page initialization: include configuration settings, check the version, require essential files,
// start a session, fix magic quotes/register_globals, sanitize request data, include the esoTalk controller,
// skin file, language file, and load plugins.
require "lib/init.php";

// Set up the action controller.
$q1 = strtolower(@$_GET["q1"]);

// If the first URL parameter is numeric, assume the conversation controller.
if (is_numeric($q1)) {
	$_GET["q4"] = @$_GET["q3"];
	$_GET["q3"] = @$_GET["q2"];
	$_GET["q2"] = @$_GET["q1"];
	$_GET["q1"] = $q1 = "conversation";
}
// Does this controller exist? If not, just use the search action.
$esoTalk->action = in_array($q1, $esoTalk->allowedActions) ? $q1 : $esoTalk->action = "search";

// Include and set up the controller corresponding to the chosen action.
$esoTalk->controller = $factory->make($esoTalk->action);
$esoTalk->controller->esoTalk =& $esoTalk;

// Include the custom.php file.
if (file_exists("config/custom.php")) include "config/custom.php";

// Run plugin init() functions. These will hook onto controllers and add things like language definitions.
foreach ($esoTalk->plugins as $plugin) $plugin->init();

// Initialize esoTalk (connect to the db, login, stylesheets, user bar, etc.)
$esoTalk->init();

// Initialize the controller (define variable page content, process forms, etc.)
$esoTalk->controller->init();

// Show the page!
header("Content-type: text/html; charset={$language["charset"]}");
//if (!empty($config["gzipOutput"]) and !ob_start("ob_gzhandler")) ob_start();
$esoTalk->render();
ob_flush();

// Clear messages from the session.
$_SESSION["messages"] = array();

?>