import argon2 from 'argon2';
import express from 'express';
import jwt from 'jsonwebtoken';

import type { ApiResponse } from '@/api/types';
import { getUserByUsername } from '@/db';

const userRouter = express.Router();

export interface ApiUser {
    username: string;
}

export const tokenCookie = 'r3voc_token';

userRouter.post(
    '/login',
    async (req, res: express.Response<ApiResponse<ApiUser>>) => {
        const { username, password } = req.body;

        if (!username || !password) {
            res.status(400).json({
                success: false,
                error: 'Username and password are required',
            });
            return;
        }

        const user = await getUserByUsername(username);

        const isPasswordValid = user
            ? await argon2.verify(user.password, password)
            : false;

        if (!user || !isPasswordValid) {
            res.status(401).json({
                success: false,
                error: 'Invalid username or password',
            });
            return;
        }

        const token = jwt.sign(
            { username: user.username },
            process.env.SECRET_KEY!,
            {
                expiresIn: '24h',
            },
        );

        res.cookie(tokenCookie, token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
        });

        res.json({ success: true, data: { username: user.username } });
    },
);

userRouter.post('/logout', (req, res: express.Response<ApiResponse>) => {
    res.clearCookie(tokenCookie);
    res.json({ success: true, data: null });
});

userRouter.get(
    '/info',
    async (req, res: express.Response<ApiResponse<ApiUser | null>>) => {
        const token = req.cookies[tokenCookie];

        if (!token) {
            res.status(401).json({
                success: false,
                error: 'Not authenticated',
            });
            return;
        }

        try {
            const decoded = jwt.verify(token, process.env.SECRET_KEY!) as {
                username: string;
            };

            const user = await getUserByUsername(decoded.username);

            if (!user) {
                res.status(401).json({
                    success: false,
                    error: 'Invalid token',
                });
                return;
            }

            res.json({ success: true, data: { username: decoded.username } });
        } catch {
            res.status(401).json({ success: false, error: 'Invalid token' });
        }
    },
);

export default userRouter;
