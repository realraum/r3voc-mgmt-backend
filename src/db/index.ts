import argon2 from 'argon2';
import sqlite from 'sqlite3';
import pathlib from 'node:path';

const path = pathlib.join('uploads', 'db.sqlite');

const isCli = process.argv.length > 2;

const db = new sqlite.Database(path, err => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else if (!isCli) {
        console.log('Connected to the SQLite database.');
    }
});

export interface DbUser {
    id: number;
    username: string;
    password: string;
}

export interface DbUploadedFile {
    id: number;
    path: string;
    rendered: boolean;
    importGuid: string;
    importId: number;
}

const migrations: Record<number, string> = {
    1: `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
        );
    `,
    2: `
        CREATE TABLE IF NOT EXISTS uploaded_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT NOT NULL UNIQUE,
            rendered BOOLEAN NOT NULL DEFAULT 0,
            importGuid TEXT NOT NULL UNIQUE,
            importId INTEGER NOT NULL UNIQUE
        );
    `,
};

export const bootstrapDatabase = ({ quiet }: { quiet: boolean }): void => {
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
                        if (!quiet) {
                            console.log('All migrations applied.');
                        }
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
                                            if (!quiet) {
                                                console.log(
                                                    `Migration ${version} applied successfully.`,
                                                );
                                            }
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
    if (!username || !password) {
        throw new Error('Username and password are required');
    }

    if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
    }

    // password needs at least one uppercase letter, one lowercase letter, one number and one special character
    if (
        !/[a-z]/.test(password) ||
        !/[A-Z]/.test(password) ||
        !/[0-9]/.test(password) ||
        !/[^A-Za-z0-9]/.test(password)
    ) {
        throw new Error(
            'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
        );
    }

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

export const deleteUser = async (username: string): Promise<void> =>
    new Promise((resolve, reject) => {
        db.run('DELETE FROM users WHERE username = ?', [username], err => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });

export const getUploadedFiles = async (): Promise<DbUploadedFile[]> =>
    new Promise((resolve, reject) => {
        db.all<DbUploadedFile>(
            'SELECT * FROM uploaded_files ORDER BY id DESC',
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            },
        );
    });

export const addUploadedFile = async ({
    filepath,
    importGuid,
    importId,
}: {
    filepath: string;
    importGuid: string;
    importId: number;
}): Promise<void> => {
    if (!filepath || !importGuid || !importId) {
        throw new Error('Filepath, importGuid and importId are required');
    }

    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO uploaded_files (path, importGuid, importId) VALUES (?, ?, ?)',
            [filepath, importGuid, importId],
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

export const getUploadedFileByImportId = async (
    importId: number,
): Promise<DbUploadedFile | null> =>
    new Promise((resolve, reject) => {
        db.get<DbUploadedFile>(
            'SELECT * FROM uploaded_files WHERE importId = ?',
            [importId],
            (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row || null);
                }
            },
        );
    });

export const markVideoRendered = async (importId: number): Promise<void> =>
    new Promise((resolve, reject) => {
        db.run(
            'UPDATE uploaded_files SET rendered = 1 WHERE importId = ?',
            [importId],
            err => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            },
        );
    });
