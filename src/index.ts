import commander from 'commander';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import morgan from 'morgan';

import userRouter, { tokenCookie } from '@/api/user';
import { bootstrapDatabase, createUser, getUserByUsername } from '@/db';

dotenv.config({
    quiet: true,
});

if (!process.env.SECRET_KEY) {
    throw new Error('SECRET_KEY is not defined in environment variables');
}

const { SECRET_KEY } = process.env;

bootstrapDatabase();

const app = express();

app.use(morgan('dev'));

const apiRouter = express.Router();

apiRouter.use(cookieParser());

apiRouter.use(express.json());
apiRouter.use(express.urlencoded({ extended: true }));

apiRouter.use('/user', userRouter);

const authorizedRouter = express.Router();

authorizedRouter.use(async (req, res, next) => {
    const token = req.cookies[tokenCookie];

    if (!token) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }

    const decoded = jwt.verify(token, SECRET_KEY) as { username: string };

    if (!decoded) {
        res.status(401).json({ error: 'Invalid token' });
        return;
    }

    const user = await getUserByUsername(decoded.username);

    if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
    }

    (req as any).user = { username: user.username };

    next();
});

apiRouter.use(authorizedRouter);

const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || 'localhost';

if (process.env.NODE_ENV !== 'production') {
    app.use(cors());
}

app.use('/api', apiRouter);

// check if there are arguments -- if so, run in cli mode
if (process.argv.length > 2) {
    const program = new commander.Command();

    program
        .name('r3voc-cli')
        .version('1.0.0')
        .description('CLI for r3voc management');

    program
        .command('create-user <username> <password>')
        .description('Create a new user')
        .action((username, password) => {
            program.opts().createUser = true;
            program.args = [username, password];
        });

    program.exitOverride();

    try {
        program.parse(process.argv);
    } catch {
        console.log();
        program.outputHelp();
        process.exit(1);
    }

    const options = program.opts();

    if (options.createUser) {
        const [username, password] = program.args;
        if (!username || !password) {
            console.error(
                'Username and password are required to create a user',
            );
            process.exit(1);
        }

        createUser({ username, password })
            .then(() => {
                console.log(`User ${username} created successfully`);
                process.exit(0);
            })
            .catch(error => {
                console.error('Error creating user:', error.message);
                process.exit(1);
            });
    }
} else {
    // Start the server
    app.listen(PORT, HOST, () => {
        console.log(`Server is running at http://${HOST}:${PORT}`);
    });
}
