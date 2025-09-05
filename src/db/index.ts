import argon2 from 'argon2';
import sqlite from 'sqlite3';

const path = 'db.sqlite';

const db = new sqlite.Database(path, err => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

const migrations: Record<number, string> = {
    1: `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
        );
    `,
};

export interface DbUser {
    id: number;
    username: string;
    password: string;
}

export const bootstrapDatabase = (): void => {
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY
            );
        `);

        db.get<{ id?: number }>(
            'SELECT MAX(id) as id FROM migrations',
            (err, row) => {
                if (err) {
                    console.error(
                        'Error fetching migration version:',
                        err.message,
                    );
                    return;
                }

                const currentVersion = row?.id || 0;
                const targetVersion = Math.max(
                    ...Object.keys(migrations).map(v => Number.parseInt(v, 10)),
                );

                const applyMigration = (version: number): void => {
                    if (version > targetVersion) {
                        console.log('All migrations applied.');
                        return;
                    }

                    const migration = migrations[version];
                    if (migration) {
                        db.run(migration, migrationError => {
                            if (migrationError) {
                                console.error(
                                    `Error applying migration ${version}:`,
                                    migrationError.message,
                                );
                            } else {
                                db.run(
                                    'INSERT INTO migrations (id) VALUES (?)',
                                    [version],
                                    bumpVersionError => {
                                        if (bumpVersionError) {
                                            console.error(
                                                `Error recording migration ${version}:`,
                                                bumpVersionError.message,
                                            );
                                        } else {
                                            console.log(
                                                `Migration ${version} applied successfully.`,
                                            );
                                            applyMigration(version + 1);
                                        }
                                    },
                                );
                            }
                        });
                    } else {
                        applyMigration(version + 1);
                    }
                };

                applyMigration(currentVersion + 1);
            },
        );
    });
};

export const getUserByUsername = async (
    username: string,
): Promise<DbUser | null> =>
    new Promise((resolve, reject) => {
        db.get<DbUser>(
            'SELECT * FROM users WHERE username = ?',
            [username],
            (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row || null);
                }
            },
        );
    });

export const createUser = async ({
    username,
    password,
}: {
    username: string;
    // Actual password, not password hash
    password: string;
}): Promise<void> => {
    const hashedPassword = await argon2.hash(password);

    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, hashedPassword],
            err => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            },
        );
    });
};

export default db;
