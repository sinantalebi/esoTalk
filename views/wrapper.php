<?php
// Copyright 2009 Simon Zerner, Toby Zerner
// This file is part of esoTalk. Please see the included license file for usage information.

// esoTalk wrapper: displays a HTML page with a header, bar, and footer.

if (!defined("IN_ESOTALK")) exit;
?>
<!DOCTYPE html PUBLIC '-//W3C//DTD XHTML 1.0 Strict//EN' 'http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd'>
<html xmlns='http://www.w3.org/1999/xhtml' xml:lang='en' lang='en'>
<head>
<meta http-equiv='Content-Type' content='text/html; charset=<?php echo $language["charset"]; ?>'/>
<title><?php echo ($this->controller->title ? $this->controller->title . " - " : "") . $config["forumTitle"]; ?></title>
<?php echo $this->head(); ?> 
</head>

<body>
<?php $this->callHook("pageStart"); ?>

<div id='loading' style='display:none'><?php echo $language["Loading"]; ?></div>

<?php echo $this->getMessages(); ?>

<div id='wrapper'<?php if ($this->action != "search"): ?> class='small'<?php endif; ?>>

<div id='hdr'>
<h1><a href='' title='<?php echo $config["forumTitle"]; ?>'><img src='<?php echo !empty($config["forumLogo"]) ? $config["forumLogo"] : "skins/{$config["skin"]}/logo.gif"; ?>' alt=''/> <span id='forumTitle'><?php echo $config["forumTitle"]; ?></span></a></h1>
<?php if ($this->action == "search"): ?>
<p id='stats'>
<?php foreach ($this->getStatistics() as $k => $v): ?>
<span id='statistic-<?php echo $k; ?>'><?php echo $v; ?></span><br/>
<?php endforeach; ?>
</p>
<?php else: include "views/searchForm.inc.php"; endif; ?>
</div>
	
<div id='bar'>
<?php if (count($this->bar["left"])): ?><ul class='fl'><?php ksort($this->bar["left"]); foreach ($this->bar["left"] as $v) echo "<li>$v</li>"; ?></ul><?php endif; ?>
<?php if (count($this->bar["right"])): ?><ul class='fr'><?php ksort($this->bar["right"]); foreach ($this->bar["right"] as $v) echo "<li>$v</li>"; ?></ul><?php endif; ?>
</div>

<div id='body'>
<?php $this->controller->render(); ?>
</div>

<?php $this->callHook("footer"); ?>
<div id='ftr'>
<?php if (count($this->footer)): ?><ul><?php
ksort($this->footer);
foreach ($this->footer as $v) echo "<li>$v</li>";
?></ul><?php endif; ?>
<p id='copyright'>
<!-- The following text constitutes a copyright notification and, under the terms of the GNU GPL (see LICENSE), may neither be removed nor altered in any way which makes it invisible, affects the hyperlink, or changes the text "Powered by esoTalk". -->
Powered by <a href='http://esotalk.com/'>esoTalk</a>&trade; <?php if ($this->user["admin"]) echo ESOTALK_VERSION; ?>
<!-- End copyright notification -->
</p>
</div>

</div>

<?php $this->callHook("pageEnd"); ?>
</body>
</html>