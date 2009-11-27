<?php
// Copyright 2009 Simon Zerner, Toby Zerner
// This file is part of esoTalk. Please see the included license file for usage information.

// Message page (used for fatal errors, upgrade script, etc.)

if (!defined("IN_ESOTALK")) exit;
?>
<!DOCTYPE html PUBLIC '-//W3C//DTD XHTML 1.0 Strict//EN' 'http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd'>
<!-- This page was generated by esoTalk (http://esotalk.com) -->
<html xmlns='http://www.w3.org/1999/xhtml' xml:lang='en' lang='en'>
<head>
<title><?php echo isset($config["forumTitle"]) ? $config["forumTitle"] : "esoTalk"; ?></title>
<meta http-equiv='Content-Type' content='text/html; charset=<?php echo isset($language["charset"]) ? $language["charset"] : "utf8"; ?>'/>
<?php if (!empty($config["baseURL"])): ?><base href='<?php echo $config["baseURL"]; ?>'/><?php endif; ?>
<style type='text/css'>
body {background:#fff; font-size:75%; font-family:arial,helvetica,sans-serif; margin:0}
#container {margin:50px auto; width:55em; background:#f5f5ff; padding:20px; font-size:120%; line-height:1.4}
h1 {margin:0 0 20px; font-size:150%; font-weight:normal; color:#32517e}
#container div.info {border:1px dashed #bbf; padding:10px}
a {color:#00f; text-decoration:none}
a:hover {color:#000; text-decoration:underline}
</style>
<?php if (!empty($messageHead)) echo $messageHead; ?>
</head>
<body>
	
<div id='container'>
<h1><?php echo $messageTitle; ?></h1>
<?php echo $messageBody; ?>
</div>

</body>
</html>