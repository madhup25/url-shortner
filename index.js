require('dotenv').config();
const express = require('express'),
    morgan = require('morgan'),
    helmet = require('helmet'),
    cors = require('cors'),
    mongoose = require('mongoose'),
    bodyParser = require('body-parser'),
    yup = require('yup'),
    { nanoid } = require('nanoid'),
    rateLimit = require('express-rate-limit'),
    slowDown = require('express-slow-down'),
    port = process.env.PORT || 5000;
    

// App Config and rate limit
const app = express();
const limiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 60 minutes
    max: 100, // limit each IP to 100 requests per windowMs
});
const speedLimiter = slowDown({
    windowMs: 60 * 60 * 1000, // 15 minutes
    delayAfter: 50, // allow 100 requests per 15 minutes, then...
    delayMs: 500, // begin adding 500ms of delay per request above 100:
    // request # 101 is delayed by  500ms
    // request # 102 is delayed by 1000ms
    // request # 103 is delayed by 1500ms
    // etc.
});

// MONGO DB Config
mongoose
    .connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => {
        console.log('Connected to DB!');
    })
    .catch((err) => {
        console.log('ERROR:', err.message);
    });

const urlSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
    },
    date: { type: Date, default: Date.now },
});
const URLS = mongoose.model('urls', urlSchema);

const schema = yup.object().shape({
    slug: yup
        .string()
        .trim()
        .matches(/^[a-z0-9]+$/i),
    url: yup.string().trim().url().required(),
});

// Express Middlewares
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors());
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
} else app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(express.static('./public'));

///////////////////////
// Routes
///////////////////////

// Home
app.get('/api', (req, res) => {
    res.json({ message: 'Welcome to url-shortner' });
});

app.get('/api/:slug', async (req, res) => {
    let { slug } = req.params;
    let existing = await URLS.findOne({ slug });
    if (!existing) {
        res.status(404);
        return res.json({
            message: 'Slug not found. 🙅‍♀️',
        });
    }
    res.redirect(existing.url);
});

app.get('/api/url/:slug', async (req, res) => {
    let { slug } = req.params;
    let existing = await URLS.findOne({ slug });
    if (!existing) {
        res.status(404);
        return res.json({
            message: 'Slug not found. 🙅‍♀️',
        });
    }
    res.json(existing);
});

// Create new short url
app.post('/api/url', limiter, speedLimiter, async (req, res, next) => {
    console.log(req.body);
    let { slug, url } = req.body;
    slug = slug.trim();
    url = url.trim();
    slug = slug.replace(/ /g, '');
    // url = url.replace(/ /g, '');
    try {
        if (!slug || slug == '') {
            slug = nanoid(6);
        }
        await schema.validate({
            slug,
            url,
        });
        // slug = slug.toLowerCase();
        const newUrl = {
            url,
            slug,
        };
        let created = await URLS.create(newUrl);
        res.json(created);
    } catch (error) {
        if (error.message.startsWith('E11000')) {
            error.message = 'Slug is in use. 🍕';
            error.status = 400;
        } else if (error.message.startsWith('slug')) {
            error.message = 'Slug can only contain a-z, A-Z, 0-9.';
            error.status = 400;
        }
        next(error);
    }
});

// Error Handler
app.use((error, req, res, next) => {
    error.status ? res.status(error.status) : res.status(500);
    res.json({
        message: error.message,
        stack: process.env.NODE_ENV === 'production' ? '📚' : error.stack,
    });
});

app.listen(port, () => {
    console.log(`Server started at port ${port}.`);
});
