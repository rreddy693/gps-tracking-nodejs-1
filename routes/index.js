var express = require('express');
var router = express.Router();
var devices = require('../bin/devices');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/devices', function(req, res, next){
	res.status(200).json(devices.devices);
});

module.exports = router;
