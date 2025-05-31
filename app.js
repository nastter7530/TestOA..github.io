var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

const lineWebhookRouter = require('./routes/lineWebhook'); // add this line
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

console.log('✅ Middleware and static files set up');

app.use('/', indexRouter);
console.log('✅ Index router set up');
app.use('/users', usersRouter);
console.log('✅ Users router set up');
// app.use('/webhook', lineWebhookRouter); // add this line
app.use('/webhook', express.raw({ type: '*/*' }), lineWebhookRouter);
console.log('✅ LINE webhook router set up with express.raw');

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  console.warn('⚠️ 404 Not Found:', req.originalUrl);
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  console.error('❌ Error handler:', err);
  res.status(err.status || 500);
  res.render('error');
});

console.log('✅ App setup complete');

module.exports = app;
