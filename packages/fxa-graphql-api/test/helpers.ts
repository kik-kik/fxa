/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
import Chance from 'chance';
import fs from 'fs';
import { setupAuthDatabase } from 'fxa-shared/db';
import { Account } from 'fxa-shared/db/models/auth/account';
import { knex, Knex } from 'knex';
import path from 'path';

export type AccountIsh = Pick<
  Account,
  'uid' | 'email' | 'emails' | 'normalizedEmail'
>;

export const chance = new Chance();

const thisDir = path.dirname(__filename);
export const accountTable = fs.readFileSync(
  path.join(thisDir, './accounts.sql'),
  'utf8'
);
export const emailsTable = fs.readFileSync(
  path.join(thisDir, './emails.sql'),
  'utf8'
);
export const linkedAccountsTable = fs.readFileSync(
  path.join(thisDir, './linked-accounts.sql'),
  'utf8'
);

export function randomAccount() {
  const email = chance.email();
  return {
    authSalt: '00',
    createdAt: chance.timestamp(),
    email,
    emailCode: '00',
    emailVerified: true,
    kA: '00',
    normalizedEmail: email,
    uid: chance.guid({ version: 4 }).replace(/-/g, ''),
    verifierSetAt: chance.timestamp(),
    verifierVersion: 0,
    verifyHash: '00',
    wrapWrapKb: '00',
  };
}

export function randomEmail(account: AccountIsh, primary = true) {
  return {
    createdAt: chance.timestamp(),
    email: account.email,
    emailCode: '00000000000000000000000000000000',
    isPrimary: primary,
    isVerified: true,
    normalizedEmail: account.normalizedEmail,
    uid: account.uid,
  };
}

export async function testDatabaseSetup(): Promise<Knex> {
  // Create the db if it doesn't exist
  let instance = knex({
    client: 'mysql',
    connection: {
      charset: 'UTF8MB4_BIN',
      host: 'localhost',
      password: '',
      port: 3306,
      user: 'root',
    },
  });

  await instance.raw('DROP DATABASE IF EXISTS testAdmin');
  await instance.raw('CREATE DATABASE testAdmin');
  await instance.destroy();

  instance = setupAuthDatabase({
    database: 'testAdmin',
    host: 'localhost',
    password: '',
    port: 3306,
    user: 'root',
  });

  await instance.raw(accountTable);
  await instance.raw(emailsTable);
  await instance.raw(linkedAccountsTable);

  /* Debugging Assistance
   knex.on('query', (data) => {
     console.dir(data);
   });
   */
  return instance;
}
