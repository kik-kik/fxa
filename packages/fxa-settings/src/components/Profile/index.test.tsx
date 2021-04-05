/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { Profile } from '.';
import { renderWithRouter } from '../../models/_mocks';
import { Account, AccountContext } from '../../models';

const account = ({
  avatar: { url: null, id: null },
  primaryEmail: {
    email: 'vladikoff@mozilla.com',
  },
  emails: [],
  displayName: 'Vlad',
  passwordCreated: 0,
} as unknown) as Account;

// todo:
// add test cases for different states, including secondary email
describe('Profile', () => {
  it('renders "fresh load" <Profile/> with correct content', async () => {
    const { findByText } = renderWithRouter(
      <AccountContext.Provider value={{ account }}>
        <Profile />
      </AccountContext.Provider>
    );

    expect(await findByText('Vlad')).toBeTruthy;
    expect(await findByText('vladikoff@mozilla.com')).toBeTruthy;
  });
});
