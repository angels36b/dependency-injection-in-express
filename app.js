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

    // 1. Login exacto exigido por el enunciado
    const MY_LOGIN = 'c720c4f2-1c4d-43f9-85d9-363d11d18116';

    app.get('/login/', (req, res) => {
        res.type('text/plain').send(MY_LOGIN);
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

    // 2. Ruta /insert/ usando createConnection para aislar cada petición
    app.post('/insert/', async (req, res) => {
        const { login, password, URL } = req.body;

        if (!login || !password || !URL) {
            return res.status(400).send('Faltan datos');
        }

        let conn;
        try {
            conn = await mongoose.createConnection(URL, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });

            const userSchema = new mongoose.Schema({
                login: String,
                password: String
            });

            const User = conn.model('User', userSchema, 'users');
            await User.create({ login, password });

            res.status(201).send('OK');
        } catch (error) {
            res.status(500).send('Error de base de datos: ' + error.message);
        } finally {
            if (conn) await conn.close();
        }
    });

    app.all('/{*splat}', (req, res) => {
        res.type('text/plain').send(MY_LOGIN);
    });

    return app;
}