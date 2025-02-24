/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import _ from 'underscore';
import { assert } from 'chai';
import Account from 'models/account';
import AuthErrors from 'lib/auth-errors';
import Backbone from 'backbone';
import BaseBroker from 'models/auth_brokers/base';
import Constants from 'lib/constants';
import helpers from '../../lib/helpers';
import Metrics from 'lib/metrics';
import Relier from 'models/reliers/relier';
import sinon from 'sinon';
import User from 'models/user';
import View from 'views/sign_in_token_code';
import VerificationReasons from 'lib/verification-reasons';
import WindowMock from '../../mocks/window';
import { SIGNIN_TOKEN_CODE } from '../../../../tests/functional/lib/selectors';

const { createRandomString } = helpers;

const TOKEN_CODE = createRandomString(Constants.TOKEN_CODE_LENGTH, 10);

const Selectors = SIGNIN_TOKEN_CODE;

describe('views/sign_in_token_code', () => {
  let account;
  let broker;
  let metrics;
  let model;
  let notifier;
  let relier;
  let user;
  let view;
  let windowMock;

  beforeEach(() => {
    windowMock = new WindowMock();

    relier = new Relier({
      window: windowMock,
    });

    broker = new BaseBroker({
      relier: relier,
      window: windowMock,
    });

    account = new Account({
      email: 'a@a.com',
      uid: 'uid',
    });

    model = new Backbone.Model({
      account: account,
      lastPage: 'signin',
      password: 'password',
    });

    notifier = _.extend({}, Backbone.Events);
    metrics = new Metrics({ notifier });

    user = new User();

    view = new View({
      broker,
      canGoBack: true,
      metrics,
      model,
      notifier,
      relier,
      user,
      viewName: 'sign-in-token-code',
      window: windowMock,
    });

    sinon.stub(view, 'getSignedInAccount').callsFake(() => account);

    return view.render();
  });

  afterEach(function () {
    metrics.destroy();
    view.remove();
    view.destroy();
    view = metrics = null;
  });

  describe('render', () => {
    it('renders the view', () => {
      assert.lengthOf(view.$('#fxa-signin-code-header'), 1);
      assert.include(view.$('#verification-email-message').text(), 'a@a.com');
    });

    describe('without an account', () => {
      beforeEach(() => {
        model.unset('account');
        view.getSignedInAccount.restore();
        sinon.stub(view, 'getSignedInAccount').callsFake(() => {});
        sinon.spy(view, 'navigate');
        return view.render();
      });

      it('redirects to the signin page', () => {
        assert.isTrue(view.navigate.calledWith('signin'));
      });
    });
  });

  describe('afterVisible', () => {
    it('starts polling in case the email bounces', async () => {
      const account = { uid: 'uid' };

      sinon.stub(view, 'waitForSessionVerification');
      sinon.stub(view, 'getAccount').returns(account);

      await view.afterVisible();

      assert.isTrue(view.waitForSessionVerification.calledOnceWith(account));
    });
  });

  describe('validateAndSubmit', () => {
    beforeEach(() => {
      sinon.stub(view, 'submit').callsFake(() => Promise.resolve());
      sinon.spy(view, 'showValidationError');
    });

    describe('with an empty code', () => {
      beforeEach(() => {
        view.$(Selectors.INPUT).val('');
        return view.validateAndSubmit().then(assert.fail, () => {});
      });

      it('displays a tooltip, does not call submit', () => {
        assert.isTrue(view.showValidationError.called);
        assert.isFalse(view.submit.called);
      });
    });

    const validCodes = [
      TOKEN_CODE,
      '   ' + TOKEN_CODE,
      TOKEN_CODE + '   ',
      '   ' + TOKEN_CODE + '   ',
    ];
    validCodes.forEach((code) => {
      describe(`with a valid code: '${code}'`, () => {
        beforeEach(() => {
          view.$(Selectors.INPUT).val(code);
          return view.validateAndSubmit();
        });

        it('calls submit', () => {
          assert.equal(view.submit.callCount, 1);
        });
      });
    });
  });

  describe('submit', () => {
    describe('success', () => {
      beforeEach(() => {
        sinon
          .stub(user, 'verifyAccountSessionCode')
          .callsFake(() => Promise.resolve());
        sinon
          .stub(view, 'invokeBrokerMethod')
          .callsFake(() => Promise.resolve());
        view.$(Selectors.INPUT).val(TOKEN_CODE);
        return view.submit();
      });

      it('calls correct broker methods', () => {
        assert.isTrue(
          user.verifyAccountSessionCode.calledWith(account, TOKEN_CODE),
          'verify with correct code'
        );
        assert.isTrue(
          view.invokeBrokerMethod.calledWith(
            'afterCompleteSignInWithCode',
            account
          )
        );
      });
    });

    describe('redirect to force change password', () => {
      beforeEach(() => {
        account.set('verificationReason', VerificationReasons.CHANGE_PASSWORD);
        sinon
          .stub(user, 'verifyAccountSessionCode')
          .callsFake(() => Promise.resolve());
        sinon
          .stub(view, 'invokeBrokerMethod')
          .callsFake(() => Promise.resolve());
        view.$(Selectors.INPUT).val(TOKEN_CODE);
        return view.submit();
      });

      it('calls correct broker methods', () => {
        assert.isTrue(
          user.verifyAccountSessionCode.calledWith(account, TOKEN_CODE),
          'verify with correct code'
        );
        assert.isTrue(
          view.invokeBrokerMethod.calledWith(
            'beforeForcePasswordChange',
            account
          )
        );
      });
    });

    describe('errors', () => {
      const error = AuthErrors.toError('INVALID_EXPIRED_OTP_CODE');

      beforeEach(() => {
        sinon
          .stub(account, 'verifySessionCode')
          .callsFake(() => Promise.reject(error));
        sinon.spy(view, 'showValidationError');
        view.$(Selectors.INPUT).val(TOKEN_CODE);
        return view.submit();
      });

      it('rejects with the error for display', () => {
        const args = view.showValidationError.args[0];
        assert.equal(args[1], error);
      });
    });
  });

  describe('resend', () => {
    describe('success', () => {
      beforeEach(() => {
        sinon
          .stub(account, 'verifySessionResendCode')
          .callsFake(() => Promise.resolve());
        return view.resend();
      });

      it('calls correct methods', () => {
        assert.equal(account.verifySessionResendCode.callCount, 1);
      });
    });
  });
});
