/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import 'mutationobserver-shim';
import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { act, fireEvent, screen } from '@testing-library/react';
import PageDisplayName from '.';
import { renderWithRouter } from '../../models/_mocks';
import { alertTextExternal } from '../../lib/cache';
import { HomePath } from '../../constants';
import { Account, AccountContext } from '../../models';
import { AlertBarRootAndContextProvider } from '../../lib/AlertBarContext';

jest.mock('../../lib/cache', () => ({
  alertTextExternal: jest.fn(),
}));

const inputDisplayName = async (newName: string) => {
  await act(async () => {
    fireEvent.input(screen.getByTestId('input-field'), {
      target: { value: newName },
    });
  });
};
const submitDisplayName = async (newName: string) => {
  await inputDisplayName(newName);
  await act(async () => {
    fireEvent.click(screen.getByTestId('submit-display-name'));
  });
};

const account = ({
  displayName: 'jrgm',
  setDisplayName: jest.fn().mockResolvedValue(true),
} as unknown) as Account;

it('renders', async () => {
  renderWithRouter(
    <AccountContext.Provider value={{ account }}>
      <PageDisplayName />
    </AccountContext.Provider>
  );
  expect(screen.getByTestId('flow-container')).toBeInTheDocument();
  expect(screen.getByTestId('flow-container-back-btn')).toBeInTheDocument();
  expect(screen.getByTestId('input-field')).toBeInTheDocument();
  expect(screen.getByTestId('submit-display-name')).toBeInTheDocument();
});

it('updates the disabled state of the save button', async () => {
  renderWithRouter(
    <AccountContext.Provider value={{ account }}>
      <PageDisplayName />
    </AccountContext.Provider>
  );

  // initial value
  expect(screen.getByTestId('submit-display-name')).toBeDisabled();

  // empty value allowed
  await inputDisplayName('');
  expect(screen.getByTestId('submit-display-name')).not.toBeDisabled();

  // new value
  await inputDisplayName('testo');
  expect(screen.getByTestId('submit-display-name')).not.toBeDisabled();

  // original value
  await inputDisplayName(account.displayName!);
  expect(screen.getByTestId('submit-display-name')).toBeDisabled();
});

it('navigates back to settings home and shows a success message on a successful update', async () => {
  renderWithRouter(
    <AccountContext.Provider value={{ account }}>
      <PageDisplayName />
    </AccountContext.Provider>
  );
  await submitDisplayName('John Hope');
  expect(window.location.pathname).toBe(HomePath);
  expect(alertTextExternal).toHaveBeenCalledTimes(1);
  expect(alertTextExternal).toHaveBeenCalledWith('Display name updated.');
});

it('displays a general error in the alert bar', async () => {
  const gqlError: any = new Error('test error');
  const account = ({
    displayName: 'jrgm',
    setDisplayName: jest.fn().mockRejectedValue(gqlError),
  } as unknown) as Account;
  renderWithRouter(
    <AccountContext.Provider value={{ account }}>
      <AlertBarRootAndContextProvider>
        <PageDisplayName />
      </AlertBarRootAndContextProvider>
    </AccountContext.Provider>
  );
  // suppress the console output
  let consoleErrorSpy = jest
    .spyOn(console, 'error')
    .mockImplementationOnce(() => {});
  await submitDisplayName('John Nope');
  expect(screen.getByTestId('alert-bar')).toBeInTheDocument();
  consoleErrorSpy.mockRestore();
});

it('displays the GraphQL error', async () => {
  const gqlError: any = new Error('test error');
  gqlError.graphQLErrors = ['test'];
  const account = ({
    displayName: 'jrgm',
    setDisplayName: jest.fn().mockRejectedValue(gqlError),
  } as unknown) as Account;
  renderWithRouter(
    <AccountContext.Provider value={{ account }}>
      <PageDisplayName />
    </AccountContext.Provider>
  );
  // suppress the console output
  let consoleErrorSpy = jest
    .spyOn(console, 'error')
    .mockImplementationOnce(() => {});
  await submitDisplayName('Jane Nope');
  expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  consoleErrorSpy.mockRestore();
});
