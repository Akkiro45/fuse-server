require('./config/config');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const _ = require('lodash');
const helmet = require('helmet');

const {mongoose} = require('./db/mongoose');
const userRoutes = require('./routes/user');
const customerRoutes = require('./routes/customer');
const shopRoutes = require('./routes/shop');
const orderRoutes = require('./routes/order');
const sessionRoutes = require('./routes/session');

const app = express();
const port = process.env.PORT;
const apiSecret = 'fuse';

app.use(bodyParser.json());
app.use(helmet());
app.use(cors());

// Routes
app.use(`/${apiSecret}/users`, userRoutes);
app.use(`/${apiSecret}/customer`, customerRoutes);
app.use(`/${apiSecret}/shop`, shopRoutes);
app.use(`/${apiSecret}/order`, orderRoutes);
app.use(`/${apiSecret}/session`, sessionRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = {
  app,
  apiSecret
};
