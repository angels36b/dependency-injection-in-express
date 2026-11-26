export default function appSrc(express, bodyParser, createReadStream, crypto, http, mongoose) {
    const app = express();

    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,OPTIONS,DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') return res.sendStatus(200);

        const queryIndex = req.originalUrl.indexOf('?');
        const path = queryIndex === -1 ? req.originalUrl : req.originalUrl.slice(0, queryIndex);
        const query = queryIndex === -1 ? '' : req.originalUrl.slice(queryIndex);

        if (path !== '/' && !path.endsWith('/')) {
            return res.redirect(308, path + '/' + query);
        }
        next();
    });

    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    app.get('/login/', (req, res) => {
        res.send('angel36b');
    });

    app.get('/code/', (req, res) => {
        res.type('text/plain');
        createReadStream(import.meta.url.substring(7)).pipe(res);
    });

    app.get('/sha1/:input/', (req, res) => {
        const hash = crypto.createHash('sha1').update(req.params.input).digest('hex');
        res.send(hash);
    });

    app.all('/req/', (req, res) => {
        const addr = req.query.addr || req.body.addr;
        if (!addr) return res.status(400).send('Falta addr');

        http.get(addr, (response) => {
            response.setEncoding('utf8');
            let data = '';
            response.on('data', (chunk) => { data += chunk; });
            response.on('end', () => { res.type('text/plain').send(data); });
        }).on('error', (err) => {
            res.status(500).send('Error: ' + err.message);
        });
    });

    app.post('/insert/', async (req, res) => {
        const { login, password, URL } = req.body;

        if (!login || !password || !URL) {
            return res.status(400).send('Faltan datos');
        }

        try {
            await mongoose.connect(URL);

            const userSchema = new mongoose.Schema({
                login: String,
                password: String
            });

            const User = mongoose.models.User || mongoose.model('User', userSchema, 'users');

            const newUser = new User({ login, password });
            await newUser.save();

            await mongoose.connection.close();

            res.status(200).send('OK');
        } catch (error) {
            res.status(500).send('Error de base de datos: ' + error.message);
        }
    });

    app.all('/{*splat}', (req, res) => {
        res.send('angel36b');
    });

    return app;
}